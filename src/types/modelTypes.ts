export interface ModelConfig {
    majorModel: string;
    minorModel: string;
    majorModelApiKey: string;
    minorModelApiKey: string;
    useSameModel: boolean;
}

export interface ModelResponse {
    content: string;
    modelUsed: string;
    tokenCount?: number;
}

export interface ModelPricing {
    inputPricePerMillionTokens: number;
    outputPricePerMillionTokens: number;
}

export interface IModelService {
    query(prompt: string): Promise<ModelResponse>;
    testConnection(): Promise<boolean>;
    getPricing(): ModelPricing;
}
