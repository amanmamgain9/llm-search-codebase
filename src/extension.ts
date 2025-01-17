import * as vscode from 'vscode';
import { CodeSeekerViewProvider } from './ui/views/CodeSeekerViewProvider';
import { registerSearchCommands } from './commands/searchCommands';

export function activate(context: vscode.ExtensionContext) {
    // Register CodeSeeker View Provider
    const provider = new CodeSeekerViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(CodeSeekerViewProvider.viewType, provider)
    );

    // Register commands
    registerSearchCommands(context);
}

export function deactivate() {}
