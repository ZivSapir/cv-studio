export type OnboardingBulletDraft = {
  id: string;
  text: string;
};

export type OnboardingRoleDraft = {
  id: string;
  title: string;
  internalPeriod: string;
  bullets: OnboardingBulletDraft[];
};

export type OnboardingExperienceDraft = {
  id: string;
  company: string;
  location: string;
  tenure: string;
  roles: OnboardingRoleDraft[];
};

export type OnboardingProjectDraft = {
  id: string;
  title: string;
  description: string;
};

export type OnboardingDraft = {
  name: string;
  headline: string;
  summary: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  portfolioUrl: string;
  experience: OnboardingExperienceDraft[];
  skillLanguages: string;
  skillInfrastructure: string;
  skillPractices: string;
  educationInstitution: string;
  educationDegree: string;
  educationPeriod: string;
  projects: OnboardingProjectDraft[];
};

export type OnboardingStep = 'basics' | 'experience' | 'more' | 'review';
