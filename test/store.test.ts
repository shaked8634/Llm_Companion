import {describe, expect, it} from 'vitest';
import {defaultSettings, getTabSessionKey} from '@/lib/store';

describe('Store', () => {
  it('defaultSettings should have required properties', () => {
    expect(defaultSettings).toHaveProperty('providers');
    expect(defaultSettings).toHaveProperty('prompts');
    expect(defaultSettings).toHaveProperty('discoveredModels');
  });

  it('getTabSessionKey should return correct key', () => {
    expect(getTabSessionKey(123)).toBe('local:session:123');
  });
});
