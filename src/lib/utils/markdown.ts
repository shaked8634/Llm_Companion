import { micromark } from "micromark";

export function renderMarkdown(markdown: string): string {
  return micromark(markdown, {
    allowDangerousHtml: false,
    allowDangerousProtocol: false,
  });
}
