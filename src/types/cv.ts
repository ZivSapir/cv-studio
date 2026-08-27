export type CvBullet = {
  id: string;
  text: string;
  tags?: string[];
};

export type CvRole = {
  title: string;
  internalPeriod?: string;
  bullets: CvBullet[];
};

export type CvExperience = {
  id: string;
  company: string;
  location: string;
  tenure: string;
  roles: CvRole[];
};

export type CvProject = {
  id: string;
  title: string;
  description: string;
  tags?: string[];
};

export type CvSkillCategory = {
  id: string;
  label: string;
  items: string;
};

export type CvEducationEntry = {
  degree: string;
  period: string;
  details?: string[];
};

export type CvEducation = {
  institution: string;
  entries: CvEducationEntry[];
};

export type CvContactLink = {
  label: string;
  url: string;
};

export type CvContact = {
  phone: string;
  email: string;
  linkedin: CvContactLink;
  portfolio: CvContactLink;
};

export type CvMaster = {
  name: string;
  headline: string;
  summary: string;
  contact: CvContact;
  experience: CvExperience[];
  projects: CvProject[];
  skills: CvSkillCategory[];
  education: CvEducation;
  /** Optional voice / extra context for cover-letter prompts (not shown on the A4 CV). */
  applicantBrief?: string;
};

export type CvVersion = {
  id: string;
  label: string;
  extends: 'master';
  kind?: 'base' | 'saved';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  headline?: string;
  summary?: string;
  hiddenBulletIds?: string[];
  hiddenProjectIds?: string[];
  bulletOverrides?: Record<string, string>;
  projectOverrides?: Record<string, { title?: string; description?: string }>;
  experienceAdditions?: CvExperience[];
  experienceOrder?: string[];
  experienceBulletOrder?: Record<string, string[]>;
  projectOrder?: string[];
  skillCategoryOrder?: string[];
  skillOverrides?: Record<
    string,
    {
      label?: string;
      items?: string;
    }
  >;
  roleTitleOverrides?: Record<string, string>;
  projectsSectionTitle?: string;
  footerNote?: string;
  education?: CvEducation;
  /** Optional cover letter for this saved application only (not on the A4 CV). */
  coverLetter?: string;
  /** Short personal note for email / LinkedIn / application form (not on the A4 CV). */
  personalNote?: string;
  /**
   * Job description for this saved application (not on the A4 CV).
   * Prefills AI Tailor + Cover letter so you do not re-paste after reload.
   */
  jobDescription?: string;
};

export type PromoteToBaseTarget =
  | {
      mode: 'create';
      label: string;
    }
  | {
      mode: 'replace';
      targetBaseId: string;
    };

export type CvLibrary = {
  bases: CvVersion[];
  compareBaseId: string;
  saved: CvVersion[];
};

export type CvDiffLine = {
  type: 'context' | 'remove' | 'add';
  content: string;
};

export type CvDiffSection = {
  field: string;
  lines: CvDiffLine[];
};

/** @deprecated Use CvDiffSection — kept for gradual migration */
export type CvDiffEntry = CvDiffSection;

export type ResolvedCv = {
  versionId: string;
  versionLabel: string;
  name: string;
  headline: string;
  summary: string;
  contact: CvContact;
  experience: CvExperience[];
  projects: CvProject[];
  skills: CvSkillCategory[];
  education: CvEducation;
  projectsSectionTitle: string;
  footerNote?: string;
};
