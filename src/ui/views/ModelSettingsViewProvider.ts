import * as vscode from 'vscode';
import { ModelConfig } from '../../types/modelTypes';
import { ViewStateManager } from '../../services/viewStateManager';
import { AIService } from '../../services/aiService';

export class ModelSettingsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeseeker.modelSettings';
    private _view?: vscode.WebviewView;
    private _config?: ModelConfig;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewStateManager: ViewStateManager,
        private readonly _aiService: AIService
    ) {
        this._loadStoredConfig();
    }

    private async _loadStoredConfig() {
        const storedConfig = await this._aiService.getConfig();
        if (storedConfig) {
            this._config = storedConfig;
        }
    }

    private async _saveConfig(config: ModelConfig) {
        this._config = config;
        await this._aiService.saveConfig(config);

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
                    // Send both config and supported models
                    webviewView.webview.postMessage({ 
                        type: 'initialize', 
                        config: this._config,
                        supportedModels: this._aiService.getSupportedModels()
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
                        <select id="majorModel"></select>
                        <input type="password" id="majorApiKey" placeholder="Major Model API Key">
                    </div>

                    <div id="minorModelSection" class="form-group">
                        <label>Minor Model</label>
                        <select id="minorModel"></select>
                        <input type="password" id="minorApiKey" placeholder="Minor Model API Key">
                    </div>

                    <button id="saveButton">Save Settings</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const useSameModelCheckbox = document.getElementById('useSameModel');
                    const minorModelSection = document.getElementById('minorModelSection');
                    const majorModelSelect = document.getElementById('majorModel');
                    const minorModelSelect = document.getElementById('minorModel');
                    const saveButton = document.getElementById('saveButton');
                    
                    // Notify backend that webview is ready to receive data
                    vscode.postMessage({ type: 'webviewReady' });

                    // Populate select options with supported models
                    function populateModelOptions(selectElement, models, selectedValue) {
                        selectElement.innerHTML = '';
                        models.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.id;
                            option.textContent = model.name;
                            if (model.id === selectedValue) {
                                option.selected = true;
                            }
                            selectElement.appendChild(option);
                        });
                    }

                    // Handle receiving initialization data from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'initialize') {
                            const { config, supportedModels } = message;
                            
                            // Populate model dropdowns
                            populateModelOptions(majorModelSelect, supportedModels, config?.majorModel);
                            populateModelOptions(minorModelSelect, supportedModels, config?.minorModel);

                            // Set other form values
                            document.getElementById('majorApiKey').value = config?.majorModelApiKey || '';
                            document.getElementById('minorApiKey').value = config?.minorModelApiKey || '';
                            document.getElementById('useSameModel').checked = config?.useSameModel || false;
                            minorModelSection.style.display = config?.useSameModel ? 'none' : 'block';
                        }
                    });

                    useSameModelCheckbox.addEventListener('change', (e) => {
                        minorModelSection.style.display = e.target.checked ? 'none' : 'block';
                        if (e.target.checked) {
                            minorModelSelect.value = majorModelSelect.value;
                            document.getElementById('minorApiKey').value = document.getElementById('majorApiKey').value;
                        }
                    });

                    saveButton.addEventListener('click', () => {
                        const config = {
                            majorModel: majorModelSelect.value,
                            minorModel: minorModelSelect.value,
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
}