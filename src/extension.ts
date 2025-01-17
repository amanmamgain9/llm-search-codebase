import * as vscode from 'vscode';
import { CodeSeekerViewProvider } from './CodeSeekerViewProvider';

export function activate(context: vscode.ExtensionContext) {
    // Register CodeSeeker View Provider
    const provider = new CodeSeekerViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(CodeSeekerViewProvider.viewType, provider)
    );

    let disposable = vscode.commands.registerCommand('codeseeker.search', async (query: string) => {
        vscode.window.showInformationMessage(`Searching for: ${query}`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
