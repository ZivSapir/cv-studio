import type { IconType } from 'react-icons';
import {
  TbBrandGithub,
  TbBrandLinkedin,
  TbMail,
  TbPhone,
} from 'react-icons/tb';
import { Fragment, type RefObject } from 'react';
import type { ResolvedCv } from '../types/cv';
import './CvDocument.css';

type CvDocumentProps = {
  cv: ResolvedCv;
  pageRef?: RefObject<HTMLElement | null>;
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

export const CvDocument = ({
  cv,
  pageRef,
}: CvDocumentProps) => {
  return (
    <article
      ref={pageRef}
      className="cv-page"
      aria-label={`CV version ${cv.versionLabel}`}
    >
      <header className="cv-header">
        <h1 className="cv-name">{cv.name.toUpperCase()}</h1>
        <p className="cv-headline">{cv.headline}</p>
        <p className="cv-summary">{cv.summary}</p>
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
                  <p className="cv-company-line">
                    {entry.company.toUpperCase()} | {entry.location.toUpperCase()}
                  </p>
                  <p className="cv-tenure">{entry.tenure}</p>
                  {entry.roles.map((role) => (
                    <div
                      key={role.title}
                      className="cv-role-block"
                    >
                      <h3 className="cv-role-title">{role.title.toUpperCase()}</h3>
                      <ul className="cv-bullet-list">
                        {role.bullets.map((bullet) => (
                          <li key={bullet.id}>{renderBulletText(bullet.text)}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Fragment>
            ))}
          </section>

          <section className="cv-section">
            <h2 className="cv-section-title">Projects</h2>
            {cv.projects.map((project) => (
              <div
                key={project.id}
                className="cv-project-block"
              >
                <h3 className="cv-project-title">{project.title}</h3>
                <p className="cv-project-description">{project.description}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </article>
  );
};
