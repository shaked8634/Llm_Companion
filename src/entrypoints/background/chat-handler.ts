import {getTabSession, settingsStorage} from '@/lib/store';
import {ProviderFactory} from '@/lib/providers/factory';
import {ChatMessage, ProviderType} from '@/lib/providers/types';
import {formatPageContextForLLM, PageContent} from '@/lib/utils/scraper';

export async function handleExecutePrompt(tabId: number, userPrompt: string, pageContext?: string) {
    console.debug('[Chat Handler] Starting prompt execution for tab:', tabId);
    console.debug('[Chat Handler] User prompt:', userPrompt);

    const session = getTabSession(tabId);
    const settings = await settingsStorage.getValue();
    
    if (!settings.selectedModelId) {
        console.error('[Chat Handler] No model selected');
        throw new Error('No model selected');
    }

    console.debug('[Chat Handler] Selected model:', settings.selectedModelId);

    // Split only on the first colon to preserve model tags like "qwen3:4b"
    const colonIndex = settings.selectedModelId.indexOf(':');
    const providerType = settings.selectedModelId.substring(0, colonIndex) as ProviderType;
    const modelId = settings.selectedModelId.substring(colonIndex + 1);
    const providerConfig = settings.providers[providerType];
    console.debug('[Chat Handler] Provider:', providerType, 'Model:', modelId);

    const provider = ProviderFactory.create(providerType, providerConfig);

    // Get model info to check context length
    console.debug('[Chat Handler] Fetching model info for context validation');
    const models = await provider.getModels();
    const activeModel = models.find(m => m.id === modelId);
    const contextLimit = activeModel?.contextLength;

    // Prepare messages
    const currentSession = await session.getValue();

    // Format page context if available
    let formattedPageContext = '';
    if (pageContext) {
        try {
            const pageContentObj: PageContent = JSON.parse(pageContext);
            formattedPageContext = formatPageContextForLLM(pageContentObj);
            console.debug('[Chat Handler] Page context formatted:', {
                title: pageContentObj.title,
                domain: pageContentObj.domain,
                wordCount: pageContentObj.wordCount,
                formattedLength: formattedPageContext.length
            });
        } catch (e) {
            console.error('[Chat Handler] Failed to parse page context:', e);
            formattedPageContext = pageContext; // Fallback to raw string
        }
    }

    // Combine system messages into one (some models ignore multiple system messages)
    const systemContent = formattedPageContext
        ? `${settings.systemPrompt}\n\n---\n\nContext from current page:\n\n${formattedPageContext}`
        : settings.systemPrompt;

    const messages: ChatMessage[] = [
        { role: 'system', content: systemContent },
        ...currentSession.messages,
        { role: 'user', content: userPrompt }
    ];

    // Calculate total text length and estimate tokens
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4); // Standard rule: 4 chars per token
    console.debug('[Chat Handler] Context check:', {
        totalChars,
        estimatedTokens,
        contextLimit: contextLimit || 'Unknown'
    });

    // Warn if content is very large (might exceed context window)
    if (systemContent.length > 50000) {
        console.warn('[Chat Handler] Large context detected:', systemContent.length, 'characters');
        console.warn('[Chat Handler] Some models may truncate or fail with this size');
    }

    // DEBUG: Print the full prompt being sent to LLM
    console.debug('\n========== FULL PROMPT TO LLM ==========');
    messages.forEach((msg, idx) => {
        console.debug(`\n--- Message ${idx + 1} (${msg.role}) ---`);
        console.debug(msg.content);
    });
    console.debug('\n========== END PROMPT ==========\n');

    console.debug('[Chat Handler] Total messages in conversation:', messages.length);

    // Update session state
    console.debug('[Chat Handler] Updating session state to loading');
    await session.setValue({
        ...currentSession,
        messages: [...currentSession.messages, { role: 'user', content: userPrompt }],
        isLoading: true,
        lastError: undefined
    });

    try {
        console.debug('[Chat Handler] Starting streaming from provider...');
        let fullResponse = '';
        let chunkCount = 0;
        const generator = provider.stream(modelId, messages);

        // Initial assistant message placeholder
        const assistantMessageIndex = (await session.getValue()).messages.length;
        console.debug('[Chat Handler] Assistant message will be at index:', assistantMessageIndex);

        // Throttle storage updates to prevent performance issues
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL_MS = 100; // Update at most every 100ms
        let pendingUpdate = false;

        const updateSession = async (force = false) => {
            const now = Date.now();
            if (!force && now - lastUpdateTime < UPDATE_INTERVAL_MS) {
                pendingUpdate = true;
                return;
            }

            pendingUpdate = false;
            lastUpdateTime = now;

            const updatedSession = await session.getValue();
            const newMessages = [...updatedSession.messages];
            newMessages[assistantMessageIndex] = { role: 'assistant', content: fullResponse };
            
            await session.setValue({
                ...updatedSession,
                messages: newMessages
            });
        };

        try {
            let lastChunkTime = Date.now();
            const CHUNK_TIMEOUT_MS = 30000; // 30 seconds without chunks = timeout

            for await (const chunk of generator) {
                chunkCount++;
                fullResponse += chunk;
                lastChunkTime = Date.now();

                if (chunkCount === 1) {
                    console.debug('[Chat Handler] First chunk received, starting response');
                }

                // Check for timeout
                const timeSinceLastChunk = Date.now() - lastChunkTime;
                if (timeSinceLastChunk > CHUNK_TIMEOUT_MS) {
                    console.warn('[Chat Handler] Chunk timeout - no data received for 30 seconds');
                    throw new Error('Request timeout - no response from provider');
                }

                // Throttled update
                await updateSession(false);
            }

            // Final update with any pending content
            if (pendingUpdate || fullResponse) {
                await updateSession(true);
            }
        } catch (streamError) {
            console.error('[Chat Handler] Stream error:', streamError);
            // Ensure we save what we have before re-throwing
            if (fullResponse) {
                await updateSession(true);
            }
            throw streamError;
        }

        console.debug('[Chat Handler] Streaming completed');
        console.debug('[Chat Handler] Total chunks received:', chunkCount);
        console.debug('[Chat Handler] Final response length:', fullResponse.length, 'characters');

        const finalSession = await session.getValue();

        console.debug('[Chat Handler] Setting loading to false');
        await session.setValue({
            ...finalSession,
            isLoading: false
        });

    } catch (error: any) {
        console.error('[Chat Handler] Error during chat execution:', error);
        console.error('[Chat Handler] Error stack:', error.stack);

        const errorMessage = error.message || 'Unknown error occurred';
        const userFriendlyError = `Error: ${errorMessage}. Please check your provider connection and try again.`;

        try {
            const currentSessionState = await session.getValue();

            // Add error message to chat if there's any partial response
            const errorMessages = [...currentSessionState.messages];

            // If the last message is an assistant message, it might be incomplete
            // Add error as a new assistant message
            if (errorMessages.length > 0 && errorMessages[errorMessages.length - 1].role === 'assistant') {
                // Append error to existing partial response
                const lastMsg = errorMessages[errorMessages.length - 1];
                if (lastMsg.content.trim()) {
                    // Keep partial response, add error as new message
                    errorMessages.push({ role: 'assistant', content: `⚠️ ${userFriendlyError}` });
                } else {
                    // Replace empty assistant message with error
                    errorMessages[errorMessages.length - 1] = { role: 'assistant', content: `⚠️ ${userFriendlyError}` };
                }
            } else {
                // No assistant message yet, add error message
                errorMessages.push({ role: 'assistant', content: `⚠️ ${userFriendlyError}` });
            }

            await session.setValue({
                ...currentSessionState,
                messages: errorMessages,
                isLoading: false,
                lastError: errorMessage
            });

            console.debug('[Chat Handler] Error state updated successfully');
        } catch (storageError) {
            console.error('[Chat Handler] Failed to update session after error:', storageError);
            // Last resort - try to at least stop loading state
            try {
                const fallbackState = await session.getValue();
                await session.setValue({
                    ...fallbackState,
                    isLoading: false
                });
            } catch (finalError) {
                console.error('[Chat Handler] Fatal: Could not update any session state:', finalError);
            }
        }

        // Don't re-throw - error is handled and displayed to user
        console.debug('[Chat Handler] Error handled, execution complete');
    }
}
