import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import * as path from 'path';
import * as fs from 'fs';

export async function activate(context: vscode.ExtensionContext) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    let disposable = vscode.commands.registerCommand('codeseeker.search', async () => {
        const question = await vscode.window.showInputBox({
            placeHolder: 'Enter your code search question...',
            prompt: 'Example: Which areas handle image processing?'
        });

        if (!question) return;

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const progress = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Searching codebase...",
            cancellable: true
        }, async (progress) => {
            try {
                const relevantFiles = await findRelevantFiles(workspaceFolders[0].uri.fsPath, openai, question);
                const analysis = await analyzeRelevantFiles(relevantFiles, openai, question);
                
                // Show results in a new editor
                const doc = await vscode.workspace.openTextDocument({
                    content: formatResults(analysis),
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        });
    });

    context.subscriptions.push(disposable);
}

async function findRelevantFiles(
    workspacePath: string,
    openai: OpenAI,
    question: string
): Promise<string[]> {
    const relevantFiles: string[] = [];
    const files = getAllFiles(workspacePath);

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const isRelevant = await quickCheck(content, question, openai);
        if (isRelevant) {
            relevantFiles.push(file);
        }
    }

    return relevantFiles;
}

function getAllFiles(dirPath: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (!shouldSkipDirectory(entry.name)) {
                files.push(...getAllFiles(fullPath));
            }
        } else if (shouldIncludeFile(entry.name)) {
            files.push(fullPath);
        }
    }

    return files;
}

function shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build'];
    return skipDirs.includes(name);
}

function shouldIncludeFile(name: string): boolean {
    const codeExtensions = ['.ts', '.js', '.py', '.java', '.cpp', '.h', '.cs'];
    return codeExtensions.some(ext => name.endsWith(ext));
}

async function quickCheck(
    content: string,
    question: string,
    openai: OpenAI
): Promise<boolean> {
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "You are a code analysis assistant. Reply with ONLY 'yes' or 'no' if the file content might be relevant to the user's question."
            },
            {
                role: "user",
                content: `Question: ${question}\n\nFile content:\n${content.slice(0, 1000)}`
            }
        ],
        temperature: 0.1
    });

    return response.choices[0].message.content?.toLowerCase().includes('yes') ?? false;
}

async function analyzeRelevantFiles(
    files: string[],
    openai: OpenAI,
    question: string
): Promise<any> {
    const results = [];

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const analysis = await analyzeFile(content, question, openai);
        results.push({
            file,
            analysis
        });
    }

    return results;
}

async function analyzeFile(
    content: string,
    question: string,
    openai: OpenAI
): Promise<string> {
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "Analyze the code and identify specific functions, classes, or sections that are relevant to the user's question. Be concise and specific."
            },
            {
                role: "user",
                content: `Question: ${question}\n\nFile content:\n${content}`
            }
        ],
        temperature: 0.1
    });

    return response.choices[0].message.content ?? '';
}

function formatResults(results: any[]): string {
    let output = '# CodeSeeker Search Results\n\n';
    
    for (const result of results) {
        output += `## ${path.basename(result.file)}\n`;
        output += `Path: ${result.file}\n\n`;
        output += `${result.analysis}\n\n`;
    }

    return output;
}

export function deactivate() {}
