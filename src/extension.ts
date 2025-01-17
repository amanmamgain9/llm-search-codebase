import * as vscode from 'vscode';
import { CodeSeekerViewProvider } from './ui/views/CodeSeekerViewProvider';
import { ModelSettingsViewProvider } from './ui/views/ModelSettingsViewProvider';
import { registerSearchCommands } from './commands/searchCommands';
import { ModelConfig } from './types/interfaces';
import { ViewStateManager } from './services/viewStateManager';

export function activate(context: vscode.ExtensionContext) {
    let modelConfig: ModelConfig;
    
    // Initialize ViewStateManager
    const viewStateManager = ViewStateManager.getInstance(context);
    
    // Register Model Settings Provider
    const modelSettingsProvider = new ModelSettingsViewProvider(
        context.extensionUri,
        (config) => {
            modelConfig = config;
            searchProvider.updateModelConfig(config);
        },
        viewStateManager
    );
    
    // Register Search Provider
    const searchProvider = new CodeSeekerViewProvider(
        context.extensionUri,
        modelSettingsProvider,
        viewStateManager
    );
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ModelSettingsViewProvider.viewType, modelSettingsProvider),
        vscode.window.registerWebviewViewProvider(CodeSeekerViewProvider.viewType, searchProvider)
    );

    // Register commands
    registerSearchCommands(context);

    // Restore previous state
    viewStateManager.restoreState();
}

export function deactivate() {
    // Save state on deactivation
    const viewStateManager = ViewStateManager.getInstance(undefined as any);
    return viewStateManager.saveState();
}
