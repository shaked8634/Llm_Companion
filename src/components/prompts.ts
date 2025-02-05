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

export async function getAllPrompts(): Promise<{ [key: string]: Prompt }> {
    const allPromptsStr: string | null = await storage.getItem('local:prompts');

    return allPromptsStr ? JSON.parse(allPromptsStr) : {[SummarizePrompt.Name]: new Prompt(true, SummarizePrompt.Prompt)};
}
