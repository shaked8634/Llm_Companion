import {Model} from "@/common/types";
import {AiProvider, BaseProvider} from "@/components/providers/provider";

export class OpenaiProvider extends BaseProvider{
    name: string = "OpenAI"
    static defaultUrl: string ='https://api.openai.com';

    async isConnected(): Promise<boolean> {
        return true
    }

     async getModels(): Promise<Model[]> {
        return []
     }

     async stream(): Promise<string> {
        return "STREAM" //TBD
    }
}