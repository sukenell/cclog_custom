jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { buildMinimalExportCSS, removeMessageById } from './AppV2';

describe('AppV2 message deletion', () => {
  test('removes only the selected message id', () => {
    const messages = [
      { id: 'keep-1', text: '첫 번째' },
      { id: 'delete-me', text: '삭제 대상' },
      { id: 'keep-2', text: '두 번째' },
    ];

    expect(removeMessageById(messages, 'delete-me')).toEqual([
      { id: 'keep-1', text: '첫 번째' },
      { id: 'keep-2', text: '두 번째' },
    ]);
  });
});

describe('AppV2 export CSS', () => {
  test('keeps the exported other-message inner container spacing aligned with the preview', () => {
    const css = buildMinimalExportCSS();
    const otherRule = css.match(/\.message-container\.other\s*\{([^}]*)\}/);

    expect(otherRule).not.toBeNull();
    expect(otherRule[1]).toContain('background-color: transparent');
    expect(otherRule[1]).not.toMatch(/\bpadding\s*:/);
    expect(otherRule[1]).not.toMatch(/\bmargin\s*:/);
  });
});
