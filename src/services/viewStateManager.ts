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
    private readonly _onViewStateChanged: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
    public readonly onViewStateChanged: vscode.Event<string> = this._onViewStateChanged.event;

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

    private async updateContextVariables(viewId: string, isVisible: boolean) {
        switch (viewId) {
            case 'codeseeker.modelSettings':
                await vscode.commands.executeCommand('setContext', 'codeseeker.modelSettingsViewEnabled', isVisible);
                break;
            case 'codeseeker.searchView':
                await vscode.commands.executeCommand('setContext', 'codeseeker.searchViewEnabled', isVisible);
                break;
        }
    }

    public async showView(viewId: string): Promise<void> {
        // First hide all views
        await this.hideAllViews();
        
        // Then show the requested view
        await vscode.commands.executeCommand('workbench.view.extension.codeseeker-sidebar');
        await vscode.commands.executeCommand(`${viewId}.focus`);
        
        const viewKey = this.getViewKey(viewId);
        if (viewKey) {
            this.state[viewKey] = {
                isVisible: true,
                lastActiveTimestamp: Date.now()
            };
            await this.saveState();
            
            // Update context variable
            await this.updateContextVariables(viewId, true);
            
            // Emit the view state change event
            this._onViewStateChanged.fire(viewId);
        }
    }

    private async hideAllViews(): Promise<void> {
        for (const viewKey of Object.keys(this.state)) {
            this.state[viewKey as keyof ExtensionState].isVisible = false;
            const viewId = viewKey === 'modelSettings' ? 'codeseeker.modelSettings' : 'codeseeker.searchView';
            await this.updateContextVariables(viewId, false);
        }
    }

    public async hideView(viewId: string): Promise<void> {
        const viewKey = this.getViewKey(viewId);
        if (viewKey) {
            this.state[viewKey].isVisible = false;
            await this.saveState();
            await this.updateContextVariables(viewId, false);
            this._onViewStateChanged.fire(viewId);
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
        // Find the most recently active view
        let mostRecentViewId: string | null = null;
        let mostRecentTimestamp = 0;

        for (const [key, value] of Object.entries(this.state)) {
            if (value.isVisible && value.lastActiveTimestamp && value.lastActiveTimestamp > mostRecentTimestamp) {
                mostRecentTimestamp = value.lastActiveTimestamp;
                mostRecentViewId = key === 'modelSettings' ? 'codeseeker.modelSettings' : 'codeseeker.searchView';
            }
        }

        // Show the most recent view, or default to search view if none was active
        if (mostRecentViewId) {
            await this.showView(mostRecentViewId);
        }
    }

    public dispose() {
        this._onViewStateChanged.dispose();
    }
}