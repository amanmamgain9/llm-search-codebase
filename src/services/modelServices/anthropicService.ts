import { ModelResponse,
    IModelService
 } from "../../types/modelTypes";

export class AnthropicService implements IModelService {
    private static readonly MODEL_PRICING: { [key: string]: ModelPricing } = {
        'claude-3-opus-20240229': {
            inputPricePerMillionTokens: 15.0,
            outputPricePerMillionTokens: 75.0
        },
        'claude-3-sonnet-20240229': {
            inputPricePerMillionTokens: 3.0,
            outputPricePerMillionTokens: 15.0
        },
        'claude-3-haiku-20240229': {
            inputPricePerMillionTokens: 0.25,
            outputPricePerMillionTokens: 1.25
        },
        'claude-2.1': {
            inputPricePerMillionTokens: 8.0,
            outputPricePerMillionTokens: 24.0
        }
    };

    constructor(private apiKey: string, private model: string) {}

    public getPricing(): ModelPricing {
        const pricing = AnthropicService.MODEL_PRICING[this.model];
        if (!pricing) {
            throw new Error(`Pricing not available for model: ${this.model}`);
        }
        return pricing;
    }

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
