import * as vscode from 'vscode';

export interface ViewState {
    isVisible: boolean;
    lastActiveTimestamp?: number;
}

export interface ExtensionState {
    modelSettings: ViewState;
    searchView: ViewState;
}

export class ViewStateManager {
    private static instance: ViewStateManager;
    private state: ExtensionState;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.state = this.loadState();
    }

    public static getInstance(context: vscode.ExtensionContext): ViewStateManager {
        if (!ViewStateManager.instance) {
            ViewStateManager.instance = new ViewStateManager(context);
        }
        return ViewStateManager.instance;
    }

    private loadState(): ExtensionState {
        const savedState = this.context.globalState.get<ExtensionState>('viewState');
        return savedState || {
            modelSettings: { isVisible: false },
            searchView: { isVisible: false }
        };
    }

    public async saveState(): Promise<void> {
        await this.context.globalState.update('viewState', this.state);
    }

    public async showView(viewId: string): Promise<void> {
        await vscode.commands.executeCommand('workbench.view.extension.codeseeker-sidebar');
        await vscode.commands.executeCommand(`${viewId}.focus`);
        
        const viewKey = this.getViewKey(viewId);
        if (viewKey) {
            this.state[viewKey] = {
                isVisible: true,
                lastActiveTimestamp: Date.now()
            };
            await this.saveState();
        }
    }

    public async hideView(viewId: string): Promise<void> {
        const viewKey = this.getViewKey(viewId);
        if (viewKey) {
            this.state[viewKey].isVisible = false;
            await this.saveState();
        }
    }

    public getViewState(viewId: string): ViewState | undefined {
        const viewKey = this.getViewKey(viewId);
        return viewKey ? this.state[viewKey] : undefined;
    }

    private getViewKey(viewId: string): keyof ExtensionState | null {
        switch (viewId) {
            case 'codeseeker.modelSettings':
                return 'modelSettings';
            case 'codeseeker.searchView':
                return 'searchView';
            default:
                return null;
        }
    }

    public async restoreState(): Promise<void> {
        for (const [key, value] of Object.entries(this.state)) {
            if (value.isVisible) {
                const viewId = key === 'modelSettings' ? 'codeseeker.modelSettings' : 'codeseeker.searchView';
                await this.showView(viewId);
            }
        }
    }
}
