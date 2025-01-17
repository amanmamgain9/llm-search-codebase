import { AnthropicService} from "./anthropicService";
import { IModelService } from "../../types/modelTypes";

export class ModelServiceFactory {
    static createService(model: string, apiKey: string): IModelService {
        if (model.startsWith('claude')) {
            return new AnthropicService(apiKey, model);
        }
        
        throw new Error(`Unsupported model: ${model}`);
    }
}