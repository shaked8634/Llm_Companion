import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render} from '@testing-library/preact';
import App from '../src/entrypoints/sidepanel/App';
import * as useStorageModule from '../src/hooks/useStorage';
import {defaultSettings} from '@/lib/store';

describe('Sidepanel UI', () => {
  beforeEach(() => {
    // Mock chrome APIs
    globalThis.chrome = {
      tabs: {
        query: vi.fn((query, callback) => {
          callback([{ id: 1 }]);
        }),
        onActivated: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        onUpdated: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      runtime: {
        openOptionsPage: vi.fn(),
        sendMessage: vi.fn(),
      },
      sidePanel: {
        open: vi.fn(),
      },
    } as any;

    // Mock useStorage hook to return mock data
    vi.spyOn(useStorageModule, 'useStorage').mockImplementation((storageItem) => {
      if (storageItem === null) {
        return [null, vi.fn()] as const;
      }

      const isSetting = storageItem?.key?.includes?.('settings');

      if (isSetting) {
        return [defaultSettings, vi.fn()] as const;
      }

      // Session storage
      return [{ messages: [], isLoading: false }, vi.fn()] as const;
    });
  });

  it('should render sidepanel', () => {
    const {container} = render(<App />);
    expect(container).toBeTruthy();
  });
});
