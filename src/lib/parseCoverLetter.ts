export type BulletItem = {
  label: string;
  text: string;
};

export type ParsedBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: BulletItem[] };

export type ParsedLetter = {
  greeting: string | null;
  body: ParsedBlock[];
  signOffLabel: string;
  signOffName: string;
};

const SIGN_OFF_PATTERN = /^(sincerely|best regards|kind regards|warm regards|regards|best|thank you)[,.]?$/i;

/**
 * Strips common markdown emphasis/heading syntax. The cover letter document renders plain text
 * verbatim (no markdown parser), so an AI reply that ignores the "no markdown" prompt instruction
 * would otherwise print literal `**`/`*`/`#` characters instead of the intended formatting.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/^#{1,6}\s+/, '')
    .trim();
}

/**
 * Some AI replies chain markdown bullets inline within one paragraph instead of one per line
 * (e.g. "...interfaces. * **Advanced AI Integration**: I possess...") — break each `* **Label**:`
 * onto its own line before paragraph splitting so the bullet-block detection below can find them.
 * Only horizontal whitespace is consumed so this never bridges an actual paragraph break.
 */
function normalizeInlineBullets(text: string): string {
  return text.replace(/([^\n])[ \t]+\*[ \t]+(?=\*\*)/g, '$1\n* ');
}

export function parseCoverLetter(raw: string): ParsedLetter {
  const paragraphs = normalizeInlineBullets(raw)
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  let greeting: string | null = null;
  let signOffLabel = 'Sincerely,';
  let signOffName = '';

  if (paragraphs.length > 0 && !paragraphs[0].includes('\n')) {
    greeting = stripMarkdown(paragraphs.shift() ?? '') || null;
  }

  if (paragraphs.length > 0) {
    const lastLines = paragraphs[paragraphs.length - 1]
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lastLines.length > 0 && SIGN_OFF_PATTERN.test(lastLines[0])) {
      paragraphs.pop();
      signOffLabel = lastLines[0];
      signOffName = lastLines[1] ?? '';
    }
  }

  const body: ParsedBlock[] = paragraphs.map((paragraph) => {
    const lines = paragraph
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const isBulletBlock = lines.length > 1 && lines.every((line) => /^[-•*]\s+/.test(line));

    if (isBulletBlock) {
      return {
        kind: 'bullets',
        items: lines.map((line) => {
          const cleaned = line.replace(/^[-•*]\s+/, '');
          const colonIndex = cleaned.indexOf(':');

          return colonIndex === -1
            ? { label: '', text: stripMarkdown(cleaned) }
            : {
              label: stripMarkdown(cleaned.slice(0, colonIndex)),
              text: stripMarkdown(cleaned.slice(colonIndex + 1)),
            };
        }),
      };
    }

    return { kind: 'paragraph', text: stripMarkdown(lines.join(' ')) };
  });

  return {
    greeting,
    body,
    signOffLabel: stripMarkdown(signOffLabel),
    signOffName: stripMarkdown(signOffName),
  };
}
