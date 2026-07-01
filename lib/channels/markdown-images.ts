export function buildMarkdownImageSnippet(publicUrl: string, alt?: string) {
  const caption = alt?.trim() || "图片";
  return `\n\n![${caption}](${publicUrl})\n\n`;
}

export function insertTextAtSelection(
  current: string,
  snippet: string,
  selectionStart: number,
  selectionEnd: number,
) {
  return (
    current.slice(0, selectionStart) + snippet + current.slice(selectionEnd)
  );
}
