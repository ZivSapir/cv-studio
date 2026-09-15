import type { CvMaster, CvVersion } from '../types/cv';

/** Minimal, structurally-valid master CV used as a base fixture across unit tests. */
export function makeMaster(overrides: Partial<CvMaster> = {}): CvMaster {
  return {
    name: 'Jordan Example',
    headline: 'Software Engineer',
    summary: 'Builds things.',
    contact: {
      phone: '+1-555-0100',
      email: 'jordan@example.com',
      linkedin: { label: 'linkedin', url: 'https://linkedin.com/in/jordan' },
      portfolio: { label: 'portfolio', url: 'https://jordan.example.com' },
    },
    experience: [
      {
        id: 'acme',
        company: 'Acme Corp',
        location: 'Remote',
        tenure: '2020 - Present',
        roles: [
          {
            title: 'Engineer',
            bullets: [
              { id: 'acme-feature', text: 'Shipped the feature.', tags: ['feature'] },
              { id: 'acme-quality', text: 'Wrote the tests.', tags: ['testing'] },
            ],
          },
        ],
      },
    ],
    projects: [
      { id: 'project-alpha', title: 'Project Alpha', description: 'A side project.' },
    ],
    skills: [
      { id: 'languages', label: 'Languages', items: 'TypeScript, Python' },
    ],
    education: {
      institution: 'State University',
      entries: [{ degree: 'B.Sc.', period: '2016 - 2020' }],
    },
    ...overrides,
  };
}

/** Minimal, structurally-valid CV version (extends the fixture master). */
export function makeVersion(overrides: Partial<CvVersion> = {}): CvVersion {
  return {
    id: 'acme-role',
    label: 'Acme Role',
    extends: 'master',
    ...overrides,
  };
}
