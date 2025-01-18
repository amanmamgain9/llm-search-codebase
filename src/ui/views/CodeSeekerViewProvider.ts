import * as vscode from 'vscode';
import { ICodeSeekerViewProvider } from '../../types/interfaces';
import { ViewStateManager } from '../../services/viewStateManager';
import { AIService } from '../../services/aiService';
import { TokenAnalysisService } from '../../services/tokenAnalysisService';

export class CodeSeekerViewProvider implements ICodeSeekerViewProvider {
    private _view?: vscode.WebviewView;
    private _tokenAnalysisService: TokenAnalysisService;
    private _totalTokens: number = 0;
    private _analysisComplete: boolean = false;
    private _estimatedCost: number = 0;
    public static readonly viewType = 'codeseeker.searchView';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewStateManager: ViewStateManager,
        private readonly _aiService: AIService
    ) {
        this._tokenAnalysisService = new TokenAnalysisService();
        
        // Listen for workspace folder changes
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this._analysisComplete = false;
            this._totalTokens = 0;
            if (this._view) {
                this.updateView();
            }
        });
    }

    private async analyzeProjectTokens() {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return;
            }

            const projectPath = workspaceFolders[0].uri.fsPath;
            const { totalTokens, fileTokens } = await this._tokenAnalysisService.getProjectTokenCount(projectPath);
            
            this._totalTokens = totalTokens;
            this._analysisComplete = true;
            
            // Calculate estimated cost using secondary model pricing
            const pricing = this._aiService.getSecondaryModelPricing();
            this._estimatedCost = (totalTokens / 1000000) * pricing.inputPricePerMillionTokens;
            
            if (this._view) {
                this.updateView();
            }
            
            console.log(`Total tokens in project: ${totalTokens}`);
        } catch (error) {
            console.error('Error analyzing project tokens:', error);
            this._analysisComplete = false;
        }
    }

    private updateView() {
        if (!this._view) return;
        
        if (!this._aiService.isConfigured()) {
            this._view.webview.html = this._getUnconfiguredHtml();
            return;
        }

        this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }


    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        if (!this._aiService.isConfigured()) {
            webviewView.webview.html = this._getUnconfiguredHtml();
            return;
            // return;
        }
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // Analyze project tokens after initialization
        this.analyzeProjectTokens();
        
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'search':
                    if (data.value) {
                        vscode.commands.executeCommand('codeseeker.search', data.value);
                    }
                    break;
                case 'analyze':
                    this.analyzeProjectTokens();
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
                <style>
                    .container { padding: 10px; }
                    .token-info { 
                        margin: 10px 0;
                        padding: 5px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-editor-lineHighlightBorder);
                    }
                    .analyze-button {
                        width: 100%;
                        padding: 5px;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    ${!this._analysisComplete ? `
                        <button id="analyzeButton" class="analyze-button">Analyze Project Tokens</button>
                    ` : `
                        <div class="token-info">
                            <div>Total tokens in project: ${this._totalTokens}</div>
                            <div>Estimated cost per query: $${this._estimatedCost.toFixed(4)}</div>
                        </div>
                        <input type="text" id="searchInput" placeholder="Enter your search query..." style="width: 100%; padding: 5px;">
                        <button id="searchButton" style="margin-top: 10px; width: 100%; padding: 5px;">Search</button>
                    `}
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    const analyzeButton = document.getElementById('analyzeButton');
                    if (analyzeButton) {
                        analyzeButton.addEventListener('click', () => {
                            vscode.postMessage({
                                type: 'analyze'
                            });
                        });
                    }

                    const searchInput = document.getElementById('searchInput');
                    const searchButton = document.getElementById('searchButton');
                    
                    if (searchButton) {
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
