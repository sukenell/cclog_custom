import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FileUploader from './FileUploader';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const NativeFileReader = global.FileReader;

class MockFileReader {
  readAsText(file) {
    this.onload({
      target: {
        result: file.mockText,
      },
    });
  }
}

beforeEach(() => {
  global.FileReader = MockFileReader;
});

afterEach(() => {
  global.FileReader = NativeFileReader;
});

const t = (key) => ({
  'setting.room_input': '룸 정보 입력',
  'setting.file': '파일 선택',
  'setting.ok': '확인',
  'setting.loading': '로딩 중...',
}[key] || key);

test('gives every file picker a unique id and a translated or safe fallback label', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rootApi = createRoot(container);

  await act(async () => {
    rootApi.render(
      <>
        <FileUploader
          t={t}
          setFileContent={jest.fn()}
          setFileName={jest.fn()}
        />
        <FileUploader
          t={(key) => key}
          setFileContent={jest.fn()}
          setFileName={jest.fn()}
        />
      </>
    );
  });

  const inputs = Array.from(container.querySelectorAll('input[type="file"]'));
  const ids = inputs.map((input) => input.id);
  const labels = inputs.map((input) =>
    container.querySelector(`label[for="${input.id}"]`)
  );

  expect(ids.every(Boolean)).toBe(true);
  expect(new Set(ids).size).toBe(inputs.length);
  expect(labels.map((label) => label?.textContent)).toEqual([
    '파일 선택',
    '파일 선택',
  ]);

  await act(async () => {
    rootApi.unmount();
  });
  container.remove();
});

test('renders the confirm button immediately next to the file picker without room text', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rootApi = createRoot(container);

  await act(async () => {
    rootApi.render(
      <FileUploader
        t={t}
        setFileContent={jest.fn()}
        setFileName={jest.fn()}
      />
    );
  });

  const fileInput = container.querySelector('input[type="file"]');
  const confirmButton = container.querySelector('button');

  expect(container.querySelectorAll('input[type="file"]')).toHaveLength(1);
  expect(container.querySelector('input[type="text"]')).toBeNull();
  expect(confirmButton?.textContent).toBe('확인');
  expect(fileInput?.nextElementSibling).toBe(confirmButton);
  expect(container.textContent).not.toContain('룸 정보 입력');

  await act(async () => {
    rootApi.unmount();
  });
  container.remove();
});

test('commits the selected file only after the confirm button is clicked', async () => {
  const setFileContent = jest.fn();
  const setFileName = jest.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rootApi = createRoot(container);

  await act(async () => {
    rootApi.render(
      <FileUploader
        t={t}
        setFileContent={setFileContent}
        setFileName={setFileName}
      />
    );
  });

  const fileInput = container.querySelector('input[type="file"]');
  const confirmButton = container.querySelector('button');
  const file = new File(['ignored by mock'], 'session.html', { type: 'text/html' });
  Object.defineProperty(file, 'mockText', {
    value: '<p><span>[main]</span> <span>KP</span> : <span>첫 대사</span></p>',
  });
  Object.defineProperty(fileInput, 'files', {
    value: [file],
  });

  await act(async () => {
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  expect(setFileContent).not.toHaveBeenCalled();
  expect(setFileName).not.toHaveBeenCalled();

  await act(async () => {
    confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(setFileContent).toHaveBeenCalledWith(file.mockText);
  expect(setFileName).toHaveBeenCalledWith('session.html');

  await act(async () => {
    rootApi.unmount();
  });
  container.remove();
});
