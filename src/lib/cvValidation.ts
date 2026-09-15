import type { CvMaster, CvVersion } from '../types/cv';
import type { CvBackup } from './cvRepository/types';

export class CvValidationError extends Error {}

function fail(message: string): never {
  throw new CvValidationError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`"${path}" must be an object.`);
  }

  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    fail(`"${path}" must be a string.`);
  }

  return value;
}

function requireNonEmptyString(value: unknown, path: string): string {
  const str = requireString(value, path);

  if (!str.trim()) {
    fail(`"${path}" cannot be empty.`);
  }

  return str;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(`"${path}" must be a list.`);
  }

  return value;
}

function validateBullet(value: unknown, path: string): void {
  const bullet = requireRecord(value, path);
  requireNonEmptyString(bullet.id, `${path}.id`);
  requireString(bullet.text, `${path}.text`);
}

function validateRole(value: unknown, path: string): void {
  const role = requireRecord(value, path);
  requireString(role.title, `${path}.title`);
  requireArray(role.bullets, `${path}.bullets`).forEach((bullet, index) =>
    validateBullet(bullet, `${path}.bullets[${index}]`));
}

/** Also used to validate `experienceAdditions` on a saved/base CV version. */
export function validateCvExperience(value: unknown, path: string): void {
  const experience = requireRecord(value, path);
  requireNonEmptyString(experience.id, `${path}.id`);
  requireString(experience.company, `${path}.company`);
  requireArray(experience.roles, `${path}.roles`).forEach((role, index) =>
    validateRole(role, `${path}.roles[${index}]`));
}

function validateProject(value: unknown, path: string): void {
  const project = requireRecord(value, path);
  requireNonEmptyString(project.id, `${path}.id`);
  requireString(project.title, `${path}.title`);
  requireString(project.description, `${path}.description`);
}

function validateSkillCategory(value: unknown, path: string): void {
  const skill = requireRecord(value, path);
  requireNonEmptyString(skill.id, `${path}.id`);
  requireString(skill.label, `${path}.label`);
  requireString(skill.items, `${path}.items`);
}

/** Also used to validate a version's `education` override. */
export function validateCvEducation(value: unknown, path: string): void {
  const education = requireRecord(value, path);
  requireString(education.institution, `${path}.institution`);
  requireArray(education.entries, `${path}.entries`);
}

function validateContact(value: unknown, path: string): void {
  const contact = requireRecord(value, path);
  requireString(contact.phone, `${path}.phone`);
  requireString(contact.email, `${path}.email`);
}

/**
 * Verifies every field `mergeCvVersion`/`CvDocument` unconditionally reads off a master CV is
 * present and the right shape, so a malformed import fails loudly here instead of crashing the
 * preview with no recovery path later.
 */
export function validateCvMaster(value: unknown): CvMaster {
  const master = requireRecord(value, 'master');
  requireNonEmptyString(master.name, 'name');
  requireString(master.headline, 'headline');
  requireString(master.summary, 'summary');
  validateContact(master.contact, 'contact');
  requireArray(master.experience, 'experience').forEach((entry, index) =>
    validateCvExperience(entry, `experience[${index}]`));
  requireArray(master.projects, 'projects').forEach((entry, index) =>
    validateProject(entry, `projects[${index}]`));
  requireArray(master.skills, 'skills').forEach((entry, index) =>
    validateSkillCategory(entry, `skills[${index}]`));
  validateCvEducation(master.education, 'education');

  return master as unknown as CvMaster;
}

/**
 * Guards only the CvVersion fields that are read the same unchecked way master's are
 * (`experienceAdditions`, `education`) and can crash `mergeCvVersion`/`CvDocument` if malformed.
 * Deliberately does not require `id`/`label` — callers that accept raw AI replies (where a
 * missing id/label is a normal, separately-handled case) use this before import.
 */
export function validateCvVersionSafeFields(value: unknown, path = 'version'): CvVersion {
  const version = requireRecord(value, path);

  if (version.experienceAdditions !== undefined) {
    requireArray(version.experienceAdditions, `${path}.experienceAdditions`).forEach(
      (entry, index) => validateCvExperience(entry, `${path}.experienceAdditions[${index}]`),
    );
  }

  if (version.education !== undefined) {
    validateCvEducation(version.education, `${path}.education`);
  }

  return version as unknown as CvVersion;
}

/** Full check for already-persisted versions (backup restore) where id/label are load-bearing. */
export function validateCvVersion(value: unknown, path = 'version'): CvVersion {
  const version = requireRecord(value, path);
  requireNonEmptyString(version.id, `${path}.id`);
  requireString(version.label, `${path}.label`);

  return validateCvVersionSafeFields(version, path);
}

export function validateCvBackup(value: unknown): CvBackup {
  const backup = requireRecord(value, 'backup');

  if (backup.version !== 1) {
    fail('Unsupported backup file — expected version: 1.');
  }

  const master = validateCvMaster(backup.master);
  const bases = requireArray(backup.bases, 'bases');
  bases.forEach((entry, index) => validateCvVersion(entry, `bases[${index}]`));
  const saved = backup.saved === undefined ? [] : requireArray(backup.saved, 'saved');
  saved.forEach((entry, index) => validateCvVersion(entry, `saved[${index}]`));

  return {
    version: 1,
    exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : new Date().toISOString(),
    master,
    bases: bases as CvVersion[],
    saved: saved as CvVersion[],
  };
}
