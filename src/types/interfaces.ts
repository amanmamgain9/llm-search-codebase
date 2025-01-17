import * as vscode from 'vscode';

export interface ICodeSeekerViewProvider extends vscode.WebviewViewProvider {
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void>;
}

export interface ModelConfig {
    majorModel: string;
    minorModel: string;
    majorModelApiKey: string;
    minorModelApiKey: string;
    useSameModel: boolean;
}

export interface ModelConfigurationProvider {
    getConfig(): ModelConfig;
    isConfigured(): boolean;
}
