import type {
  OnboardingBulletDraft,
  OnboardingDraft,
  OnboardingExperienceDraft,
  OnboardingProjectDraft,
  OnboardingRoleDraft,
} from './types';

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

function createId(prefix: string, label: string, existingIds: string[]): string {
  const base = `${prefix}-${slugify(label)}`;
  if (!existingIds.includes(base)) {
    return base;
  }

  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

export function createEmptyBullet(existingIds: string[]): OnboardingBulletDraft {
  const id = createId('bullet', 'item', existingIds);
  return { id, text: '' };
}

export function createEmptyRole(existingIds: string[]): OnboardingRoleDraft {
  const id = createId('role', 'role', existingIds);
  return {
    id,
    title: '',
    internalPeriod: '',
    bullets: [createEmptyBullet([])],
  };
}

export function createEmptyExperience(existingIds: string[]): OnboardingExperienceDraft {
  const id = createId('exp', 'company', existingIds);
  return {
    id,
    company: '',
    location: '',
    tenure: '',
    roles: [createEmptyRole([])],
  };
}

export function createEmptyProject(existingIds: string[]): OnboardingProjectDraft {
  const id = createId('project', 'project', existingIds);
  return {
    id,
    title: '',
    description: '',
  };
}

export function createDefaultOnboardingDraft(): OnboardingDraft {
  return {
    name: '',
    headline: '',
    summary: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    portfolioUrl: '',
    experience: [createEmptyExperience([])],
    skillLanguages: '',
    skillInfrastructure: '',
    skillPractices: '',
    educationInstitution: '',
    educationDegree: '',
    educationPeriod: '',
    projects: [],
  };
}

export function labelFromUrl(url: string, fallback: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '');
  } catch {
    return trimmed;
  }
}

export function validateOnboardingDraft(draft: OnboardingDraft): string | null {
  if (!draft.name.trim()) {
    return 'Name is required.';
  }

  if (!draft.headline.trim()) {
    return 'Headline is required.';
  }

  if (!draft.summary.trim()) {
    return 'Summary is required.';
  }

  if (!draft.email.trim()) {
    return 'Email is required.';
  }

  return validateOnboardingExperience(draft.experience);
}

export function validateOnboardingExperience(
  experience: OnboardingExperienceDraft[],
): string | null {
  const hasExperience = experience.some((entry) => {
    if (!entry.company.trim() || !entry.tenure.trim()) {
      return false;
    }

    return entry.roles.some((role) => {
      if (!role.title.trim()) {
        return false;
      }

      return role.bullets.some((bullet) => bullet.text.trim());
    });
  });

  if (!hasExperience) {
    return 'Add at least one job with a role title and one bullet.';
  }

  return null;
}
