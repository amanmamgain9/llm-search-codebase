import { AnthropicService } from "./anthropicService";
import { IModelService } from "../../types/modelTypes";

export interface SupportedModel {
    id: string;
    name: string;
}

export class ModelServiceFactory {
    public static readonly SUPPORTED_MODELS: SupportedModel[] = [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
        { id: 'claude-2.1', name: 'Claude 2.1' }
    ];

    public static readonly DEFAULT_MODEL = 'claude-3-sonnet-20240229';

    public static createService(model: string, apiKey: string): IModelService {
        if (!this.isModelSupported(model)) {
            throw new Error(`Unsupported model: ${model}`);
        }
        return new AnthropicService(apiKey, model);
    }

    public static getSupportedModels(): SupportedModel[] {
        return [...this.SUPPORTED_MODELS];
    }

    public static getModelById(modelId: string): SupportedModel | undefined {
        return this.SUPPORTED_MODELS.find(model => model.id === modelId);
    }

    public static isModelSupported(modelId: string): boolean {
        return this.SUPPORTED_MODELS.some(model => model.id === modelId);
    }
}