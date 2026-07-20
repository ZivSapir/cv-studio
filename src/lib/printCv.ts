const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function buildCvPdfTitle(name: string, headline: string): string {
  const title = `${name.trim()} - ${headline.trim()}`
    .replace(INVALID_FILENAME_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();

  return title || 'CV';
}

export function cvPageOverflows(pageElement: HTMLElement): boolean {
  if (!pageElement.clientHeight) {
    return false;
  }

  return pageElement.scrollHeight > pageElement.clientHeight + 1;
}
