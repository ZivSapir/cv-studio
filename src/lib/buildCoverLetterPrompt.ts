import { dump as stringifyYaml } from 'js-yaml';
import type { CvMaster, ResolvedCv } from '../types/cv';

type BuildCoverLetterPromptArgs = {
  master: CvMaster;
  resolvedCv: ResolvedCv;
  jobDescription: string;
  versionLabel?: string;
};

function buildResolvedCvForPrompt(resolvedCv: ResolvedCv): Record<string, unknown> {
  return {
    name: resolvedCv.name,
    headline: resolvedCv.headline,
    summary: resolvedCv.summary,
    experience: resolvedCv.experience.map((entry) => ({
      company: entry.company,
      location: entry.location,
      tenure: entry.tenure,
      roles: entry.roles.map((role) => ({
        title: role.title,
        bullets: role.bullets.map((bullet) => bullet.text.trim()),
      })),
    })),
    projects: resolvedCv.projects.map((project) => ({
      title: project.title,
      description: project.description.trim(),
    })),
    skills: resolvedCv.skills.map((skill) => ({
      label: skill.label,
      items: skill.items,
    })),
    education: {
      institution: resolvedCv.education.institution,
      entries: resolvedCv.education.entries.map((entry) => ({
        degree: entry.degree,
        period: entry.period,
        details: entry.details,
      })),
    },
  };
}

/**
 * BYO-AI prompt for a cover letter tied to one saved CV version.
 * Uses master facts + the resolved (tailored) CV so the letter matches this application.
 */
export function buildCoverLetterPrompt({
  master,
  resolvedCv,
  jobDescription,
  versionLabel,
}: BuildCoverLetterPromptArgs): string {
  const { applicantBrief, ...masterForPrompt } = master;
  const masterYaml = stringifyYaml(masterForPrompt, {
    lineWidth: 100,
    noRefs: true,
  });
  const tailoredYaml = stringifyYaml(buildResolvedCvForPrompt(resolvedCv), {
    lineWidth: 100,
    noRefs: true,
  });
  const briefBlock = applicantBrief?.trim()
    ? `
## Applicant brief (optional voice / extra context — do not invent beyond this + the CV)
${applicantBrief.trim()}
`
    : '';
  const versionHint = versionLabel?.trim()
    ? `Saved CV label: ${versionLabel.trim()}\n`
    : '';

  return `You are writing a job application cover letter.

## Job description
${jobDescription.trim()}

${versionHint}## Candidate master CV (YAML source of truth — do not invent facts)
\`\`\`yaml
${masterYaml}
\`\`\`

## This application's tailored CV (what this application emphasizes — align the letter here)
\`\`\`yaml
${tailoredYaml}
\`\`\`
${briefBlock}
## Task
Return ONLY the cover letter as plain text. Do not wrap it in markdown fences. Do not invent employers, titles, skills, metrics, tools, or years of experience that are not in the CV (or applicant brief). Job titles in the letter must match the CV exactly.

Match this job description and role type by emphasizing real evidence from the CV — different jobs, different emphasis, same facts.

Hard length cap: no longer than a short half-page letter (~250-300 words). Prefer cutting over expanding. Structure exactly like this:

1. Greeting — Dear {Company} Team, (or hiring manager if named in the JD)
2. One short opening paragraph — role, company interest, one honest bridge from background
3. Exactly four short labeled bullets mapping JD themes to real CV evidence, e.g.
   • Quantitative Foundation: …
   • Data-Driven Insights: …
   (Choose labels that fit THIS role; do not copy these example labels.)
4. One short closing paragraph — company-specific enthusiasm + what you would contribute
5. Sign-off — Thank you… / Sincerely, / {candidate name from CV}

Voice rules:
- Formal, confident, concise
- No em dashes; use a hyphen (-), comma, or colon
- If the JD requires something missing from the CV, omit it or frame an honest adjacent strength — never invent it, and never tell the reader you do not meet their requirements (no gap lists, no "upfront", no apologizing for fit; they judge from truthful evidence only)
- Do not claim business forecasting, FP&A, cloud certifications, or tools unless they appear in the CV/brief
- For this candidate: do not oversell SQL at Wix (familiar, few queries). Project SQL may be mentioned when relevant if framed as AI-assisted development, not solo expert SQL experience
`;
}

export function buildCoverLetterPdfTitle(
  name: string,
  versionLabel: string,
): string {
  const invalid = /[\\/:*?"<>|]/g;
  const role = versionLabel
    .replace(/\s*[-–—]\s*/g, ' - ')
    .trim();
  const title = `${name.trim()} - Application for ${role}`
    .replace(invalid, '')
    .replace(/\s+/g, ' ')
    .trim();

  return title || 'Cover letter';
}
