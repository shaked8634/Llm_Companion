import {describe, expect, it} from "vitest";
import {getProviderMappings} from "@/components/providers/provider";

describe('getPrompts', () => {
    it('should return all provider mappings', async () => {
        const promptMappings = await getProviderMappings();
        expect(promptMappings).toBeTypeOf('object');
    });
});
