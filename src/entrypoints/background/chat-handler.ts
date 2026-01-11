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

    const messages: ChatMessage[] = [
        { role: 'system', content: settings.systemPrompt },
        ...(formattedPageContext ? [{ role: 'system', content: `Context from current page:\n\n${formattedPageContext}` } as ChatMessage] : []),
        ...currentSession.messages,
        { role: 'user', content: userPrompt }
    ];

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

        for await (const chunk of generator) {
            chunkCount++;
            fullResponse += chunk;
            
            if (chunkCount === 1) {
                console.debug('[Chat Handler] First chunk received, starting response');
            }

            // Update storage reactively
            const updatedSession = await session.getValue();
            const newMessages = [...updatedSession.messages];
            newMessages[assistantMessageIndex] = { role: 'assistant', content: fullResponse };
            
            await session.setValue({
                ...updatedSession,
                messages: newMessages
            });
        }

        console.debug('[Chat Handler] Streaming completed');
        console.debug('[Chat Handler] Total chunks received:', chunkCount);
        console.debug('[Chat Handler] Final response length:', fullResponse.length, 'characters');

        console.debug('[Chat Handler] Setting loading to false');
        await session.setValue({
            ...(await session.getValue()),
            isLoading: false
        });

    } catch (error: any) {
        console.error('[Chat Handler] Error during chat execution:', error);
        console.error('[Chat Handler] Error stack:', error.stack);
        await session.setValue({
            ...(await session.getValue()),
            isLoading: false,
            lastError: error.message
        });
    }
}
