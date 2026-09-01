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

function getContentBottom(pageElement: HTMLElement): number {
  const pageTop = pageElement.getBoundingClientRect().top;

  return Array.from(
    pageElement.querySelectorAll('.cv-header, .cv-sidebar, .cv-main'),
  ).reduce((maxBottom, element) => {
    const bottom = element.getBoundingClientRect().bottom - pageTop;

    return Math.max(maxBottom, bottom);
  }, 0);
}

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

  const contentBottom = getContentBottom(pageElement);
  const overflowPx = Math.max(0, contentBottom - clientHeight - 2);
  const sparePx = Math.max(0, clientHeight - contentBottom);

  return {
    overflows: overflowPx > 0,
    clientHeight,
    scrollHeight: contentBottom,
    overflowPx,
    sparePx,
  };
}
