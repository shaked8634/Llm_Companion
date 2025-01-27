export class Model {
    constructor(
        public name: string
    ) {
    }
}

export class Prompt {
    constructor(
        public enabled: boolean = false,
        public prompt: string = '',
        public defaultPrompt: string = '',
    ) {
        this.enabled = enabled;
        this.prompt = prompt;
        this.defaultPrompt = defaultPrompt;
    }

    static hydrate(data: Partial<Prompt>): Prompt {
        return new this(
            data.enabled ?? false,
            data.prompt ?? '',
            data.defaultPrompt ?? ''
        );
    }
}
