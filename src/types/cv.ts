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
  projectOverrides?: Record<string, { title?: string; description?: string }>;
  experienceAdditions?: CvExperience[];
  experienceOrder?: string[];
  experienceBulletOrder?: Record<string, string[]>;
  projectOrder?: string[];
  skillCategoryOrder?: string[];
  education?: CvEducation;
};

export type CvLibrary = {
  bases: CvVersion[];
  compareBaseId: string;
  saved: CvVersion[];
};

export type CvDiffEntry = {
  field: string;
  base: string;
  compare: string;
};

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
};
