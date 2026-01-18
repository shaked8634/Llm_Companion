import {describe, expect, it} from 'vitest';
import {OllamaProvider} from '@/lib/providers/ollama';
import {GeminiProvider} from '@/lib/providers/gemini';
import {OpenAIProvider} from '@/lib/providers/openai';

// These are basic structure tests, not live API tests

describe('Provider classes', () => {
  it('OllamaProvider should have id and name', () => {
    const provider = new OllamaProvider({ url: 'http://localhost:11434', enabled: true });
    expect(provider.id).toBe('ollama');
    expect(provider.name).toBe('Ollama');
  });

  it('GeminiProvider should have id and name', () => {
    const provider = new GeminiProvider({ apiKey: 'dummy', enabled: true });
    expect(provider.id).toBe('gemini');
    expect(provider.name).toBe('Gemini');
  });

  it('OpenAIProvider should have id and name', () => {
    const provider = new OpenAIProvider({ apiKey: 'dummy', enabled: true });
    expect(provider.id).toBe('openai');
    expect(provider.name).toBe('OpenAI');
  });
});

