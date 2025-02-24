import {describe, expect, it} from "vitest";
import {getPromptMappings} from "@/components/prompts";

describe('getPrompts', () => {
    it('should return all prompt mappings', async () => {
        const promptMappings = await getPromptMappings();
        expect(promptMappings).toBeTypeOf('object');
    });
});
