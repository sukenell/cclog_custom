jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AppV2, { buildMinimalExportCSS, removeMessageById } from './AppV2';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

describe('AppV2 localization', () => {
  test('renders Korean labels instead of translation keys', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    await act(async () => {
      rootApi.render(<AppV2 />);
    });

    expect(container.textContent).toContain('채팅 로그 커스텀');
    expect(container.textContent).toContain('룸로그 불러오기');
    expect(container.textContent).not.toContain('setting.title');
    expect(container.textContent).not.toContain('setting.room_log_1');

    await act(async () => {
      rootApi.unmount();
    });
    container.remove();
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
