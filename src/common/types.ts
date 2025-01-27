

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
    }
}
