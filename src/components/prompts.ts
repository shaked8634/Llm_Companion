import {getItem} from "@/common/storage";

export enum SummarizePrompt {
     Name = 'Summarize this page',
     Prompt = "Summarize this page in less than 300 words",
}

export class Prompt {
    constructor(
        public enabled: boolean = false,
        public prompt: string = '',
    ) {
        this.enabled = enabled;
        this.prompt = prompt;
    }

    static hydrate(data: Partial<Prompt>): Prompt {
        return new this(
            data.enabled ?? false,
            data.prompt ?? '',
        );
    }
}

export async function getPrompts(): Promise<{ [key: string]: Prompt }> {
    const allPromptsStr: string = await getItem('prompts');

    return allPromptsStr ? JSON.parse(allPromptsStr) : {};
}
