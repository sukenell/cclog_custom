import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'fs';
import path from 'path';
import UploadSection from './UploadSection';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../core/locales/i18n.ts', () => ({
  __esModule: true,
  default: {
    language: 'ko',
    changeLanguage: jest.fn(),
  },
}));

jest.mock('../../v1/utils/FileUploader.js', () => () => (
  <input type="file" aria-label="file-upload" />
));

const t = (key) => ({
  'setting.title': '채팅 로그 커스텀',
  'setting.warning_txt': '코코포리아 공식로그 외에는 인식하지 않습니다',
  'setting.Howtouse': '사용법',
  'setting.select_lang': '언어 선택',
  'setting.room_log_1': '룸로그 불러오기',
  'setting.room_log_2': '(*룸 주소를 입력하세요)',
}[key] || key);

test('shows the v2 room log heading without the room URL prompt', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rootApi = createRoot(container);

  await act(async () => {
    rootApi.render(
      <UploadSection
        setFileContent={jest.fn()}
        setFileName={jest.fn()}
        t={t}
      />
    );
  });

  expect(container.textContent).toContain('룸로그 불러오기');
  expect(container.textContent).not.toContain('(*룸 주소를 입력하세요)');
  expect(container.textContent).not.toContain('언어 선택');
  expect(container.querySelector('#language-select')).toBeNull();
  expect(container.querySelector('h1')?.textContent).toBe(
    'CCFolia 채팅 로그 커스텀'
  );
  expect(container.querySelector('h2')?.textContent).toBe(
    '01. 룸로그 불러오기'
  );
  expect(container.querySelector('h3')).toBeNull();
  expect(container.querySelector('h4')).toBeNull();

  await act(async () => {
    rootApi.unmount();
  });
  container.remove();
});

test('declares Korean language and responsive UTF-8 document metadata', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'public/index.html'),
    'utf8'
  );
  const documentNode = new DOMParser().parseFromString(source, 'text/html');

  expect(documentNode.documentElement.lang).toBe('ko');
  expect(
    documentNode.querySelector('meta[charset]')?.getAttribute('charset')?.toLowerCase()
  ).toBe('utf-8');
  expect(
    documentNode.querySelector('meta[name="viewport"]')?.getAttribute('content')
  ).toBe('width=device-width, initial-scale=1');
});
