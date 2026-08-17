import type { ReactNode } from 'react';
import { TbChevronDown, TbChevronRight, TbX } from 'react-icons/tb';

export type SidebarSection = 'coverLetter' | 'aiTailor';

type SectionConfig = {
  id: SidebarSection;
  label: string;
  disabledHint?: string;
};

type CvToolsSidebarProps = {
  isOpen: boolean;
  openSection: SidebarSection | null;
  isCoverLetterAvailable: boolean;
  areToolsAvailable: boolean;
  coverLetterUnavailableHint?: string;
  aiTailorUnavailableHint?: string;
  onClose: () => void;
  onToggleSection: (section: SidebarSection) => void;
  coverLetterContent: ReactNode;
  aiTailorContent: ReactNode;
};

export const CvToolsSidebar = ({
  isOpen,
  openSection,
  isCoverLetterAvailable,
  areToolsAvailable,
  coverLetterUnavailableHint,
  aiTailorUnavailableHint,
  onClose,
  onToggleSection,
  coverLetterContent,
  aiTailorContent,
}: CvToolsSidebarProps) => {
  if (!isOpen) {
    return null;
  }

  const sections: SectionConfig[] = [
    {
      id: 'coverLetter',
      label: 'Cover letter',
      disabledHint: isCoverLetterAvailable
        ? undefined
        : (coverLetterUnavailableHint ?? 'Save a copy of this CV first'),
    },
    {
      id: 'aiTailor',
      label: 'AI tailor',
      disabledHint: areToolsAvailable
        ? undefined
        : (aiTailorUnavailableHint ?? 'Not available here'),
    },
  ];

  const contentBySection: Record<SidebarSection, ReactNode> = {
    coverLetter: coverLetterContent,
    aiTailor: aiTailorContent,
  };

  return (
    <>
      <button
        type="button"
        className="app-sidebar-backdrop"
        aria-label="Close tools panel"
        onClick={onClose}
      />
      <aside
        className="app-sidebar"
        aria-label="Document tools"
      >
        <div className="app-sidebar-header">
          <span className="app-sidebar-title">Tools</span>
          <button
            type="button"
            className="app-sidebar-close"
            aria-label="Close tools panel"
            onClick={onClose}
          >
            <TbX aria-hidden />
          </button>
        </div>

        <div className="app-sidebar-sections">
          {sections.map((section) => {
            const isExpanded = openSection === section.id;
            const isDisabled = Boolean(section.disabledHint);
            const sectionContent = contentBySection[section.id];

            return (
              <section
                key={section.id}
                className={
                  isExpanded
                    ? 'app-sidebar-section app-sidebar-section-open'
                    : 'app-sidebar-section'
                }
              >
                <h2 className="app-sidebar-section-heading">
                  <button
                    type="button"
                    className="app-sidebar-section-button"
                    aria-expanded={isExpanded}
                    disabled={isDisabled}
                    title={section.disabledHint}
                    onClick={() => onToggleSection(section.id)}
                  >
                    {isExpanded ? <TbChevronDown aria-hidden /> : <TbChevronRight aria-hidden />}
                    <span>{section.label}</span>
                  </button>
                </h2>
                {isExpanded && sectionContent ? (
                  <div className="app-sidebar-section-body">
                    {sectionContent}
                  </div>
                ) : null}
                {isDisabled ? (
                  <p className="app-sidebar-section-hint">{section.disabledHint}</p>
                ) : null}
              </section>
            );
          })}
        </div>
      </aside>
    </>
  );
};
