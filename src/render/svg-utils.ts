export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** trunca um texto para caber aproximadamente em `maxWidth` px, considerando uma largura média de caractere */
export function truncateToWidth(text: string, maxWidth: number, charWidth = 7.2): string {
  const maxChars = Math.max(3, Math.floor(maxWidth / charWidth));
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}
