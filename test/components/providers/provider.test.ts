import {describe, expect, it} from "vitest";
import {generateProviderMappings, getProviderMappings} from "@/components/providers/provider";
import {ProviderType} from "@/components/providers/types";

describe('getPrompts', () => {
    it('should return all provider mappings', async () => {
        const promptMappings = await getProviderMappings();
        expect(promptMappings).toBeTypeOf('object');
    });
});

describe('generateProviderMappings', () => {
    it('should generate provider mappings', async () => {
        const providerMappings = await generateProviderMappings();
        expect(providerMappings).toBeTypeOf('object');

        for (const providerType of Object.values(ProviderType)) {
            expect(providerMappings).toHaveProperty(providerType);
        }
    });
});
