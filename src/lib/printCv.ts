const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MIN_PRINT_SCALE = 0.92;

export function getCvPrintScale(pageElement: HTMLElement): number {
  const pageHeightPx = (A4_HEIGHT_MM * pageElement.offsetWidth) / A4_WIDTH_MM;
  return Math.min(1, pageHeightPx / pageElement.scrollHeight);
}

export function cvNeedsOverflowWarning(pageElement: HTMLElement): boolean {
  return getCvPrintScale(pageElement) < MIN_PRINT_SCALE;
}

export function applyCvPrintScale(pageElement: HTMLElement): number {
  const scale = getCvPrintScale(pageElement);

  if (scale < 1) {
    pageElement.style.zoom = scale.toFixed(4);
  }

  return scale;
}

export function clearCvPrintScale(pageElement: HTMLElement): void {
  pageElement.style.zoom = '';
}
