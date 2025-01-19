import * as vscode from 'vscode';
import { ModelResponse, ModelConfig, IModelService, ModelPricing } from '../../types/modelTypes';
import { ModelServiceFactory } from './modelServices/modelServiceFactory';
import { TokenAnalysisService } from './tokenAnalysisService';

export class AIService {
    private static instance: AIService;
    private static readonly CONFIG_KEY = 'com.codeseeker.aiconfig';
    private config?: ModelConfig;
    private configLoaded: boolean = false;
    
    private primaryModel?: IModelService;
    private secondaryModel?: IModelService;
    private tokenService: TokenAnalysisService;

    private constructor(private readonly context: vscode.ExtensionContext) {
        this.tokenService = new TokenAnalysisService();
        this.initializeConfig();
    }

    public static getInstance(context: vscode.ExtensionContext): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService(context);
        }
        return AIService.instance;
    }

    private async initializeConfig(): Promise<void> {
        await this.loadConfig();
        this.configLoaded = true;
    }

    private async ensureConfigLoaded(): Promise<void> {
        if (!this.configLoaded) {
            await this.loadConfig();
            this.configLoaded = true;
        }
    }

    public getSupportedModels() {
        return ModelServiceFactory.getSupportedModels();
    }

    private migrateConfig(oldConfig: ModelConfig): ModelConfig {
        const newConfig = { ...oldConfig };
        
        if (!ModelServiceFactory.isModelSupported(oldConfig.majorModel)) {
            newConfig.majorModel = ModelServiceFactory.DEFAULT_MODEL;
            vscode.window.showInformationMessage(
                `Migrated major model from ${oldConfig.majorModel} to ${ModelServiceFactory.DEFAULT_MODEL}`
            );
        }

        if (!ModelServiceFactory.isModelSupported(oldConfig.minorModel)) {
            newConfig.minorModel = ModelServiceFactory.DEFAULT_MODEL;
            vscode.window.showInformationMessage(
                `Migrated minor model from ${oldConfig.minorModel} to ${ModelServiceFactory.DEFAULT_MODEL}`
            );
        }

        return newConfig;
    }

    private async loadConfig(): Promise<void> {
        const storedConfig = this.context.globalState.get<ModelConfig>(AIService.CONFIG_KEY);
        if (storedConfig) {
            if (!ModelServiceFactory.isModelSupported(storedConfig.majorModel) || 
                !ModelServiceFactory.isModelSupported(storedConfig.minorModel)) {
                
                await this.context.globalState.update(AIService.CONFIG_KEY, storedConfig);
                await this.initializeModels(storedConfig);
            } else {
                await this.initializeModels(storedConfig);
            }
        }
    }

    public async saveConfig(newConfig: ModelConfig): Promise<void> {
        await this.ensureConfigLoaded();

        if (!ModelServiceFactory.isModelSupported(newConfig.majorModel)) {
            throw new Error(`Unsupported major model: ${newConfig.majorModel}`);
        }
        if (!ModelServiceFactory.isModelSupported(newConfig.minorModel)) {
            throw new Error(`Unsupported minor model: ${newConfig.minorModel}`);
        }
        
        await this.context.globalState.update(AIService.CONFIG_KEY, newConfig);
        await this.initializeModels(newConfig);
    }

    private async initializeModels(newConfig: ModelConfig): Promise<void> {
        try {
            this.config = newConfig;

            this.primaryModel = ModelServiceFactory.createService(
                newConfig.majorModel,
                newConfig.majorModelApiKey
            );

            if (!newConfig.useSameModel) {
                this.secondaryModel = ModelServiceFactory.createService(
                    newConfig.minorModel,
                    newConfig.minorModelApiKey
                );
            } else {
                this.secondaryModel = this.primaryModel;
            }
        } catch (error) {
            throw new Error(`Failed to initialize AI models: ${(error as Error).message}`);
        }
    }

    public async getConfig(): Promise<ModelConfig | undefined> {
        await this.ensureConfigLoaded();
        return this.config ? { ...this.config } : undefined;
    }

    public async isConfigured(): Promise<boolean> {
        await this.ensureConfigLoaded();
        return Boolean(
            this.config?.majorModelApiKey && 
            (this.config.useSameModel || this.config.minorModelApiKey)
        );
    }

    public async queryPrimaryModel(prompt: string): Promise<ModelResponse> {
        await this.ensureConfigLoaded();
        if (!this.primaryModel) {
            throw new Error('Primary model not configured');
        }
        return this.primaryModel.query(prompt);
    }

    public async querySecondaryModel(prompt: string): Promise<ModelResponse> {
        await this.ensureConfigLoaded();
        if (!this.secondaryModel) {
            throw new Error('Secondary model not configured');
        }
        return this.secondaryModel.query(prompt);
    }

    // Token Analysis Methods
    public async analyzeProjectTokens(projectPath: string): Promise<{ totalTokens: number; fileTokens: Map<string, number> }> {
        try {
            return await this.tokenService.getProjectTokenCount(projectPath);
        } catch (error) {
            throw new Error(`Failed to analyze project tokens: ${(error as Error).message}`);
        }
    }

    public async addCustomCodeExtension(extension: string): Promise<void> {
        await this.tokenService.addCodeExtension(extension);
    }

    public async estimateCost(tokenCount: number, isInput: boolean = true): Promise<number> {
        if (!this.primaryModel) {
            throw new Error('Primary model not configured');
        }
        const pricing = this.primaryModel.getPricing();
        const pricePerToken = isInput ? 
            pricing.inputPricePerMillionTokens / 1_000_000 : 
            pricing.outputPricePerMillionTokens / 1_000_000;
        return tokenCount * pricePerToken;
    }

    public async getTokenCount(text: string): Promise<number> {
        try {
            const result = await this.tokenService.getProjectTokenCount(text);
            return result.totalTokens;
        } catch (error) {
            throw new Error(`Failed to count tokens: ${(error as Error).message}`);
        }
    }

    public async testPrimaryModel(): Promise<boolean> {
        await this.ensureConfigLoaded();
        if (!this.primaryModel) {
            return false;
        }
        return this.primaryModel.testConnection();
    }

    public async testSecondaryModel(): Promise<boolean> {
        await this.ensureConfigLoaded();
        if (!this.secondaryModel) {
            return false;
        }
        return this.secondaryModel.testConnection();
    }

    public getPrimaryModelPricing(): ModelPricing {
        if (!this.primaryModel) {
            throw new Error('Primary model not configured');
        }
        return this.primaryModel.getPricing();
    }

    public getSecondaryModelPricing(): ModelPricing {
        if (!this.secondaryModel) {
            throw new Error('Secondary model not configured');
        }
        return this.secondaryModel.getPricing();
    }

    public dispose(): void {
        if (this.tokenService) {
            this.tokenService.dispose();
        }
    }
}