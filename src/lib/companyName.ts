/**
 * Guesses the employer name from a pasted job description, so a new saved CV's default
 * title can include it (keeping titles distinct across applications instead of colliding
 * on "<role> copy"). This is a best-effort heuristic over freeform text, not a parser -
 * callers must let the user review/edit the result before it is saved.
 */

const ATS_DOMAINS = new Set([
  'linkedin', 'indeed', 'greenhouse', 'lever', 'workday', 'breezy',
  'smartrecruiters', 'bamboohr', 'jobvite', 'myworkdayjobs', 'wellfound',
  'glassdoor', 'ashbyhq', 'recruitee', 'personio', 'comeet', 'workable',
  'ziprecruiter', 'monster', 'gmail', 'google', 'outlook',
]);

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'from', 'into', 'onto',
  'about', 'you', 'your', 'yours', 'we', 'our', 'ours', 'us', 'they', 'their',
  'them', 'i', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'as', 'at', 'by', 'in', 'of', 'on', 'to', 'if', 'so',
  'not', 'no', 'yes', 'all', 'more', 'here', 'there', 'who', 'what', 'when',
  'where', 'why', 'how', 'it', 'its', 'will', 'would', 'can', 'could',
  'should', 'must', 'may', 'might', 'join', 'team', 'role', 'position',
  'company', 'job', 'description', 'requirements', 'responsibilities',
  'apply', 'visit', 'information', 'tel', 'aviv', 'israel', 'remote',
  'hybrid', 'onsite', 'full', 'time', 'part', 'years', 'experience',
  'engineer', 'engineering', 'developer', 'software', 'backend', 'frontend',
  'senior', 'junior', 'lead', 'manager', 'strong', 'solid', 'ability',
  'skills', 'work', 'working', 'own', 'solve', 'impact',
  // Common tech acronyms: short, ALL-CAPS, and often repeated more than the employer's own
  // name in an AI/tech job description, so they'd otherwise win the frequency count.
  'ai', 'ml', 'llm', 'llms', 'genai', 'api', 'apis', 'sdk', 'saas', 'rag',
  'ui', 'ux', 'qa', 'hr', 'it', 'ats', 'ceo', 'cto', 'cfo', 'coo', 'vp',
  'crm', 'erp', 'b2b', 'b2c',
]);

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function extractCompanyName(
  jobDescription: string | undefined | null,
): string | null {
  const text = jobDescription?.trim();

  if (!text) {
    return null;
  }

  const domainMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.(?:com|io|ai|co|net|org|dev)\b/i,
  );

  if (domainMatch) {
    const domain = domainMatch[1].toLowerCase();

    if (domain.length >= 2 && !ATS_DOMAINS.has(domain)) {
      return capitalize(domain);
    }
  }

  // "Morning is looking for a Junior Developer" names the employer once, while section
  // headings like "Data Fluency" repeat a common word. Prefer that sentence over frequency.
  const lookingForMatch = text.match(/\b([A-Z][a-zA-Z0-9]{1,})\s+is\s+looking\s+for\b/);

  if (lookingForMatch && !STOPWORDS.has(lookingForMatch[1].toLowerCase())) {
    return lookingForMatch[1];
  }

  const words = text.match(/\b[A-Z][a-zA-Z0-9]{1,}\b/g) ?? [];
  const counts = new Map<string, number>();

  for (const word of words) {
    if (STOPWORDS.has(word.toLowerCase())) {
      continue;
    }

    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 1;

  for (const [word, count] of counts) {
    if (count > bestCount) {
      best = word;
      bestCount = count;
    }
  }

  return best;
}

/**
 * Builds a default title for a new saved CV, leading with the guessed company name so
 * repeated saves don't all collide on "<label> copy" and stay easy to tell apart at a
 * glance in the version list ("<Company> - <label>", matching every other saved CV's
 * naming). Falls back to the previous "<label> copy" convention when no company can be
 * guessed, or the label already names it.
 */
const VERSION_LABEL_SEPARATOR = /\s+[-–—]\s+/;

/**
 * Company prefix already stored on a version label ("Morning - Junior Developer").
 * The PDF filename uses this so it cannot disagree with the name in the version list.
 * Labels with no dash separator have no company prefix.
 */
export function companyFromVersionLabel(label: string | undefined | null): string | null {
  const text = label?.trim();

  if (!text) {
    return null;
  }

  const separatorAt = text.search(VERSION_LABEL_SEPARATOR);

  if (separatorAt <= 0) {
    return null;
  }

  const company = text.slice(0, separatorAt).trim();

  return company.length >= 2 ? company : null;
}

/**
 * Company for the saved-file title. Prefer the list label, which is the name already
 * chosen for this CV. Guess from the job text only when the label has no company prefix.
 */
export function companyForSavedFile(
  versionLabel: string | undefined | null,
  jobDescription: string | undefined | null,
): string | null {
  return companyFromVersionLabel(versionLabel) ?? extractCompanyName(jobDescription);
}

export function buildSaveCopyDefaultLabel(
  sourceLabel: string,
  jobDescription: string | undefined | null,
): string {
  const company = extractCompanyName(jobDescription);

  if (!company || sourceLabel.toLowerCase().includes(company.toLowerCase())) {
    return `${sourceLabel} copy`;
  }

  return `${company} - ${sourceLabel}`;
}
