import type { CvDiffEntry, ResolvedCv } from '../types/cv';
import { CvDocument } from './CvDocument';
import './CvCompareView.css';

type CvCompareViewProps = {
  baseCv: ResolvedCv;
  compareCv: ResolvedCv;
  diffs: CvDiffEntry[];
};

export const CvCompareView = ({
  baseCv,
  compareCv,
  diffs,
}: CvCompareViewProps) => {
  return (
    <div className="cv-compare">
      {diffs.length ? (
        <section className="cv-compare-diffs">
          <h2 className="cv-compare-title">Differences from base</h2>
          <ul className="cv-compare-diff-list">
            {diffs.map((diff) => (
              <li
                key={diff.field}
                className="cv-compare-diff-item"
              >
                <p className="cv-compare-diff-field">{diff.field}</p>
                <p className="cv-compare-diff-base">
                  <strong>Base:</strong> {diff.base}
                </p>
                <p className="cv-compare-diff-compare">
                  <strong>Selected:</strong> {diff.compare}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="cv-compare-empty">Selected CV matches the base.</p>
      )}

      <div className="cv-compare-grid">
        <div className="cv-compare-panel">
          <p className="cv-compare-panel-label">Base CV</p>
          <div className="cv-compare-preview">
            <CvDocument cv={baseCv} />
          </div>
        </div>

        <div className="cv-compare-panel">
          <p className="cv-compare-panel-label">{compareCv.versionLabel}</p>
          <div className="cv-compare-preview">
            <CvDocument cv={compareCv} />
          </div>
        </div>
      </div>
    </div>
  );
};
