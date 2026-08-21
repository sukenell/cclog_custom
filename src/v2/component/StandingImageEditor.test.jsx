import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import StandingImageEditor from './StandingImageEditor';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const variants = [
  {
    id: 'casual',
    label: '평상복',
    url: 'https://example.com/alice-casual.png',
  },
  {
    id: 'battle',
    label: '전투',
    url: 'https://example.com/alice-battle.png',
  },
];

const setNativeValue = (element, value) => {
  const prototype =
    element.tagName === 'SELECT'
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  setter.call(element, value);
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

const renderEditor = (overrides = {}) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rootApi = createRoot(container);
  const props = {
    id: 'standing-image-editor-test',
    variants,
    activeVariantId: 'casual',
    currentUrl: 'https://example.com/current.png',
    characterName: '앨리스',
    allowedScopes: ['single', 'all'],
    onApplyVariant: jest.fn(),
    onApplyUrl: jest.fn(),
    onClear: jest.fn(),
    onCancel: jest.fn(),
    t: (value) => value,
    ...overrides,
  };

  act(() => {
    rootApi.render(<StandingImageEditor {...props} />);
  });

  return {
    container,
    props,
    cleanup: () => {
      act(() => rootApi.unmount());
      container.remove();
    },
  };
};

const buttonByText = (container, text) =>
  Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === text
  );

describe('StandingImageEditor', () => {
  test('uses labeled native controls, only single/all scopes, and focuses the first control', () => {
    const { container, cleanup } = renderEditor();

    try {
      const editor = container.querySelector('#standing-image-editor-test');
      const select = editor.querySelector('select');
      const selectLabel = editor.querySelector(`label[for="${select.id}"]`);
      const fieldset = editor.querySelector('fieldset');
      const radios = Array.from(fieldset.querySelectorAll('input[type="radio"]'));
      const urlInput = editor.querySelector('input[type="url"]');
      const urlLabel = editor.querySelector(`label[for="${urlInput.id}"]`);

      expect(editor.getAttribute('data-export-ignore')).toBe('true');
      expect(selectLabel).not.toBeNull();
      expect(selectLabel.textContent).toContain('의상');
      expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
        '@평상복 [기본]',
        '@전투',
      ]);
      expect(fieldset.querySelector('legend').textContent).toContain('적용 범위');
      expect(radios.map((radio) => radio.value)).toEqual(['single', 'all']);
      expect(radios[0].checked).toBe(true);
      expect(editor.textContent).toContain('이 대사만');
      expect(editor.textContent).toContain('앨리스 전체');
      expect(urlLabel).not.toBeNull();
      expect(urlInput.getAttribute('inputmode')).toBe('url');
      expect(urlInput.value).toBe('https://example.com/current.png');
      expect(Array.from(editor.querySelectorAll('button')).every(
        (button) => button.type === 'button'
      )).toBe(true);
      expect(editor.textContent).not.toMatch(/\d+\s*개 대사|대사에 적용/);
      expect(document.activeElement).toBe(select);
    } finally {
      cleanup();
    }
  });

  test('applies a selected variant with the current scope', () => {
    const { container, props, cleanup } = renderEditor();

    try {
      const select = container.querySelector('select');
      act(() => setNativeValue(select, 'battle'));
      act(() => buttonByText(container, '선택 이미지 적용').click());

      expect(props.onApplyVariant).toHaveBeenCalledWith({
        variantId: 'battle',
        url: 'https://example.com/alice-battle.png',
        scope: 'single',
      });
    } finally {
      cleanup();
    }
  });

  test('uses the same all scope for direct URL and clear actions', () => {
    const { container, props, cleanup } = renderEditor();

    try {
      const allRadio = container.querySelector('input[value="all"]');
      const urlInput = container.querySelector('input[type="url"]');

      act(() => allRadio.click());
      act(() => setNativeValue(urlInput, 'https://example.com/direct.png'));
      act(() => buttonByText(container, 'URL 적용').click());
      act(() => buttonByText(container, '이미지 비우기').click());

      expect(props.onApplyUrl).toHaveBeenCalledWith({
        url: 'https://example.com/direct.png',
        scope: 'all',
      });
      expect(props.onClear).toHaveBeenCalledWith({ scope: 'all' });
    } finally {
      cleanup();
    }
  });

  test('keeps an invalid absolute URL as a linked field error and does not apply it', () => {
    const { container, props, cleanup } = renderEditor();

    try {
      const urlInput = container.querySelector('input[type="url"]');
      act(() => setNativeValue(urlInput, '/relative/alice.png'));
      act(() => buttonByText(container, 'URL 적용').click());

      const alert = container.querySelector('[role="alert"]');
      expect(urlInput.value).toBe('/relative/alice.png');
      expect(urlInput.getAttribute('aria-invalid')).toBe('true');
      expect(urlInput.getAttribute('aria-describedby')).toBe(alert.id);
      expect(alert.textContent).toContain('http');
      expect(props.onApplyUrl).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  test('supports both the cancel button and Escape', () => {
    const onCancel = jest.fn();
    const { container, cleanup } = renderEditor({ onCancel });

    try {
      act(() => buttonByText(container, '취소').click());
      act(() => {
        container.firstChild.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
      });

      expect(onCancel).toHaveBeenCalledTimes(2);
    } finally {
      cleanup();
    }
  });
});
