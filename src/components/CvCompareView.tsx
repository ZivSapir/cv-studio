import type { CvDiffSection, ResolvedCv } from '../types/cv';
import { CvDiffSectionView } from './CvDiffSectionView';
import { CvDocument } from './CvDocument';
import './CvCompareView.css';

type CvCompareViewProps = {
  baseCv: ResolvedCv;
  compareCv: ResolvedCv;
  baseLabel: string;
  diffs: CvDiffSection[];
};

export const CvCompareView = ({
  baseCv,
  compareCv,
  baseLabel,
  diffs,
}: CvCompareViewProps) => {
  return (
    <div className="cv-compare">
      {diffs.length ? (
        <section className="cv-compare-diffs">
          <div className="cv-compare-diffs-header">
            <h2 className="cv-compare-title">Diff vs {baseLabel}</h2>
            <p className="cv-compare-subtitle">
              Red = removed from base. Green = added in selected CV. Unchanged lines shown for context.
            </p>
          </div>
          <div className="cv-compare-diff-sections">
            {diffs.map((section) => (
              <CvDiffSectionView
                key={section.field}
                section={section}
              />
            ))}
          </div>
        </section>
      ) : (
        <p className="cv-compare-empty">Selected CV matches the base.</p>
      )}

      <div className="cv-compare-grid">
        <div className="cv-compare-panel">
          <p className="cv-compare-panel-label">{baseLabel}</p>
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
