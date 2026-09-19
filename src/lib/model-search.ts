export const MODEL_SEARCH_SESSION_KEY = "model-search-query";

export async function getModelSearchQuery(): Promise<string> {
  const sessionStorage = globalThis.chrome?.storage?.session;
  if (!sessionStorage) return "";

  const stored = await sessionStorage.get(MODEL_SEARCH_SESSION_KEY);
  const query = stored[MODEL_SEARCH_SESSION_KEY];
  return typeof query === "string" ? query : "";
}

export async function setModelSearchQuery(query: string): Promise<void> {
  const sessionStorage = globalThis.chrome?.storage?.session;
  if (!sessionStorage) return;

  await sessionStorage.set({ [MODEL_SEARCH_SESSION_KEY]: query });
}
