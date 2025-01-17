import * as vscode from 'vscode';
import { CodeSeekerViewProvider } from './ui/views/CodeSeekerViewProvider';
import { ModelSettingsViewProvider } from './ui/views/ModelSettingsViewProvider';
// import { registerSearchCommands } from './commands/searchCommands';
import { ViewStateManager } from './services/viewStateManager';
import { AIService } from './services/aiServices/aiService';

export function activate(context: vscode.ExtensionContext) {
    // Initialize ViewStateManager
    const viewStateManager = ViewStateManager.getInstance(context);
    const aiService = AIService.getInstance(context);
    
    // Register Search Provider
    const searchProvider = new CodeSeekerViewProvider(
        context.extensionUri,
        viewStateManager,
        aiService
    );

    const modelSettingsProvider = new ModelSettingsViewProvider(
        context.extensionUri,
        viewStateManager,
        aiService
    );

    // Register view providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ModelSettingsViewProvider.viewType, modelSettingsProvider),
        vscode.window.registerWebviewViewProvider(CodeSeekerViewProvider.viewType, searchProvider)
    );

    // Register built-in commands
    context.subscriptions.push(
        vscode.commands.registerCommand('codeseeker.search', () => {
            viewStateManager.handleSearchCommand();
        })
    );

    // Register additional search commands
    // registerSearchCommands(context);

    // Restore previous state
    viewStateManager.restoreState();
}

export function deactivate() {
    // Save state on deactivation
    const viewStateManager = ViewStateManager.getInstance(undefined as any);
    return viewStateManager.saveState();
}