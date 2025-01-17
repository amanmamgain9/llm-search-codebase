import { ModelResponse,
    IModelService
 } from "../../types/modelTypes";

export class AnthropicService implements IModelService {
    constructor(private apiKey: string, private model: string) {}

    async query(prompt: string): Promise<ModelResponse> {
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error(`Anthropic API error: ${response.statusText}`);
            }

            const data:any = await response.json();
            return {
                content: data.content[0].text,
                modelUsed: this.model
            };
        } catch (error) {
            throw new Error(`Anthropic service error: ${(error as Error).message}`);
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.query('Test connection');
            return true;
        } catch {
            return false;
        }
    }
}