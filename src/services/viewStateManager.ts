import * as vscode from 'vscode';
import { AIService } from './aiService';

export interface ExtensionState {
    expandedViewId?: string;
}

export class ViewStateManager {
    private static instance: ViewStateManager;
    private state: ExtensionState;
    private context: vscode.ExtensionContext;
    private aiService: AIService;


    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.state = this.loadState();
        this.aiService = AIService.getInstance(context);
    }

    public static getInstance(context: vscode.ExtensionContext): ViewStateManager {
        if (!ViewStateManager.instance) {
            ViewStateManager.instance = new ViewStateManager(context);
        }
        return ViewStateManager.instance;
    }

    private loadState(): ExtensionState {
        return this.context.globalState.get<ExtensionState>('viewState') || {};
    }

    public async saveState(): Promise<void> {
        await this.context.globalState.update('viewState', this.state);
    }

    public handleViewVisibilityChange(viewId: string, isVisible: boolean): void {
        if (isVisible) {
            vscode.commands.executeCommand(`${viewId}.focus`);
            // Update state
            this.state.expandedViewId = viewId;
            this.saveState();
        } else if (this.state.expandedViewId === viewId) {
            this.state.expandedViewId = undefined;
            this.saveState();
        }
    }

    public async handleSearchCommand(): Promise<void> {
        try {
            const isConfigured = await this.aiService.isConfigured();
            if (!isConfigured) {
                vscode.commands.executeCommand('codeseeker.modelSettings.focus');
                vscode.window.showInformationMessage('Please configure AI models before searching');
                return;
            }
            vscode.commands.executeCommand('codeseeker.searchView.focus');
        } catch (error) {
            console.error('Error handling search command:', error);
            throw error;
        }
    }

    public async handleSettingsCommand(): Promise<void> {
        vscode.commands.executeCommand('codeseeker.modelSettings.focus');
    }

    public async restoreState(): Promise<void> {
        try {
            const isConfigured = await this.aiService.isConfigured();
            
            if (!isConfigured) {
                vscode.commands.executeCommand('codeseeker.modelSettings.focus');
                return;
            }

            const viewToFocus = this.state.expandedViewId || 'codeseeker.searchView';
            vscode.commands.executeCommand(`${viewToFocus}.focus`);
        } catch (error) {
            console.error('Error restoring state:', error);
            throw error;
        }
    }
}