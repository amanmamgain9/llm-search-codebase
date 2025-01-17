import * as vscode from 'vscode';
import { CodeSeekerViewProvider } from './ui/views/CodeSeekerViewProvider';
import { ModelSettingsViewProvider } from './ui/views/ModelSettingsViewProvider';
import { registerSearchCommands } from './commands/searchCommands';
import { ModelConfig } from './types/interfaces';

export function activate(context: vscode.ExtensionContext) {
    let modelConfig: ModelConfig;
    
    // Register Model Settings Provider
    const modelSettingsProvider = new ModelSettingsViewProvider(context.extensionUri, (config) => {
        modelConfig = config;
        searchProvider.updateModelConfig(config);
    });
    
    // Register Search Provider
    const searchProvider = new CodeSeekerViewProvider(context.extensionUri, modelSettingsProvider);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ModelSettingsViewProvider.viewType, modelSettingsProvider),
        vscode.window.registerWebviewViewProvider(CodeSeekerViewProvider.viewType, searchProvider)
    );

    // Register commands
    registerSearchCommands(context);
}

export function deactivate() {}
