import {getTabSession, settingsStorage} from '@/lib/store';
import {ProviderFactory} from '@/lib/providers/factory';
import {ChatMessage, ProviderType} from '@/lib/providers/types';

export async function handleExecutePrompt(tabId: number, userPrompt: string, pageContext?: string) {
    const session = getTabSession(tabId);
    const settings = await settingsStorage.getValue();
    
    if (!settings.selectedModelId) {
        throw new Error('No model selected');
    }

    const [providerType, modelId] = settings.selectedModelId.split(':') as [ProviderType, string];
    const providerConfig = settings.providers[providerType];
    const provider = ProviderFactory.create(providerType, providerConfig);

    // Prepare messages
    const currentSession = await session.getValue();
    const messages: ChatMessage[] = [
        { role: 'system', content: settings.systemPrompt },
        ...(pageContext ? [{ role: 'system', content: `Context from current page:\n\n${pageContext}` } as ChatMessage] : []),
        ...currentSession.messages,
        { role: 'user', content: userPrompt }
    ];

    // Update session state
    await session.setValue({
        ...currentSession,
        messages: [...currentSession.messages, { role: 'user', content: userPrompt }],
        isLoading: true,
        lastError: undefined
    });

    try {
        let fullResponse = '';
        const generator = provider.stream(modelId, messages);

        // Initial assistant message placeholder
        const assistantMessageIndex = (await session.getValue()).messages.length;
        
        for await (const chunk of generator) {
            fullResponse += chunk;
            
            // Update storage reactively
            const updatedSession = await session.getValue();
            const newMessages = [...updatedSession.messages];
            newMessages[assistantMessageIndex] = { role: 'assistant', content: fullResponse };
            
            await session.setValue({
                ...updatedSession,
                messages: newMessages
            });
        }

        await session.setValue({
            ...(await session.getValue()),
            isLoading: false
        });

    } catch (error: any) {
        console.error('Chat error:', error);
        await session.setValue({
            ...(await session.getValue()),
            isLoading: false,
            lastError: error.message
        });
    }
}
