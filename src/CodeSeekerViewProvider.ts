import * as vscode from 'vscode';

export class CodeSeekerViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeseeker.searchView';

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'search':
                    if (data.value) {
                        await vscode.commands.executeCommand('codeseeker.search', data.value);
                    }
                    break;
            }
        });
    }

    private _getHtmlForWebview() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CodeSeeker</title>
                <style>
                    body {
                        padding: 10px;
                    }
                    .search-container {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    input {
                        padding: 8px;
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }
                    button {
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
                <div class="search-container">
                    <input type="text" id="searchInput" placeholder="Enter your code search question...">
                    <button id="searchButton">Search</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const searchInput = document.getElementById('searchInput');
                    const searchButton = document.getElementById('searchButton');

                    searchButton.addEventListener('click', () => {
                        const query = searchInput.value.trim();
                        if (query) {
                            vscode.postMessage({ type: 'search', value: query });
                        }
                    });

                    searchInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const query = searchInput.value.trim();
                            if (query) {
                                vscode.postMessage({ type: 'search', value: query });
                            }
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
