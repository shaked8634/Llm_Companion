const headers: object = {
    "Content-Type": "application/json"
}

export async function performApiCall(
    method: string,
    url: string,
    key: string = '',
    body: object = {}
): Promise<object> {
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                ...headers,
                ...(key && {'Authorization': `Bearer ${key}`})
            },
            body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Error: ${url} status: ${response.status}. Error: ${response.statusText}`);
        }
        console.debug(response)
        return await response.json();
    } catch (error) {
        console.error('Error performing API call:', error);
        // throw error;
    }
    return {}
}