import * as vscode from 'vscode';

export interface FileSearchResult {
    path: string;
    reason: string;
}

export interface CodeSection {
    lines: string; // "start-end"
    code: string;
    explanation: string;
}

export interface Answer {
    summary: string;
    details: string;
    references: string[];
}

export class ResponseParser {
    static parseFileSearch(response: string): FileSearchResult[] {
        const results: FileSearchResult[] = [];
        const regex = /\*FILE_SEARCH\*([\s\S]*?)\*END_FILE_SEARCH\*/g;
        
        let match;
        while ((match = regex.exec(response)) !== null) {
            const block = match[1];
            const path = this.extractValue(block, 'path');
            const reason = this.extractValue(block, 'reason');
            
            if (path && reason) {
                results.push({ path, reason });
            }
        }
        return results;
    }

    static parseCodeSections(response: string): CodeSection[] {
        const sections: CodeSection[] = [];
        const regex = /\*CODE_SECTION\*([\s\S]*?)\*END_CODE_SECTION\*/g;
        
        let match;
        while ((match = regex.exec(response)) !== null) {
            const block = match[1];
            const lines = this.extractValue(block, 'lines');
            const code = this.extractValue(block, 'code');
            const explanation = this.extractValue(block, 'explanation');
            
            if (lines && code && explanation) {
                sections.push({ lines, code, explanation });
            }
        }
        return sections;
    }

    static parseAnswer(response: string): Answer | null {
        const regex = /\*ANSWER\*([\s\S]*?)\*END_ANSWER\*/;
        const match = response.match(regex);
        
        if (match) {
            const block = match[1];
            const summary = this.extractValue(block, 'summary');
            const details = this.extractValue(block, 'details');
            const references = this.extractList(block, 'references');
            
            if (summary && details) {
                return { summary, details, references };
            }
        }
        return null;
    }

    private static extractValue(block: string, key: string): string {
        const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
        const match = block.match(regex);
        return match ? match[1].trim() : '';
    }

    private static extractList(block: string, key: string): string[] {
        const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
        const match = block.match(regex);
        if (!match) return [];
        return match[1].split(',').map(item => item.trim());
    }
}