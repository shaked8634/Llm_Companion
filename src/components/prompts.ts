export const defaultSummarizePrompt: string = "Summarize this page in less than 300 words";

export class Prompt {
    constructor(
        public enabled: boolean = false,
        public name: string,
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

export function newSummaryPrompt() {
    return new Prompt(
        true,
        "Summarize this page",
        defaultSummarizePrompt);
}

export async function getAllPrompts(): Promise<Map<string, Prompt>> {
    const allPrompts = await storage.getItem<Map<string, Prompt>>('local:prompts');
    return allPrompts || new Map<string, Prompt>
}