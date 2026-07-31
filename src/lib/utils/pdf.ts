import type { PdfAttachment } from "../providers/types";

export const MAX_PDF_BYTES = 50 * 1024 * 1024;

function getPdfName(url: string): string {
  try {
    const name = new URL(url).pathname.split("/").pop();
    return name ? decodeURIComponent(name) : "document.pdf";
  } catch {
    return "document.pdf";
  }
}

async function toBase64(bytes: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",", 2)[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([bytes], { type: "application/pdf" }));
  });
}

export async function getPdfAttachment(
  tabId: number,
  hasPageContext: boolean,
): Promise<PdfAttachment | undefined> {
  if (hasPageContext) return undefined;

  const tab = await chrome.tabs.get(tabId);
  if (!tab.url?.startsWith("http")) return undefined;

  const response = await fetch(tab.url);
  const contentType = response.headers.get("content-type") ?? "";
  const likelyPdf =
    contentType.includes("application/pdf") || /\.pdf(?:$|[?#])/i.test(tab.url);
  if (!likelyPdf) return undefined;
  if (!response.ok) {
    throw new Error(`Unable to read PDF: ${response.statusText}`);
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength > MAX_PDF_BYTES) {
    throw new Error("PDF exceeds the 50 MB limit");
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_PDF_BYTES) {
    throw new Error("PDF exceeds the 50 MB limit");
  }
  if (
    bytes.byteLength === 0 ||
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  ) {
    throw new Error("The current file is not a valid PDF");
  }

  return {
    name: getPdfName(tab.url),
    mimeType: "application/pdf",
    base64: await toBase64(bytes),
  };
}
