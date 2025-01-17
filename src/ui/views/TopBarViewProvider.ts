import * as vscode from 'vscode';
import { ViewStateManager } from '../../services/viewStateManager';
import { AIService } from '../../services/aiService';

export class TopBarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeseeker.topbar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewStateManager: ViewStateManager,
        private readonly _aiService: AIService
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Listen for view state changes
        this._viewStateManager.onViewStateChanged(async (viewId) => {
            if (this._view) {
                const viewState = this._viewStateManager.getViewState(viewId);
                if (viewState?.isVisible) {
                    this._view.webview.postMessage({ 
                        type: 'updateActiveView', 
                        viewId: viewId 
                    });
                }
            }
        });

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'webviewReady':
                    this._initializeView();
                    break;
                case 'switchView':
                    this._viewStateManager.showView(data.viewId);
                    break;
            }
        });
    }

    private async _initializeView() {
        if (!this._view) return;

        const isConfigured = await this._aiService.isConfigured();
        const initialViewId = isConfigured ? 
            'codeseeker.searchView' : 
            'codeseeker.modelSettings';

        // Initialize the view state
        await this._viewStateManager.showView(initialViewId);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._extensionUri, 
            'node_modules', 
            '@vscode/codicons', 
            'dist', 
            'codicon.css'
        ));

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Navigation</title>
                <link href="${codiconsUri}" rel="stylesheet" />
                <style>
                    .container { 
                        padding: 8px; 
                        display: flex;
                        gap: 8px;
                        justify-content: flex-end;
                    }
                    button { 
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 6px;
                        border-radius: 3px;
                        background: var(--vscode-button-primaryBackground);
                        color: var(--vscode-button-primaryForeground);
                        border: none;
                        cursor: pointer;
                        width: 28px;
                        height: 28px;
                    }
                    button:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                    button.active {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    .codicon {
                        font-size: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <button id="searchBtn" title="Search">
                        <i class="codicon codicon-search"></i>
                    </button>
                    <button id="settingsBtn" title="Model Settings">
                        <i class="codicon codicon-gear"></i>
                    </button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const searchBtn = document.getElementById('searchBtn');
                    const settingsBtn = document.getElementById('settingsBtn');
                    
                    // Notify backend that webview is ready
                    vscode.postMessage({ type: 'webviewReady' });
                    
                    // Toggle active state and switch views
                    function switchView(viewId) {
                        searchBtn.classList.toggle('active', viewId === 'codeseeker.searchView');
                        settingsBtn.classList.toggle('active', viewId === 'codeseeker.modelSettings');
                        vscode.postMessage({ type: 'switchView', viewId });
                    }

                    // Initialize event listeners
                    searchBtn.addEventListener('click', () => {
                        switchView('codeseeker.searchView');
                    });

                    settingsBtn.addEventListener('click', () => {
                        switchView('codeseeker.modelSettings');
                    });

                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'updateActiveView') {
                            switchView(message.viewId);
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}