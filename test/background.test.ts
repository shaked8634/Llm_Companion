import {describe, expect, it} from 'vitest';
import * as background from '../src/entrypoints/background/index';

describe('Background', () => {
  it('should export something', () => {
    expect(background).toBeDefined();
  });
});

