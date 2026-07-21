import { Fragment, type RefObject } from 'react';
import type { IconType } from 'react-icons';
import {
  TbBrandGithub,
  TbBrandLinkedin,
  TbChevronDown,
  TbChevronUp,
  TbEyeOff,
  TbMail,
  TbPhone,
} from 'react-icons/tb';
import type { ResolvedCv } from '../types/cv';
import './CvDocument.css';

type CvDocumentEditActions = {
  onHeadlineChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onBulletTextChange: (bulletId: string, text: string) => void;
  onProjectTitleChange: (projectId: string, title: string) => void;
  onProjectDescriptionChange: (
    projectId: string,
    description: string,
  ) => void;
  onTextCommit: () => void;
  onMoveExperience: (
    experienceId: string,
    direction: 'up' | 'down',
  ) => void;
  onMoveBullet: (
    experienceId: string,
    bulletId: string,
    direction: 'up' | 'down',
  ) => void;
  onMoveProject: (
    projectId: string,
    direction: 'up' | 'down',
  ) => void;
  onHideBullet: (bulletId: string) => void;
  onHideProject: (projectId: string) => void;
};

type CvDocumentProps = {
  cv: ResolvedCv;
  pageRef?: RefObject<HTMLElement | null>;
  isEditing?: boolean;
  editActions?: CvDocumentEditActions;
};

const renderBulletText = (text: string) => {
  const colonIndex = text.indexOf(':');

  if (colonIndex === -1) {
    return text;
  }

  return (
    <>
      <strong>{text.slice(0, colonIndex + 1)}</strong>
      {text.slice(colonIndex + 1)}
    </>
  );
};

type ContactIconName = 'phone' | 'email' | 'linkedin' | 'github';

type ContactIconProps = {
  name: ContactIconName;
};

const CONTACT_ICONS: Record<ContactIconName, IconType> = {
  phone: TbPhone,
  email: TbMail,
  linkedin: TbBrandLinkedin,
  github: TbBrandGithub,
};

const ContactIcon = ({ name }: ContactIconProps) => {
  const Icon = CONTACT_ICONS[name];

  return (
    <Icon
      aria-hidden="true"
      className="cv-contact-icon"
    />
  );
};

type EditControlsProps = {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onHide?: () => void;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
};

const EditControls = ({
  onMoveUp,
  onMoveDown,
  onHide,
  moveUpDisabled,
  moveDownDisabled,
}: EditControlsProps) => {
  return (
    <div className="cv-edit-controls">
      {onMoveUp ? (
        <button
          type="button"
          className="cv-edit-control-button"
          aria-label="Move up"
          disabled={moveUpDisabled}
          onClick={onMoveUp}
        >
          <TbChevronUp />
        </button>
      ) : null}
      {onMoveDown ? (
        <button
          type="button"
          className="cv-edit-control-button"
          aria-label="Move down"
          disabled={moveDownDisabled}
          onClick={onMoveDown}
        >
          <TbChevronDown />
        </button>
      ) : null}
      {onHide ? (
        <button
          type="button"
          className="cv-edit-control-button"
          aria-label="Hide"
          onClick={onHide}
        >
          <TbEyeOff />
        </button>
      ) : null}
    </div>
  );
};

