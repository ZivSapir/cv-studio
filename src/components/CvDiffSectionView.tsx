import type { CvDiffLine, CvDiffSection } from '../types/cv';
import './CvDiffSection.css';

type CvDiffSectionViewProps = {
  section: CvDiffSection;
};

const CvDiffLineView = ({ line }: { line: CvDiffLine }) => {
  if (line.type === 'context') {
    return (
      <div className="cv-diff-line cv-diff-line-context">
        <span className="cv-diff-gutter"> </span>
        <span className="cv-diff-content">{line.content || ' '}</span>
      </div>
    );
  }

  const modifier = line.type === 'remove' ? 'remove' : 'add';
  const gutter = line.type === 'remove' ? '-' : '+';

  return (
    <div className={`cv-diff-line cv-diff-line-${modifier}`}>
      <span className="cv-diff-gutter">{gutter}</span>
      <span className="cv-diff-content">{line.content || ' '}</span>
    </div>
  );
};

export const CvDiffSectionView = ({ section }: CvDiffSectionViewProps) => {
  const removedCount = section.lines.filter((line) => line.type === 'remove').length;
  const addedCount = section.lines.filter((line) => line.type === 'add').length;

  return (
    <article className="cv-diff-section">
      <header className="cv-diff-section-header">
        <h3 className="cv-diff-section-title">{section.field}</h3>
        <span className="cv-diff-section-stats">
          {removedCount ? `-${removedCount}` : null}
          {removedCount && addedCount ? ' / ' : null}
          {addedCount ? `+${addedCount}` : null}
        </span>
      </header>
      <div className="cv-diff-block">
        {section.lines.map((line, index) => (
          <CvDiffLineView
            key={`${line.type}-${index}`}
            line={line}
          />
        ))}
      </div>
    </article>
  );
};
