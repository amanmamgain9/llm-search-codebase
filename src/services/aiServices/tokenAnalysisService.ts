import * as tiktoken from 'tiktoken';
import { CodeTraversalService } from '../codeHandlingServices/codeTraversalService';

export class TokenAnalysisService {
    private tokenizer: any;
    private codeTraversalService: CodeTraversalService;

    constructor(customExtensions?: string[]) {
        this.codeTraversalService = new CodeTraversalService(customExtensions);
        this.initializeTokenizer();
    }

    private async initializeTokenizer() {
        this.tokenizer = await tiktoken.encoding_for_model('gpt-3.5-turbo');
    }

    public async getProjectTokenCount(projectPath: string): Promise<{ totalTokens: number; fileTokens: Map<string, number> }> {
        const fileTokens = new Map<string, number>();
        let totalTokens = 0;

        try {
            const fileContents = await this.codeTraversalService.traverseProject(projectPath);
            
            for (const [filePath, content] of fileContents) {
                const tokenCount = this.getTokenCount(content);
                if (tokenCount > 0) {
                    fileTokens.set(filePath, tokenCount);
                }
            }

            totalTokens = Array.from(fileTokens.values()).reduce((sum, count) => sum + count, 0);
            return { totalTokens, fileTokens };
        } catch (error) {
            console.error('Error analyzing project tokens:', error);
            throw new Error('Failed to analyze project tokens');
        }
    }

    private getTokenCount(content: string): number {
        try {
            const tokens = this.tokenizer.encode(content);
            return tokens.length;
        } catch (error) {
            console.error('Error counting tokens:', error);
            return 0;
        }
    }

    public async addCodeExtension(extension: string) {
        await this.codeTraversalService.addCodeExtension(extension);
    }

    public dispose() {
        if (this.tokenizer) {
            this.tokenizer.free();
        }
    }
}