import { describe, expect, it } from 'vitest';
import { parseCoverLetter } from './parseCoverLetter';

describe('parseCoverLetter', () => {
  it('splits inline markdown bullets chained in one paragraph onto separate items and strips bold', () => {
    // Regression case: a real Gemini reply chained "* **Label**: text" bullets inline within one
    // paragraph instead of one per line, so the literal "**"/"*" markers printed verbatim.
    const raw = [
      'Dear Deloitte Team,',
      '',
      'I am writing to express my strong interest in the Full Stack Developer position.',
      '',
      '* **Full Stack Development & Scalable Architectures**: With strong backend experience in Python. '
        + '* **Advanced AI Integration & LLM Applications**: I possess hands-on experience with LangChain. '
        + '* **AI-Assisted Development & Productivity**: At Wix.com, I accelerated development. '
        + '* **Frontend Expertise & Design Systems**: I have a solid foundation in React.',
      '',
      "I'd love to be considered for this role.",
      '',
      'Sincerely,',
      'Ziv Sapir',
    ].join('\n');

    const parsed = parseCoverLetter(raw);
    const bulletsBlock = parsed.body.find((block) => block.kind === 'bullets');

    expect(bulletsBlock?.kind).toBe('bullets');
    if (bulletsBlock?.kind !== 'bullets') {
      throw new Error('expected a bullets block');
    }

    expect(bulletsBlock.items).toHaveLength(4);
    expect(bulletsBlock.items[0]).toEqual({
      label: 'Full Stack Development & Scalable Architectures',
      text: 'With strong backend experience in Python.',
    });
    expect(bulletsBlock.items[3]).toEqual({
      label: 'Frontend Expertise & Design Systems',
      text: 'I have a solid foundation in React.',
    });

    // No literal markdown markers should survive anywhere in the parsed output.
    const allText = JSON.stringify(parsed);
    expect(allText).not.toContain('**');
    expect(allText.includes('*')).toBe(false);
  });

  it('still parses plain hyphen bullets on their own line (no markdown involved)', () => {
    const raw = [
      'Dear Hiring Team,',
      '',
      'Short opening paragraph.',
      '',
      '- Quantitative Foundation: built pipelines.\n- Data-Driven Insights: shipped features.',
      '',
      "I'd love to be considered for this role.",
      '',
      'Sincerely,',
      'Ziv Sapir',
    ].join('\n');

    const parsed = parseCoverLetter(raw);
    const bulletsBlock = parsed.body.find((block) => block.kind === 'bullets');

    expect(bulletsBlock?.kind).toBe('bullets');
    if (bulletsBlock?.kind !== 'bullets') {
      throw new Error('expected a bullets block');
    }

    expect(bulletsBlock.items).toEqual([
      { label: 'Quantitative Foundation', text: 'built pipelines.' },
      { label: 'Data-Driven Insights', text: 'shipped features.' },
    ]);
  });

  it('strips inline bold from ordinary paragraphs even without a bullet list', () => {
    const raw = [
      'Dear Team,',
      '',
      'I have **strong** experience in TypeScript and React.',
      '',
      'Sincerely,',
      'Ziv Sapir',
    ].join('\n');

    const parsed = parseCoverLetter(raw);
    const paragraph = parsed.body.find((block) => block.kind === 'paragraph');

    expect(paragraph).toEqual({
      kind: 'paragraph',
      text: 'I have strong experience in TypeScript and React.',
    });
  });
});
