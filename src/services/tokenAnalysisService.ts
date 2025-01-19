import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as tiktoken from 'tiktoken';

export class TokenAnalysisService {
    // Default list of code file extensions
    private static readonly DEFAULT_CODE_EXTENSIONS = new Set([
        '.ts', '.js', '.jsx', '.tsx',
        '.py', '.java', '.cpp', '.c',
        '.h', '.cs', '.php', '.rb',
        '.go', '.rs', '.swift', '.kt',
        '.scala', '.m', '.html', '.css',
        '.scss', '.less', '.json', '.xml',
        '.yaml', '.yml', '.md'
    ]);

    private codeExtensions: Set<string>;
    private tokenizer: any; // tiktoken encoder

    constructor(customExtensions?: string[]) {
        this.codeExtensions = new Set([
            ...TokenAnalysisService.DEFAULT_CODE_EXTENSIONS,
            ...(customExtensions || [])
        ]);
        this.initializeTokenizer();
    }

    private async initializeTokenizer() {
        // Using GPT-3.5-turbo encoder as it's commonly used
        this.tokenizer = await tiktoken.encoding_for_model('gpt-3.5-turbo');
    }

    private isCodeFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return this.codeExtensions.has(ext);
    }

    private async isTextFile(filePath: string): Promise<boolean> {
        try {
            const buffer = await fs.readFile(filePath);
            // Check for null bytes in the first chunk
            // Common way to detect binary files
            const firstChunk = buffer.slice(0, 1024);
            return !firstChunk.includes(0);
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return false;
        }
    }

    public async addCodeExtension(extension: string) {
        if (!extension.startsWith('.')) {
            extension = '.' + extension;
        }
        this.codeExtensions.add(extension.toLowerCase());
    }

    public async getProjectTokenCount(projectPath: string): Promise<{ totalTokens: number; fileTokens: Map<string, number> }> {
        const fileTokens = new Map<string, number>();
        let totalTokens = 0;

        try {
            await this.processDirectory(projectPath, fileTokens);
            totalTokens = Array.from(fileTokens.values()).reduce((sum, count) => sum + count, 0);
            
            return { totalTokens, fileTokens };
        } catch (error) {
            console.error('Error analyzing project tokens:', error);
            throw new Error('Failed to analyze project tokens');
        }
    }

    private async processDirectory(dirPath: string, fileTokens: Map<string, number>): Promise<void> {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                // Skip .git directory and node_modules
                if (entry.name === '.git' || entry.name === 'node_modules') {
                    continue;
                }

                if (entry.isDirectory()) {
                    // Recursively process subdirectories
                    await this.processDirectory(fullPath, fileTokens);
                } else if (entry.isFile() && this.isCodeFile(fullPath)) {
                    // Process only if it's a code file
                    const isText = await this.isTextFile(fullPath);
                    if (isText) {
                        const tokenCount = await this.getFileTokenCount(fullPath);
                        if (tokenCount > 0) {
                            fileTokens.set(fullPath, tokenCount);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing directory ${dirPath}:`, error);
        }
    }

    private async getFileTokenCount(filePath: string): Promise<number> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const tokens = this.tokenizer.encode(content);
            return tokens.length;
        } catch (error) {
            console.error(`Error counting tokens in file ${filePath}:`, error);
            return 0;
        }
    }

    public dispose() {
        if (this.tokenizer) {
            this.tokenizer.free();
        }
    }
}