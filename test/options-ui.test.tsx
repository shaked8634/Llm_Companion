import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/preact';
import Options from '../src/entrypoints/options/Options';
import * as useStorageModule from '../src/hooks/useStorage';
import {defaultSettings} from '@/lib/store';

describe('Options UI', () => {
  beforeEach(() => {
    // Mock useStorage hook to return mock settings
    vi.spyOn(useStorageModule, 'useStorage').mockImplementation(() => {
      return [
        defaultSettings,
        vi.fn(),
      ] as const;
    });
  });

  it('renders Providers tab by default', () => {
    render(<Options />);
    expect(screen.getByText(/Providers/i)).toBeDefined();
  });
});

