import * as vscode from 'vscode';
import { ModelResponse, ModelConfig, IModelService } from '../types/modelTypes';
import { ModelServiceFactory } from './modelServices/modelServiceFactory';

export class AIService {
    private static instance: AIService;
    private static readonly CONFIG_KEY = 'com.codeseeker.aiconfig';
    private config?: ModelConfig;
    
    // More descriptive names that reflect their actual purpose
    private primaryModel?: IModelService;
    private secondaryModel?: IModelService;

    private constructor(private readonly context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    public static getInstance(context: vscode.ExtensionContext): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService(context);
        }
        return AIService.instance;
    }

    private loadConfig(): void {
        const storedConfig = this.context.globalState.get<ModelConfig>(AIService.CONFIG_KEY);
        if (storedConfig) {
            this.initializeModels(storedConfig);
        }
    }

    public async saveConfig(newConfig: ModelConfig): Promise<void> {
        await this.context.globalState.update(AIService.CONFIG_KEY, newConfig);
        await this.initializeModels(newConfig);
    }

    private async initializeModels(newConfig: ModelConfig): Promise<void> {
        try {
            this.config = newConfig;

            // Initialize primary model
            this.primaryModel = ModelServiceFactory.createService(
                newConfig.majorModel,
                newConfig.majorApiKey
            );

            // Initialize secondary model or use primary if configured to use same model
            if (!newConfig.useSameModel) {
                this.secondaryModel = ModelServiceFactory.createService(
                    newConfig.minorModel,
                    newConfig.minorApiKey
                );
            } else {
                this.secondaryModel = this.primaryModel;
            }
        } catch (error) {
            throw new Error(`Failed to initialize AI models: ${(error as Error).message}`);
        }
    }

    public getConfig(): ModelConfig | undefined {
        return this.config ? { ...this.config } : undefined;
    }

    public isConfigured(): boolean {
        return Boolean(
            this.config?.majorApiKey && 
            (this.config.useSameModel || this.config.minorApiKey)
        );
    }

    public async queryPrimaryModel(prompt: string): Promise<ModelResponse> {
        if (!this.primaryModel) {
            throw new Error('Primary model not configured');
        }
        return this.primaryModel.query(prompt);
    }

    public async querySecondaryModel(prompt: string): Promise<ModelResponse> {
        if (!this.secondaryModel) {
            throw new Error('Secondary model not configured');
        }
        return this.secondaryModel.query(prompt);
    }

    public async testPrimaryModel(): Promise<boolean> {
        if (!this.primaryModel) {
            return false;
        }
        return this.primaryModel.testConnection();
    }

    public async testSecondaryModel(): Promise<boolean> {
        if (!this.secondaryModel) {
            return false;
        }
        return this.secondaryModel.testConnection();
    }
}