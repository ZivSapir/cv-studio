import type { ResolvedCv } from '../types/cv';
import { parseCoverLetter } from '../lib/parseCoverLetter';
import './CoverLetterDocument.css';

type CoverLetterDocumentProps = {
  text: string;
  cv: ResolvedCv;
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
