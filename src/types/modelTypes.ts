export interface ModelConfig {
    majorModel: string;
    minorModel: string;
    majorApiKey: string;
    minorApiKey: string;
    useSameModel: boolean;
}

export interface ModelResponse {
    content: string;
    modelUsed: string;
    tokenCount?: number;
}

export interface IModelService {
    query(prompt: string): Promise<ModelResponse>;
    testConnection(): Promise<boolean>;
}
