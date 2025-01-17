import * as vscode from 'vscode';

export function registerSearchCommands(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('codeseeker.search', async (query: string) => {
        vscode.window.showInformationMessage(`Searching for: ${query}`);
    });

    context.subscriptions.push(disposable);
}
