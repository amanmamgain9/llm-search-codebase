import * as vscode from 'vscode';
import { ICodeSeekerViewProvider } from '../../types/interfaces';
import { ViewStateManager } from '../../services/viewStateManager';
import { AIService } from '../../services/aiService';

export class CodeSeekerViewProvider implements ICodeSeekerViewProvider {
    private _view?: vscode.WebviewView;
    public static readonly viewType = 'codeseeker.searchView';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewStateManager: ViewStateManager,
        private readonly _aiService: AIService
    ) { }


    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        if (!this._aiService.isConfigured()) {
            this._viewStateManager.showView('codeseeker.modelSettings');
            return;
        }
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'search':
                    if (data.value) {
                        vscode.commands.executeCommand('codeseeker.search', data.value);
                    }
                    break;
            }
        });
    }

    private _getUnconfiguredHtml() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CodeSeeker Search</title>
                <style>
                    .container { padding: 20px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h3>Model Configuration Required</h3>
                    <p>Please configure your models in the Model Settings view before using the search.</p>
                </div>
            </body>
            </html>
        `;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CodeSeeker Search</title>
            </head>
            <body>
                <div style="padding: 10px;">
                    <input type="text" id="searchInput" placeholder="Enter your search query..." style="width: 100%; padding: 5px;">
                    <button id="searchButton" style="margin-top: 10px; width: 100%; padding: 5px;">Search</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const searchInput = document.getElementById('searchInput');
                    const searchButton = document.getElementById('searchButton');

                    searchButton.addEventListener('click', () => {
                        const query = searchInput.value;
                        if (query) {
                            vscode.postMessage({
                                type: 'search',
                                value: query
                            });
                        }
                    });

                    searchInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const query = searchInput.value;
                            if (query) {
                                vscode.postMessage({
                                    type: 'search',
                                    value: query
                                });
                            }
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
