import type { CvMaster } from '../../types/cv';
import type { OnboardingDraft } from './types';
import { labelFromUrl } from './defaultDraft';

export function buildMasterFromOnboardingDraft(draft: OnboardingDraft): CvMaster {
  const linkedinUrl = normalizeUrl(draft.linkedinUrl);
  const portfolioUrl = normalizeUrl(draft.portfolioUrl);

  return {
    name: draft.name.trim(),
    headline: draft.headline.trim(),
    summary: draft.summary.trim(),
    contact: {
      phone: draft.phone.trim() || '+1-000-000-0000',
      email: draft.email.trim(),
      linkedin: {
        label: linkedinUrl
          ? `LinkedIn / ${labelFromUrl(linkedinUrl, 'profile')}`
          : 'LinkedIn',
        url: linkedinUrl || 'https://www.linkedin.com/',
      },
      portfolio: {
        label: portfolioUrl
          ? labelFromUrl(portfolioUrl, 'portfolio')
          : 'Portfolio',
        url: portfolioUrl || 'https://example.com/',
      },
    },
    experience: draft.experience
      .filter((entry) => entry.company.trim())
      .map((entry) => ({
        id: entry.id,
        company: entry.company.trim(),
        location: entry.location.trim() || 'Remote',
        tenure: entry.tenure.trim(),
        roles: entry.roles
          .filter((role) => role.title.trim())
          .map((role) => ({
            title: role.title.trim(),
            internalPeriod: role.internalPeriod.trim() || undefined,
            bullets: role.bullets
              .filter((bullet) => bullet.text.trim())
              .map((bullet) => ({
                id: bullet.id,
                text: bullet.text.trim(),
              })),
          })),
      }))
      .filter((entry) => entry.roles.length > 0),
    projects: draft.projects
      .filter((project) => project.title.trim() && project.description.trim())
      .map((project) => ({
        id: project.id,
        title: project.title.trim(),
        description: project.description.trim(),
      })),
    skills: [
      {
        id: 'languages',
        label: 'Languages & Frameworks:',
        items: draft.skillLanguages.trim() || 'Add your languages and frameworks.',
      },
      {
        id: 'infrastructure',
        label: 'Infrastructure & Platform:',
        items: draft.skillInfrastructure.trim() || 'Add your infrastructure skills.',
      },
      {
        id: 'practices',
        label: 'Practices:',
        items: draft.skillPractices.trim() || 'Add your practices.',
      },
    ],
    education: draft.educationInstitution.trim() && draft.educationDegree.trim()
      ? {
          institution: draft.educationInstitution.trim(),
          entries: [
            {
              degree: draft.educationDegree.trim(),
              period: draft.educationPeriod.trim() || 'Year – Year',
            },
          ],
        }
      : {
          institution: 'Education',
          entries: [],
        },
  };
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}
