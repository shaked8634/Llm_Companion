import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/preact';
import App from '../src/entrypoints/popup/App';
import * as useStorageModule from '../src/hooks/useStorage';
import {defaultSettings} from '@/lib/store';

describe('Popup UI', () => {
  beforeEach(() => {
    // Mock chrome.tabs.query
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
      // First call is for settings, second is for session
      if (storageItem === null) {
        return [null, vi.fn()] as const;
      }

      // Check if this is the settings storage by checking the key structure
      const isSetting = storageItem?.key?.includes?.('settings');

      if (isSetting) {
        // Return mock settings
        return [
          {
            ...defaultSettings,
            discoveredModels: [
              { id: 'test-model', name: 'Test Model', providerId: 'ollama', providerName: 'Ollama' }
            ],
          },
          vi.fn(),
        ] as const;
      } else {
        // Return mock session
        return [
          {
            messages: [],
            isLoading: false,
          },
          vi.fn(),
        ] as const;
      }
    });
  });

  it('renders LLM Companion header', () => {
    render(<App />);
    expect(screen.getByText(/LLM Companion/i)).toBeDefined();
  });
});

