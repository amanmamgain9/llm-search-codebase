import * as vscode from 'vscode';
import { ViewStateManager } from '../../services/viewStateManager';

export class TopBarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeseeker.topbar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewStateManager: ViewStateManager
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

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'switchView':
                    this._viewStateManager.showView(data.viewId);
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get path to codicons
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

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

                    // Set initial active state
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