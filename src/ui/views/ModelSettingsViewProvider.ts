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
        private readonly _onConfigUpdate: (config: ModelConfig) => void
    ) {
        this._viewStateManager = ViewStateManager.getInstance(undefined as any);
    }

    private _viewStateManager: ViewStateManager;

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
                case 'saveConfig':
                    this._config = data.value;
                    this._onConfigUpdate(this._config);
                    vscode.window.showInformationMessage('Model settings saved successfully!');
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
                    .container { padding: 10px; }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; }
                    input, select { width: 100%; padding: 5px; margin-bottom: 10px; }
                    button { width: 100%; padding: 8px; }
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
                            vscode.postMessage({ type: 'error', message: 'Major model API key is required' });
                            return;
                        }

                        if (!config.useSameModel && !config.minorModelApiKey) {
                            vscode.postMessage({ type: 'error', message: 'Minor model API key is required' });
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
