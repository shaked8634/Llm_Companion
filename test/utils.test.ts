import {describe, expect, it} from 'vitest';
import * as discovery from '../src/lib/utils/discovery';

describe('discovery utils', () => {
  it('refreshDiscoveredModels should be a function', () => {
    expect(typeof discovery.refreshDiscoveredModels).toBe('function');
  });
});

