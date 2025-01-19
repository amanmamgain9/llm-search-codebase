import * as path from 'path';
import * as fs from 'fs/promises';

export class CodeTraversalService {
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

    constructor(customExtensions?: string[]) {
        this.codeExtensions = new Set([
            ...CodeTraversalService.DEFAULT_CODE_EXTENSIONS,
            ...(customExtensions || [])
        ]);
    }

    public async addCodeExtension(extension: string) {
        if (!extension.startsWith('.')) {
            extension = '.' + extension;
        }
        this.codeExtensions.add(extension.toLowerCase());
    }

    private isCodeFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return this.codeExtensions.has(ext);
    }

    private async isTextFile(filePath: string): Promise<boolean> {
        try {
            const buffer = await fs.readFile(filePath);
            const firstChunk = buffer.slice(0, 1024);
            return !firstChunk.includes(0);
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return false;
        }
    }

    public async traverseProject(projectPath: string): Promise<Map<string, string>> {
        const fileContents = new Map<string, string>();
        await this.processDirectory(projectPath, fileContents);
        return fileContents;
    }

    private async processDirectory(dirPath: string, fileContents: Map<string, string>): Promise<void> {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.name === '.git' || entry.name === 'node_modules') {
                    continue;
                }

                if (entry.isDirectory()) {
                    await this.processDirectory(fullPath, fileContents);
                } else if (entry.isFile() && this.isCodeFile(fullPath)) {
                    const isText = await this.isTextFile(fullPath);
                    if (isText) {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        fileContents.set(fullPath, content);
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing directory ${dirPath}:`, error);
        }
    }
}
