const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function buildCvPdfTitle(name: string, headline: string): string {
  const title = `${name.trim()} - ${headline.trim()}`
    .replace(INVALID_FILENAME_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();

  return title || 'CV';
}

export type CvPageFitMeasurement = {
  overflows: boolean;
  clientHeight: number;
  scrollHeight: number;
  overflowPx: number;
  sparePx: number;
};

export function measureCvPageFit(pageElement: HTMLElement): CvPageFitMeasurement {
  const clientHeight = pageElement.clientHeight;
  const scrollHeight = pageElement.scrollHeight;

  if (!clientHeight) {
    return {
      overflows: false,
      clientHeight: 0,
      scrollHeight,
      overflowPx: 0,
      sparePx: 0,
    };
  }

  const overflowPx = Math.max(0, scrollHeight - clientHeight - 1);
  const sparePx = Math.max(0, clientHeight - scrollHeight);

  return {
    overflows: overflowPx > 0,
    clientHeight,
    scrollHeight,
    overflowPx,
    sparePx,
  };
}

export function cvPageOverflows(pageElement: HTMLElement): boolean {
  return measureCvPageFit(pageElement).overflows;
}
