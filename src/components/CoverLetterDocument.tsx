import type { ResolvedCv } from '../types/cv';
import './CoverLetterDocument.css';

type CoverLetterDocumentProps = {
  text: string;
  cv: ResolvedCv;
};

type BulletItem = {
  label: string;
  text: string;
};

type ParsedBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: BulletItem[] };

type ParsedLetter = {
  greeting: string | null;
  body: ParsedBlock[];
  signOffLabel: string;
  signOffName: string;
};

const SIGN_OFF_PATTERN = /^(sincerely|best regards|kind regards|warm regards|regards|best|thank you)[,.]?$/i;

const parseCoverLetter = (raw: string): ParsedLetter => {
  const paragraphs = raw
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  let greeting: string | null = null;
  let signOffLabel = 'Sincerely,';
  let signOffName = '';

  if (paragraphs.length > 0 && !paragraphs[0].includes('\n')) {
    greeting = paragraphs.shift() ?? null;
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
    const isBulletBlock = lines.length > 1 && lines.every((line) => /^[-•]\s+/.test(line));

    if (isBulletBlock) {
      return {
        kind: 'bullets',
        items: lines.map((line) => {
          const cleaned = line.replace(/^[-•]\s+/, '');
          const colonIndex = cleaned.indexOf(':');

          return colonIndex === -1
            ? { label: '', text: cleaned }
            : {
              label: cleaned.slice(0, colonIndex),
              text: cleaned.slice(colonIndex + 1).trim(),
            };
        }),
      };
    }

    return { kind: 'paragraph', text: lines.join(' ') };
  });

  return { greeting, body, signOffLabel, signOffName };
};

const formatToday = () => {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const CoverLetterDocument = ({
  text,
  cv,
}: CoverLetterDocumentProps) => {
  const { greeting, body, signOffLabel, signOffName } = parseCoverLetter(text);

  return (
    <article className="cover-letter-page">
      <header className="cover-letter-header">
        <div className="cover-letter-name">{cv.name}</div>
        <div className="cover-letter-contact">
          {cv.contact.phone}
          {' '}
          &middot;
          {' '}
          {cv.contact.email}
          {' '}
          &middot;
          {' '}
          <a href={cv.contact.linkedin.url}>{cv.contact.linkedin.label}</a>
          {' '}
          &middot;
          {' '}
          <a href={cv.contact.portfolio.url}>{cv.contact.portfolio.label}</a>
        </div>
      </header>
      <hr className="cover-letter-rule" />
      <div className="cover-letter-date">{formatToday()}</div>
      {greeting ? <p>{greeting}</p> : null}
      {body.map((block, index) => {
        if (block.kind === 'bullets') {
          return (
            <ul
              className="cover-letter-bullets"
              key={`bullets-${index}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>
                  {item.label ? <strong>{item.label}:</strong> : null}
                  {' '}
                  {item.text}
                </li>
              ))}
            </ul>
          );
        }

        return <p key={`paragraph-${index}`}>{block.text}</p>;
      })}
      <div className="cover-letter-signoff">
        <p className="cover-letter-signoff-label">{signOffLabel}</p>
        <p className="cover-letter-signoff-name">{signOffName || cv.name}</p>
      </div>
    </article>
  );
};