export const CvDocument = ({
  cv,
  pageRef,
  isEditing = false,
  editActions,
}: CvDocumentProps) => {
  const experienceCount = cv.experience.length;
  const projectCount = cv.projects.length;

  return (
    <article
      ref={pageRef}
      className={isEditing ? 'cv-page cv-page-editing' : 'cv-page'}
      aria-label={`CV version ${cv.versionLabel}`}
    >
      <header className="cv-header">
        <h1 className="cv-name">{cv.name.toUpperCase()}</h1>
        {isEditing && editActions ? (
          <input
            className="cv-headline cv-edit-input"
            value={cv.headline}
            aria-label="Headline"
            onChange={(event) => editActions.onHeadlineChange(event.target.value)}
            onBlur={() => editActions.onTextCommit()}
          />
        ) : (
          <p className="cv-headline">{cv.headline}</p>
        )}
        {isEditing && editActions ? (
          <textarea
            className="cv-summary cv-edit-textarea"
            value={cv.summary}
            aria-label="Summary"
            rows={4}
            onChange={(event) => editActions.onSummaryChange(event.target.value)}
            onBlur={() => editActions.onTextCommit()}
          />
        ) : (
          <p className="cv-summary">{cv.summary}</p>
        )}
      </header>

      <div className="cv-columns">
        <aside className="cv-sidebar">
          <section className="cv-section">
            <h2 className="cv-section-title">Contact</h2>
            <ul className="cv-contact-list">
              <li>
                <span className="cv-contact-icon-wrap">
                  <ContactIcon name="phone" />
                </span>
                <span>{cv.contact.phone}</span>
              </li>
              <li>
                <span className="cv-contact-icon-wrap">
                  <ContactIcon name="email" />
                </span>
                <span>{cv.contact.email}</span>
              </li>
              <li>
                <span className="cv-contact-icon-wrap">
                  <ContactIcon name="linkedin" />
                </span>
                <a
                  className="cv-contact-link"
                  href={cv.contact.linkedin.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {cv.contact.linkedin.label}
                </a>
              </li>
              <li>
                <span className="cv-contact-icon-wrap">
                  <ContactIcon name="github" />
                </span>
                <a
                  className="cv-contact-link"
                  href={cv.contact.portfolio.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {cv.contact.portfolio.label}
                </a>
              </li>
            </ul>
          </section>

          <section className="cv-section">
            <h2 className="cv-section-title">Skills</h2>
            <ul className="cv-skill-list">
              {cv.skills.map((category) => (
                <li key={category.id}>
                  <strong>{category.label}</strong> {category.items}
                </li>
              ))}
            </ul>
          </section>

          <section className="cv-section">
            <h2 className="cv-section-title">Education</h2>
            <p className="cv-education-institution">{cv.education.institution}</p>
            {cv.education.entries.map((entry) => (
              <div
                key={`${entry.degree}-${entry.period}`}
                className="cv-education-entry"
              >
                <p className="cv-education-degree">{entry.degree}</p>
                <p className="cv-education-period">{entry.period}</p>
                {entry.details ? (
                  <ul className="cv-education-details">
                    {entry.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </section>
        </aside>

        <div className="cv-main">
          <section className="cv-section">
            <h2 className="cv-section-title">Work Experience</h2>
            {cv.experience.map((entry, index) => (
              <Fragment key={entry.id}>
                {index > 0 ? (
                  <hr className="cv-experience-divider" />
                ) : null}
                <div className="cv-experience-block">
                  <div className="cv-block-header">
                    <div className="cv-block-header-text">
                      <p className="cv-company-line">
                        {entry.company.toUpperCase()} | {entry.location.toUpperCase()}
                      </p>
                      <p className="cv-tenure">{entry.tenure}</p>
                    </div>
                    {isEditing && editActions ? (
                      <EditControls
                        moveUpDisabled={index === 0}
                        moveDownDisabled={index === experienceCount - 1}
                        onMoveUp={() => editActions.onMoveExperience(entry.id, 'up')}
                        onMoveDown={() => editActions.onMoveExperience(entry.id, 'down')}
                      />
                    ) : null}
                  </div>
                  {(() => {
                    const experienceBullets = entry.roles.flatMap((role) => role.bullets);
                    const bulletIndexById = new Map(
                      experienceBullets.map((bullet, bulletIndex) => [
                        bullet.id,
                        bulletIndex,
                      ]),
                    );

                    return entry.roles.map((role) => (
                      <div
                        key={role.title}
                        className="cv-role-block"
                      >
                        <h3 className="cv-role-title">{role.title.toUpperCase()}</h3>
                        <ul className="cv-bullet-list">
                          {role.bullets.map((bullet) => {
                            const bulletIndex = bulletIndexById.get(bullet.id) ?? 0;

                            return (
                              <li key={bullet.id}>
                                {isEditing && editActions ? (
                                  <div className="cv-edit-bullet-row">
                                    <textarea
                                      className="cv-edit-textarea cv-edit-bullet-input"
                                      value={bullet.text}
                                      aria-label={`Bullet ${bullet.id}`}
                                      rows={3}
                                      onChange={(event) => {
                                        editActions.onBulletTextChange(
                                          bullet.id,
                                          event.target.value,
                                        );
                                      }}
                                      onBlur={() => editActions.onTextCommit()}
                                    />
                                    <EditControls
                                      moveUpDisabled={bulletIndex === 0}
                                      moveDownDisabled={
                                        bulletIndex === experienceBullets.length - 1
                                      }
                                      onMoveUp={() => {
                                        editActions.onMoveBullet(
                                          entry.id,
                                          bullet.id,
                                          'up',
                                        );
                                      }}
                                      onMoveDown={() => {
                                        editActions.onMoveBullet(
                                          entry.id,
                                          bullet.id,
                                          'down',
                                        );
                                      }}
                                      onHide={() => editActions.onHideBullet(bullet.id)}
                                    />
                                  </div>
                                ) : (
                                  renderBulletText(bullet.text)
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ));
                  })()}
                </div>
              </Fragment>
            ))}
          </section>

          <section className="cv-section">
            <h2 className="cv-section-title">{cv.projectsSectionTitle}</h2>
            {cv.projects.map((project, index) => (
              <div
                key={project.id}
                className="cv-project-block"
              >
                {isEditing && editActions ? (
                  <div className="cv-edit-project">
                    <div className="cv-block-header">
                      <input
                        className="cv-project-title cv-edit-input"
                        value={project.title}
                        aria-label={`Project title ${project.id}`}
                        onChange={(event) => {
                          editActions.onProjectTitleChange(
                            project.id,
                            event.target.value,
                          );
                        }}
                        onBlur={() => editActions.onTextCommit()}
                      />
                      <EditControls
                        moveUpDisabled={index === 0}
                        moveDownDisabled={index === projectCount - 1}
                        onMoveUp={() => editActions.onMoveProject(project.id, 'up')}
                        onMoveDown={() => editActions.onMoveProject(project.id, 'down')}
                        onHide={() => editActions.onHideProject(project.id)}
                      />
                    </div>
                    <textarea
                      className="cv-project-description cv-edit-textarea"
                      value={project.description}
                      aria-label={`Project description ${project.id}`}
                      rows={3}
                      onChange={(event) => {
                        editActions.onProjectDescriptionChange(
                          project.id,
                          event.target.value,
                        );
                      }}
                      onBlur={() => editActions.onTextCommit()}
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="cv-project-title">{project.title}</h3>
                    <p className="cv-project-description">{project.description}</p>
                  </>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>

      {cv.footerNote ? (
        <p className="cv-footer-note">{cv.footerNote}</p>
      ) : null}
    </article>
  );
};
