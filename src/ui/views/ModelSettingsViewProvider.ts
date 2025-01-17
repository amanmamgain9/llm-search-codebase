import * as vscode from 'vscode';
import { ModelConfig } from '../../types/interfaces';
import { ViewStateManager } from '../../services/viewStateManager';

export class ModelSettingsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeseeker.modelSettings';
    private _view?: vscode.WebviewView;
    private _config: ModelConfig = {
        majorModel: '',
        minorModel: '',
        majorModelApiKey: '',
        minorModelApiKey: '',
        useSameModel: false
    };

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _onConfigUpdate: (config: ModelConfig) => void,
        private readonly _context: vscode.ExtensionContext,
        private readonly _viewStateManager: ViewStateManager
    ) {
        this._loadStoredConfig();
    }

    private _loadStoredConfig() {
        const storedConfig = this._context.globalState.get<ModelConfig>('modelConfig');
        if (storedConfig) {
            this._config = storedConfig;
            this._onConfigUpdate(this._config);
        }
    }

    private async _saveConfig(config: ModelConfig) {
        this._config = config;
        await this._context.globalState.update('modelConfig', config);
        this._onConfigUpdate(this._config);

        // After successful save, switch to the search view
        await this._viewStateManager.showView('codeseeker.searchView');
    }

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
                case 'webviewReady':
                    webviewView.webview.postMessage({ 
                        type: 'loadConfig', 
                        value: this._config 
                    });
                    break;
                case 'saveConfig':
                    this._saveConfig(data.value).then(() => {
                        vscode.window.showInformationMessage('Model settings saved successfully!');
                    }).catch(error => {
                        vscode.window.showErrorMessage('Failed to save model settings: ' + error.message);
                    });
                    break;
                case 'error':
                    vscode.window.showErrorMessage(data.message);
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Model Settings</title>
                <style>
                    .container { 
                        padding: 10px; 
                    }
                    .form-group { 
                        margin-bottom: 15px; 
                    }
                    label { 
                        display: block; 
                        margin-bottom: 5px; 
                        color: var(--vscode-foreground);
                    }
                    input[type="password"], 
                    select { 
                        width: 100%; 
                        padding: 5px; 
                        margin-bottom: 10px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                    }
                    input[type="checkbox"] {
                        margin-bottom: 10px;
                    }
                    button { 
                        width: 100%; 
                        padding: 8px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        cursor: pointer;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="form-group">
                        <label>Use Same Model for Both</label>
                        <input type="checkbox" id="useSameModel">
                    </div>
                    
                    <div class="form-group">
                        <label>Major Model</label>
                        <select id="majorModel">
                            <option value="gpt-4">GPT-4</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                        <input type="password" id="majorApiKey" placeholder="Major Model API Key">
                    </div>

                    <div id="minorModelSection" class="form-group">
                        <label>Minor Model</label>
                        <select id="minorModel">
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            <option value="gpt-4">GPT-4</option>
                        </select>
                        <input type="password" id="minorApiKey" placeholder="Minor Model API Key">
                    </div>

                    <button id="saveButton">Save Settings</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const useSameModelCheckbox = document.getElementById('useSameModel');
                    const minorModelSection = document.getElementById('minorModelSection');
                    const saveButton = document.getElementById('saveButton');
                    
                    // Notify backend that webview is ready to receive config
                    vscode.postMessage({ type: 'webviewReady' });

                    // Handle receiving saved config from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'loadConfig') {
                            const config = message.value;
                            document.getElementById('majorModel').value = config.majorModel || 'gpt-4';
                            document.getElementById('minorModel').value = config.minorModel || 'gpt-3.5-turbo';
                            document.getElementById('majorApiKey').value = config.majorModelApiKey || '';
                            document.getElementById('minorApiKey').value = config.minorModelApiKey || '';
                            document.getElementById('useSameModel').checked = config.useSameModel || false;
                            minorModelSection.style.display = config.useSameModel ? 'none' : 'block';
                        }
                    });

                    useSameModelCheckbox.addEventListener('change', (e) => {
                        minorModelSection.style.display = e.target.checked ? 'none' : 'block';
                        if (e.target.checked) {
                            document.getElementById('minorModel').value = document.getElementById('majorModel').value;
                            document.getElementById('minorApiKey').value = document.getElementById('majorApiKey').value;
                        }
                    });

                    saveButton.addEventListener('click', () => {
                        const config = {
                            majorModel: document.getElementById('majorModel').value,
                            minorModel: document.getElementById('minorModel').value,
                            majorModelApiKey: document.getElementById('majorApiKey').value,
                            minorModelApiKey: document.getElementById('minorApiKey').value,
                            useSameModel: document.getElementById('useSameModel').checked
                        };

                        if (!config.majorModelApiKey) {
                            vscode.postMessage({ 
                                type: 'error', 
                                message: 'Major model API key is required' 
                            });
                            return;
                        }

                        if (!config.useSameModel && !config.minorModelApiKey) {
                            vscode.postMessage({ 
                                type: 'error', 
                                message: 'Minor model API key is required' 
                            });
                            return;
                        }

                        if (config.useSameModel) {
                            config.minorModel = config.majorModel;
                            config.minorModelApiKey = config.majorModelApiKey;
                        }

                        vscode.postMessage({
                            type: 'saveConfig',
                            value: config
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }

    public getConfig(): ModelConfig {
        return this._config;
    }

    public isConfigured(): boolean {
        return Boolean(this._config.majorModelApiKey && 
            (this._config.useSameModel || this._config.minorModelApiKey));
    }
}