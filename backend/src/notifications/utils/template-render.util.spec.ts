import { renderTemplate } from './template-render.util';

describe('renderTemplate', () => {
  it('replaces placeholders with context values', () => {
    const result = renderTemplate(
      'Hi {{customerName}}, your {{planName}} trial ends {{expiryDate}}.',
      {
        customerName: 'Jane',
        planName: 'Gold',
        expiryDate: 'September 17, 2026',
      },
    );

    expect(result).toBe('Hi Jane, your Gold trial ends September 17, 2026.');
  });

  it('leaves unknown placeholders empty', () => {
    expect(renderTemplate('Hello {{name}}', {})).toBe('Hello ');
  });
});
