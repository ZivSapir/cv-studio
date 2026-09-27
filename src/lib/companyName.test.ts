import { describe, expect, it } from 'vitest';
import {
  buildSaveCopyDefaultLabel,
  companyForSavedFile,
  companyFromVersionLabel,
  extractCompanyName,
} from './companyName';

describe('extractCompanyName', () => {
  it('prefers the employer domain when the JD links to its own site', () => {
    const jd = [
      'Backend Engineer',
      'Tel Aviv',
      '',
      'Gong harnesses the power of AI to transform how revenue teams win. The Gong Revenue AI',
      'Operating System unifies data, insights, and workflows into a single, trusted system.',
      '',
      'For more information, visit www.gong.io.',
      "At Gong, you will join a company built on innovative products.",
    ].join('\n');

    expect(extractCompanyName(jd)).toBe('Gong');
  });

  it('ignores job-board/ATS domains and falls back to word frequency', () => {
    const jd = [
      'Apply on our page: jobs.lever.co/acme',
      '',
      'Acme is hiring a Software Engineer. At Acme, engineers own their features end to end.',
      'Acme believes in shipping fast.',
    ].join('\n');

    expect(extractCompanyName(jd)).toBe('Acme');
  });

  it('ignores repeated tech acronyms in favor of the employer name', () => {
    const jd = [
      'About Jeen AI Boost',
      'Ready to start your career in AI?',
      '',
      'Jeen AI Boost is our fast-track hiring experience for Junior AI Solution Engineers.',
      "You'll get to know Jeen, meet our team, and gain hands-on experience with LLMs, RAG, and APIs.",
      "If you're excited about AI, we'd love to meet you.",
    ].join('\n');

    expect(extractCompanyName(jd)).toBe('Jeen');
  });

  it('prefers "X is looking for" over a repeated section word', () => {
    const jd = [
      'Junior Developer – Issue Resolution',
      'R&D',
      '',
      'Morning is looking for a Junior Developer to resolve ongoing issues.',
      '',
      'Data & Monitoring Tasks: keep the platform running.',
      'Data Fluency: comfortable working hands-on with data.',
      'Data-Driven Decision Making: decide from data rather than assumptions.',
    ].join('\n');

    expect(extractCompanyName(jd)).toBe('Morning');
  });

  it('returns null for text with no repeated proper noun or domain', () => {
    const jd = 'We are looking for a software engineer with strong analytical skills.';

    expect(extractCompanyName(jd)).toBeNull();
  });

  it('returns null for empty or missing input', () => {
    expect(extractCompanyName('')).toBeNull();
    expect(extractCompanyName(undefined)).toBeNull();
    expect(extractCompanyName(null)).toBeNull();
  });
});

describe('buildSaveCopyDefaultLabel', () => {
  it('appends the guessed company to the source label', () => {
    const jd = 'Backend Engineer at Gong. Visit www.gong.io to learn more about Gong.';

    expect(buildSaveCopyDefaultLabel('Full-Stack & AI CV', jd)).toBe(
      'Gong - Full-Stack & AI CV',
    );
  });

  it('falls back to the "copy" suffix when no company can be guessed', () => {
    expect(buildSaveCopyDefaultLabel('Full-Stack & AI CV', '')).toBe(
      'Full-Stack & AI CV copy',
    );
    expect(buildSaveCopyDefaultLabel('Full-Stack & AI CV', undefined)).toBe(
      'Full-Stack & AI CV copy',
    );
  });

  it('does not double-append a company name already present in the label', () => {
    const jd = 'Backend Engineer at Gong. Visit www.gong.io to learn more about Gong.';

    expect(buildSaveCopyDefaultLabel('Gong - Backend Engineer', jd)).toBe(
      'Gong - Backend Engineer copy',
    );
  });
});

describe('companyFromVersionLabel', () => {
  it('reads the company prefix before a hyphen or dash', () => {
    expect(companyFromVersionLabel('Morning - Junior Developer, Issue Resolution')).toBe(
      'Morning',
    );
    expect(companyFromVersionLabel('CHEQ — AI Engineer (Data & AI)')).toBe('CHEQ');
    expect(companyFromVersionLabel('Zota — Junior Data Scientist')).toBe('Zota');
  });

  it('returns null when the label has no company prefix', () => {
    expect(companyFromVersionLabel('Full-Stack & AI CV')).toBeNull();
    expect(companyFromVersionLabel('SRE Developer')).toBeNull();
    expect(companyFromVersionLabel('')).toBeNull();
    expect(companyFromVersionLabel(undefined)).toBeNull();
  });
});

describe('companyForSavedFile', () => {
  it('uses the list label even when the job text would guess a different word', () => {
    const jd = [
      'Junior Developer, Issue Resolution',
      'Data Fluency: work with data.',
      'Data & Monitoring Tasks: keep the platform running.',
      'Data-Driven Decision Making: decide from data.',
    ].join('\n');

    expect(extractCompanyName(jd)).toBe('Data');
    expect(
      companyForSavedFile('Morning - Junior Developer, Issue Resolution', jd),
    ).toBe('Morning');
  });

  it('falls back to the job text when the label has no company prefix', () => {
    const jd = 'Backend Engineer at Gong. Visit www.gong.io.';

    expect(companyForSavedFile('Full-Stack & AI CV', jd)).toBe('Gong');
  });
});
