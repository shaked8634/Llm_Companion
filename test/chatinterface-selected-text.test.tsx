import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render} from '@testing-library/preact';
import ChatInterface from '@/components/ChatInterface';
import * as useStorageModule from '@/hooks/useStorage';
import {defaultSettings, PromptType} from '@/lib/store';

describe('ChatInterface selected-text flow', () => {
  const sendMessage = vi.fn();
  const openOptionsPage = vi.fn();
  const sidePanelOpen = vi.fn();
  let messageListener: ((msg: any) => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    sendMessage.mockReset();
    openOptionsPage.mockReset();
    sidePanelOpen.mockReset();
    messageListener = undefined;

    // Minimal chrome mocks for this flow
    globalThis.chrome = {
      tabs: {
        query: vi.fn((_query, cb) => cb([{ id: 123 }])),
        onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
        onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      runtime: {
        sendMessage,
        openOptionsPage,
        onMessage: {
          addListener: vi.fn((cb) => { messageListener = cb; }),
          removeListener: vi.fn(),
        },
      },
      sidePanel: { open: sidePanelOpen },
    } as any;

    vi.spyOn(useStorageModule, 'useStorage').mockImplementation((storageItem: any) => {
      const key = storageItem?.key ?? '';
      const isSettings = typeof key === 'string' && key.includes('settings');
      if (isSettings) {
        return [
          {
            ...defaultSettings,
            selectedModelId: 'ollama:test-model',
            discoveredModels: [{ id: 'test-model', name: 'Test Model', providerId: 'ollama', providerName: 'Ollama' }],
            prompts: [
              {
                id: 'selected-1',
                name: 'Explain selected text',
                text: 'Explain the following paragraph in simple terms',
                type: PromptType.SELECTED_TEXT,
                isDefault: true,
              },
            ],
          },
          vi.fn(),
        ] as const;
      }

      const isSession = typeof key === 'string' && key.includes('session');
      if (isSession) {
        return [
          {
            messages: [],
            isLoading: false,
          },
          vi.fn(),
        ] as const;
      }

      return [null, vi.fn()] as const;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes selected-text prompt when EXECUTE_SELECTED_TEXT_PROMPT message is received', async () => {
    render(<ChatInterface mode="popup" />);

    // Simulate runtime message from background
    expect(messageListener).toBeDefined();
    messageListener?.({ type: 'EXECUTE_SELECTED_TEXT_PROMPT', payload: { promptId: 'selected-1', text: 'Hello world' } });

    // allow the setTimeout inside listener to flush
    await vi.runAllTimersAsync();

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'EXECUTE_PROMPT',
      payload: expect.objectContaining({
        userPrompt: expect.stringContaining('Hello world'),
        tabId: 123,
      })
    });
  });
});
