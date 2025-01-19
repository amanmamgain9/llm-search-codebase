import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { AIService } from '../aiService';
import { ResponseParser, FileSearchResult, CodeSection, Answer } from './responseParser';

export interface AnswerTreeNode {
    label: string;
    children?: AnswerTreeNode[];
    location?: {
        uri: vscode.Uri;
        range?: vscode.Range;
    };
}

interface Prompts {
    prompts: {
        fileDiscovery: { template: string };
        codeAnalysis: { template: string };
        finalAnswer: { template: string };
    };
}

export class AnswerService {
    private static instance: AnswerService;
    private prompts?: Prompts;
    
    private constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly aiService: AIService
    ) {}

    public static getInstance(context: vscode.ExtensionContext): AnswerService {
        if (!AnswerService.instance) {
            const aiService = AIService.getInstance(context);
            AnswerService.instance = new AnswerService(context, aiService);
        }
        return AnswerService.instance;
    }

    private async loadPrompts(): Promise<void> {
        if (!this.prompts) {
            const promptsUri = vscode.Uri.joinPath(this.context.extensionUri, 'config', 'prompts.yaml');
            const promptsContent = await vscode.workspace.fs.readFile(promptsUri);
            this.prompts = yaml.load(promptsContent.toString()) as Prompts;
        }
    }

    private fillTemplate(template: string, variables: Record<string, string>): string {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(`\${${key}}`, value);
        }
        return result;
    }

    public async getAnswer(question: string): Promise<AnswerTreeNode> {
        try {
            await this.loadPrompts();
            if (!this.prompts) {
                throw new Error('Failed to load prompts');
            }

            // Step 1: Find relevant files
            const relevantFiles = await this.searchFiles(question);
            
            // Step 2: Analyze code sections
            const analyzedSections = await this.analyzeSections(question, relevantFiles);
            
            // Step 3: Generate final answer
            const finalAnswer = await this.generateFinalAnswer(question, analyzedSections);
            
            // Convert to tree structure
            return this.createAnswerTree(finalAnswer, analyzedSections);
            
        } catch (error) {
            throw new Error(`Failed to generate answer: ${(error as Error).message}`);
        }
    }

    private async searchFiles(question: string): Promise<Array<{uri: vscode.Uri; reason: string}>> {
        const searchPrompt = this.fillTemplate(
            this.prompts!.prompts.fileDiscovery.template,
            { question }
        );
        
        const response = await this.aiService.querySecondaryModel(searchPrompt);
        const searchResults = ResponseParser.parseFileSearch(response.content);
        
        const foundFiles: Array<{uri: vscode.Uri; reason: string}> = [];
        
        for (const result of searchResults) {
            try {
                const files = await vscode.workspace.findFiles(result.path);
                if (files.length > 0) {
                    foundFiles.push({
                        uri: files[0],
                        reason: result.reason
                    });
                }
            } catch (error) {
                console.warn(`Failed to find file ${result.path}:`, error);
            }
        }
        
        return foundFiles;
    }

    private async analyzeSections(
        question: string, 
        files: Array<{uri: vscode.Uri; reason: string}>
    ): Promise<Array<{
        uri: vscode.Uri;
        reason: string;
        sections: CodeSection[];
    }>> {
        const analyzedFiles = [];
        
        for (const file of files) {
            try {
                const document = await vscode.workspace.openTextDocument(file.uri);
                const content = document.getText();
                
                const analysisPrompt = this.fillTemplate(
                    this.prompts!.prompts.codeAnalysis.template,
                    {
                        question,
                        filePath: file.uri.fsPath,
                        fileContent: content
                    }
                );
                
                const response = await this.aiService.queryPrimaryModel(analysisPrompt);
                const sections = ResponseParser.parseCodeSections(response.content);
                
                analyzedFiles.push({
                    uri: file.uri,
                    reason: file.reason,
                    sections
                });
            } catch (error) {
                console.warn(`Failed to analyze file ${file.uri.fsPath}:`, error);
            }
        }
        
        return analyzedFiles;
    }

    private async generateFinalAnswer(
        question: string,
        analyzedFiles: Array<{uri: vscode.Uri; reason: string; sections: CodeSection[]}>
    ): Promise<Answer | null> {
        const codeResults = analyzedFiles.map(file => ({
            path: file.uri.fsPath,
            reason: file.reason,
            sections: file.sections
        }));

        const answerPrompt = this.fillTemplate(
            this.prompts!.prompts.finalAnswer.template,
            {
                question,
                codeResults: JSON.stringify(codeResults)
            }
        );
        
        const response = await this.aiService.queryPrimaryModel(answerPrompt);
        return ResponseParser.parseAnswer(response.content);
    }

    private createAnswerTree(
        answer: Answer | null,
        analyzedFiles: Array<{uri: vscode.Uri; reason: string; sections: CodeSection[]}>
    ): AnswerTreeNode {
        const root: AnswerTreeNode = {
            label: 'Answer',
            children: []
        };

        // Add answer summary
        if (answer) {
            root.children?.push({
                label: 'Summary',
                children: [
                    { label: answer.summary },
                    { label: 'Details', children: [{ label: answer.details }] }
                ]
            });
        }

        // Add code sections
        const filesNode: AnswerTreeNode = {
            label: 'Relevant Files',
            children: []
        };

        for (const file of analyzedFiles) {
            const fileNode: AnswerTreeNode = {
                label: vscode.workspace.asRelativePath(file.uri),
                children: [
                    { label: `Why: ${file.reason}` }
                ]
            };

            // Add code sections
            for (const section of file.sections) {
                const [start, end] = section.lines.split('-').map(Number);
                fileNode.children?.push({
                    label: `Lines ${section.lines}: ${section.explanation}`,
                    location: {
                        uri: file.uri,
                        range: new vscode.Range(
                            new vscode.Position(start - 1, 0),
                            new vscode.Position(end, 0)
                        )
                    }
                });
            }

            filesNode.children?.push(fileNode);
        }

        root.children?.push(filesNode);
        return root;
    }
}