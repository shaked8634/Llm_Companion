interface RequestFingerprintInput {
  userPrompt: string;
  pageContext?: string;
  selectedModelId: string;
  systemPrompt: string;
}

export async function createRequestFingerprint({
  userPrompt,
  pageContext,
  selectedModelId,
  systemPrompt,
}: RequestFingerprintInput): Promise<string> {
  let normalizedPageContext: unknown = pageContext ?? "";

  try {
    const { timestamp: _timestamp, ...pageContent } = JSON.parse(
      pageContext ?? "",
    );
    normalizedPageContext = pageContent;
  } catch {
    // Preserve non-page prompt input and malformed scrape responses as-is.
  }

  const input = JSON.stringify({
    userPrompt,
    pageContext: normalizedPageContext,
    selectedModelId,
    systemPrompt,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
