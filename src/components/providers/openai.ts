import {BaseProvider} from "@/components/providers/base";
import {Model} from "@/components/models";
import {ProviderType} from "@/components/providers/types";

export class OpenaiProvider extends BaseProvider{
    name: string = ProviderType.Openai
    static defaultUrl: string ='https://api.openai.com';

    async isConnected(): Promise<boolean> {
        return false
    }

     async getModels(): Promise<Model[]> {
        return []
     }

     async stream(): Promise<string> {
        return "STREAM" //TBD
    }
}