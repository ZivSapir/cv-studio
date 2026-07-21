import { useMemo, useState } from 'react';
import { buildMasterFromOnboardingDraft } from '../lib/onboarding/buildMasterFromDraft';
import {
  createDefaultOnboardingDraft,
  createEmptyBullet,
  createEmptyExperience,
  createEmptyProject,
  createEmptyRole,
  validateOnboardingDraft,
  validateOnboardingExperience,
} from '../lib/onboarding/defaultDraft';
import type {
  OnboardingDraft,
  OnboardingExperienceDraft,
  OnboardingStep,
} from '../lib/onboarding/types';

type CvOnboardingWizardProps = {
  onCancel: () => void;
  onComplete: (draft: OnboardingDraft) => Promise<void>;
};

const STEPS: OnboardingStep[] = ['basics', 'experience', 'more', 'review'];

const STEP_LABELS: Record<OnboardingStep, string> = {
  basics: 'About you',
  experience: 'Experience',
  more: 'Skills & more',
  review: 'Review',
};

export const CvOnboardingWizard = ({
  onCancel,
  onComplete,
}: CvOnboardingWizardProps) => {
  const [step, setStep] = useState<OnboardingStep>('basics');
  const [draft, setDraft] = useState<OnboardingDraft>(createDefaultOnboardingDraft);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const previewMaster = useMemo(
    () => buildMasterFromOnboardingDraft(draft),
    [draft],
  );

  const updateDraft = (patch: Partial<OnboardingDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const goNext = () => {
    setError(null);

    if (step === 'basics') {
      if (!draft.name.trim() || !draft.headline.trim() || !draft.summary.trim() || !draft.email.trim()) {
        setError('Fill in name, headline, summary, and email to continue.');
        return;
      }
    }

    if (step === 'experience') {
      const experienceError = validateOnboardingExperience(draft.experience);
      if (experienceError) {
        setError(experienceError);
        return;
      }
    }

    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) {
      setStep(nextStep);
    }
  };

  const goBack = () => {
    setError(null);
    const previousStep = STEPS[stepIndex - 1];
    if (previousStep) {
      setStep(previousStep);
    }
  };

  const handleComplete = async () => {
    setError(null);
    const validationError = validateOnboardingDraft(draft);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      await onComplete(draft);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Failed to save your CV.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="app-onboarding">
      <div className="app-onboarding-header">
        <h2 className="app-onboarding-title">Guided CV setup</h2>
        <p className="app-onboarding-steps">
          Step {stepIndex + 1} of {STEPS.length}: {STEP_LABELS[step]}
        </p>
      </div>

      {step === 'basics' ? (
        <BasicsStep
          draft={draft}
          onChange={updateDraft}
        />
      ) : null}

      {step === 'experience' ? (
        <ExperienceStep
          experience={draft.experience}
          onChange={(experience) => updateDraft({ experience })}
        />
      ) : null}

      {step === 'more' ? (
        <MoreStep
          draft={draft}
          onChange={updateDraft}
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep master={previewMaster} />
      ) : null}

      {error ? (
        <p
          className="app-error-banner"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="app-onboarding-actions">
        <button
          type="button"
          className="app-button app-button-secondary"
          disabled={isSaving}
          onClick={stepIndex === 0 ? onCancel : goBack}
        >
          {stepIndex === 0 ? 'Cancel' : 'Back'}
        </button>
        {step === 'review' ? (
          <button
            type="button"
            className="app-button"
            disabled={isSaving}
            onClick={() => void handleComplete()}
          >
            {isSaving ? 'Creating…' : 'Create my CV'}
          </button>
        ) : (
          <button
            type="button"
            className="app-button"
            onClick={goNext}
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
};

type BasicsStepProps = {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
};

const BasicsStep = ({
  draft,
  onChange,
}: BasicsStepProps) => {
  return (
    <div className="app-onboarding-grid">
      <label className="app-onboarding-field">
        <span>Full name</span>
        <input
          type="text"
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Jane Doe"
        />
      </label>
      <label className="app-onboarding-field">
        <span>Headline</span>
        <input
          type="text"
          value={draft.headline}
          onChange={(event) => onChange({ headline: event.target.value })}
          placeholder="Software Engineer"
        />
      </label>
      <label className="app-onboarding-field app-onboarding-field-wide">
        <span>Summary</span>
        <textarea
          rows={4}
          value={draft.summary}
          onChange={(event) => onChange({ summary: event.target.value })}
          placeholder="2-4 sentences about what you build and what you bring to a team."
        />
      </label>
      <label className="app-onboarding-field">
        <span>Email</span>
        <input
          type="email"
          value={draft.email}
          onChange={(event) => onChange({ email: event.target.value })}
          placeholder="you@example.com"
        />
      </label>
      <label className="app-onboarding-field">
        <span>Phone</span>
        <input
          type="text"
          value={draft.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
          placeholder="+1-555-0100"
        />
      </label>
      <label className="app-onboarding-field">
        <span>LinkedIn URL</span>
        <input
          type="url"
          value={draft.linkedinUrl}
          onChange={(event) => onChange({ linkedinUrl: event.target.value })}
          placeholder="https://www.linkedin.com/in/your-handle/"
        />
      </label>
      <label className="app-onboarding-field">
        <span>Portfolio URL</span>
        <input
          type="url"
          value={draft.portfolioUrl}
          onChange={(event) => onChange({ portfolioUrl: event.target.value })}
          placeholder="https://yourname.github.io/portfolio/"
        />
      </label>
    </div>
  );
};

type ExperienceStepProps = {
  experience: OnboardingExperienceDraft[];
  onChange: (experience: OnboardingExperienceDraft[]) => void;
};

const ExperienceStep = ({
  experience,
  onChange,
}: ExperienceStepProps) => {
  const updateExperience = (
    index: number,
    patch: Partial<OnboardingExperienceDraft>,
  ) => {
    const next = experience.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, ...patch } : entry
    ));
    onChange(next);
  };

  const addExperience = () => {
    const ids = experience.map((entry) => entry.id);
    onChange([...experience, createEmptyExperience(ids)]);
  };

  const removeExperience = (index: number) => {
    if (experience.length <= 1) {
      return;
    }

    onChange(experience.filter((_, entryIndex) => entryIndex !== index));
  };

  return (
    <div className="app-onboarding-stack">
      {experience.map((entry, index) => (
        <article
          key={entry.id}
          className="app-onboarding-card"
        >
          <div className="app-onboarding-card-header">
            <h3 className="app-onboarding-card-title">Job {index + 1}</h3>
            {experience.length > 1 ? (
              <button
                type="button"
                className="app-button app-button-secondary app-button-small"
                onClick={() => removeExperience(index)}
              >
                Remove job
              </button>
            ) : null}
          </div>
          <div className="app-onboarding-grid">
            <label className="app-onboarding-field">
              <span>Company</span>
              <input
                type="text"
                value={entry.company}
                onChange={(event) => updateExperience(index, { company: event.target.value })}
              />
            </label>
            <label className="app-onboarding-field">
              <span>Location</span>
              <input
                type="text"
                value={entry.location}
                onChange={(event) => updateExperience(index, { location: event.target.value })}
                placeholder="City, Country"
              />
            </label>
            <label className="app-onboarding-field app-onboarding-field-wide">
              <span>Tenure</span>
              <input
                type="text"
                value={entry.tenure}
                onChange={(event) => updateExperience(index, { tenure: event.target.value })}
                placeholder="January 2020 - Present"
              />
            </label>
          </div>
          {entry.roles.map((role, roleIndex) => (
            <RoleEditor
              key={role.id}
              role={role}
              canRemove={entry.roles.length > 1}
              onChange={(nextRole) => {
                const roles = entry.roles.map((current, currentIndex) => (
                  currentIndex === roleIndex ? nextRole : current
                ));
                updateExperience(index, { roles });
              }}
              onRemove={() => {
                if (entry.roles.length <= 1) {
                  return;
                }

                updateExperience(index, {
                  roles: entry.roles.filter((_, currentIndex) => currentIndex !== roleIndex),
                });
              }}
            />
          ))}
          <button
            type="button"
            className="app-button app-button-secondary app-button-small"
            onClick={() => {
              const roleIds = entry.roles.map((role) => role.id);
              updateExperience(index, {
                roles: [...entry.roles, createEmptyRole(roleIds)],
              });
            }}
          >
            Add role
          </button>
        </article>
      ))}
      <button
        type="button"
        className="app-button app-button-secondary"
        onClick={addExperience}
      >
        Add another job
      </button>
    </div>
  );
};

type RoleEditorProps = {
  role: OnboardingExperienceDraft['roles'][number];
  canRemove: boolean;
  onChange: (role: OnboardingExperienceDraft['roles'][number]) => void;
  onRemove: () => void;
};

const RoleEditor = ({
  role,
  canRemove,
  onChange,
  onRemove,
}: RoleEditorProps) => {
  return (
    <div className="app-onboarding-subcard">
      <div className="app-onboarding-card-header">
        <h4 className="app-onboarding-subcard-title">Role</h4>
        {canRemove ? (
          <button
            type="button"
            className="app-button app-button-secondary app-button-small"
            onClick={onRemove}
          >
            Remove role
          </button>
        ) : null}
      </div>
      <div className="app-onboarding-grid">
        <label className="app-onboarding-field">
          <span>Title</span>
          <input
            type="text"
            value={role.title}
            onChange={(event) => onChange({ ...role, title: event.target.value })}
            placeholder="Software Engineer"
          />
        </label>
        <label className="app-onboarding-field">
          <span>Internal period (optional)</span>
          <input
            type="text"
            value={role.internalPeriod}
            onChange={(event) => onChange({ ...role, internalPeriod: event.target.value })}
            placeholder="2023 - Present"
          />
        </label>
      </div>
      <div className="app-onboarding-stack">
        {role.bullets.map((bullet, bulletIndex) => (
          <label
            key={bullet.id}
            className="app-onboarding-field app-onboarding-field-wide"
          >
            <span>Bullet {bulletIndex + 1}</span>
            <textarea
              rows={2}
              value={bullet.text}
              onChange={(event) => {
                const bullets = role.bullets.map((current, currentIndex) => (
                  currentIndex === bulletIndex
                    ? { ...current, text: event.target.value }
                    : current
                ));
                onChange({ ...role, bullets });
              }}
              placeholder="What you built, with what stack, and what changed."
            />
          </label>
        ))}
        <div className="app-onboarding-inline-actions">
          <button
            type="button"
            className="app-button app-button-secondary app-button-small"
            onClick={() => {
              const bulletIds = role.bullets.map((bullet) => bullet.id);
              onChange({
                ...role,
                bullets: [...role.bullets, createEmptyBullet(bulletIds)],
              });
            }}
          >
            Add bullet
          </button>
          {role.bullets.length > 1 ? (
            <button
              type="button"
              className="app-button app-button-secondary app-button-small"
              onClick={() => onChange({
                ...role,
                bullets: role.bullets.slice(0, -1),
              })}
            >
              Remove last bullet
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

type MoreStepProps = {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
};

const MoreStep = ({
  draft,
  onChange,
}: MoreStepProps) => {
  const addProject = () => {
    const ids = draft.projects.map((project) => project.id);
    onChange({
      projects: [...draft.projects, createEmptyProject(ids)],
    });
  };

  const updateProject = (
    index: number,
    patch: Partial<OnboardingDraft['projects'][number]>,
  ) => {
    onChange({
      projects: draft.projects.map((project, projectIndex) => (
        projectIndex === index ? { ...project, ...patch } : project
      )),
    });
  };

  const removeProject = (index: number) => {
    onChange({
      projects: draft.projects.filter((_, projectIndex) => projectIndex !== index),
    });
  };

  return (
    <div className="app-onboarding-stack">
      <div className="app-onboarding-grid">
        <label className="app-onboarding-field app-onboarding-field-wide">
          <span>Languages & frameworks</span>
          <input
            type="text"
            value={draft.skillLanguages}
            onChange={(event) => onChange({ skillLanguages: event.target.value })}
            placeholder="TypeScript, React, Node.js, Python"
          />
        </label>
        <label className="app-onboarding-field app-onboarding-field-wide">
          <span>Infrastructure & platform</span>
          <input
            type="text"
            value={draft.skillInfrastructure}
            onChange={(event) => onChange({ skillInfrastructure: event.target.value })}
            placeholder="REST APIs, SQL, Git, CI/CD, Docker"
          />
        </label>
        <label className="app-onboarding-field app-onboarding-field-wide">
          <span>Practices</span>
          <input
            type="text"
            value={draft.skillPractices}
            onChange={(event) => onChange({ skillPractices: event.target.value })}
            placeholder="Code review, testing, agile delivery"
          />
        </label>
      </div>

      <h3 className="app-onboarding-section-title">Education (optional)</h3>
      <div className="app-onboarding-grid">
        <label className="app-onboarding-field">
          <span>Institution</span>
          <input
            type="text"
            value={draft.educationInstitution}
            onChange={(event) => onChange({ educationInstitution: event.target.value })}
          />
        </label>
        <label className="app-onboarding-field">
          <span>Degree</span>
          <input
            type="text"
            value={draft.educationDegree}
            onChange={(event) => onChange({ educationDegree: event.target.value })}
          />
        </label>
        <label className="app-onboarding-field">
          <span>Period</span>
          <input
            type="text"
            value={draft.educationPeriod}
            onChange={(event) => onChange({ educationPeriod: event.target.value })}
            placeholder="2016 - 2020"
          />
        </label>
      </div>

      <h3 className="app-onboarding-section-title">Projects (optional)</h3>
      {draft.projects.map((project, index) => (
        <article
          key={project.id}
          className="app-onboarding-card"
        >
          <div className="app-onboarding-card-header">
            <h4 className="app-onboarding-subcard-title">Project {index + 1}</h4>
            <button
              type="button"
              className="app-button app-button-secondary app-button-small"
              onClick={() => removeProject(index)}
            >
              Remove
            </button>
          </div>
          <div className="app-onboarding-grid">
            <label className="app-onboarding-field">
              <span>Title</span>
              <input
                type="text"
                value={project.title}
                onChange={(event) => updateProject(index, { title: event.target.value })}
              />
            </label>
            <label className="app-onboarding-field app-onboarding-field-wide">
              <span>Description</span>
              <textarea
                rows={2}
                value={project.description}
                onChange={(event) => updateProject(index, { description: event.target.value })}
              />
            </label>
          </div>
        </article>
      ))}
      <button
        type="button"
        className="app-button app-button-secondary app-button-small"
        onClick={addProject}
      >
        Add project
      </button>
    </div>
  );
};

type ReviewStepProps = {
  master: ReturnType<typeof buildMasterFromOnboardingDraft>;
};

const ReviewStep = ({ master }: ReviewStepProps) => {
  return (
    <div className="app-onboarding-review">
      <p className="app-onboarding-review-intro">
        Check the basics below, then create your CV. You can edit versions and tailor for jobs afterward.
      </p>
      <dl className="app-onboarding-review-list">
        <div>
          <dt>Name</dt>
          <dd>{master.name}</dd>
        </div>
        <div>
          <dt>Headline</dt>
          <dd>{master.headline}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{master.contact.email}</dd>
        </div>
        <div>
          <dt>Experience</dt>
          <dd>{master.experience.length} job(s)</dd>
        </div>
        <div>
          <dt>Projects</dt>
          <dd>{master.projects.length} project(s)</dd>
        </div>
      </dl>
    </div>
  );
};
