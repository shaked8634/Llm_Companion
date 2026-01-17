import {describe, expect, it} from 'vitest';
import {useStorage} from '../src/hooks/useStorage';

describe('useStorage', () => {
  it('should be a function', () => {
    expect(typeof useStorage).toBe('function');
  });
});

