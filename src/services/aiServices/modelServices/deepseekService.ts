import { ModelResponse, IModelService, ModelPricing } from "../../../types/modelTypes";

export class DeepseekService implements IModelService {
    private static readonly MODEL_PRICING: { [key: string]: ModelPricing } = {
        'deepseek-coder-33b-instruct': {
            inputPricePerMillionTokens: 0.14,
            outputPricePerMillionTokens: 0.28
        },
        'deepseek-coder-6.7b-instruct': {
            inputPricePerMillionTokens: 0.10,
            outputPricePerMillionTokens: 0.10
        }
    };

    constructor(private apiKey: string, private model: string) {}

    public getPricing(): ModelPricing {
        const pricing = DeepseekService.MODEL_PRICING[this.model];
        if (!pricing) {
            throw new Error(`Pricing not available for model: ${this.model}`);
        }
        return pricing;
    }

    async query(prompt: string): Promise<ModelResponse> {
        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error(`Deepseek API error: ${response.statusText}`);
            }

            const data: any = await response.json();
            return {
                content: data.choices[0].message.content,
                modelUsed: this.model
            };
        } catch (error) {
            throw new Error(`Deepseek service error: ${(error as Error).message}`);
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
