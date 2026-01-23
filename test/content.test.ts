import {describe, expect, it} from 'vitest';
import * as content from '../src/entrypoints/content/index';

describe('Content script', () => {
  it('should export something', () => {
    expect(content).toBeDefined();
  });
});

