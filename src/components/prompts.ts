export enum DefaultSummarizePrompt {
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
    const allPromptsString: string | null = await storage.getItem('local:prompts');

    // return allPromptsString ? JSON.parse(allPromptsString) : {defaultSummariseName: newSummaryPrompt()};
    let allPrompts: { [key: string]: Prompt} = {}
    if (allPromptsString) {
        allPrompts = JSON.parse(allPromptsString)
    } else {
        allPrompts = {[DefaultSummarizePrompt.Name]: new Prompt(true, DefaultSummarizePrompt.Prompt)}
    }
    return allPrompts
}