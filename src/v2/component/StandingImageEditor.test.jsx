import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createInstance } from 'i18next';
import StandingImageEditor from './StandingImageEditor';
import translationEN from '../../core/locales/en/translation.json';
import translationJP from '../../core/locales/jp/translation.json';
import translationKO from '../../core/locales/ko/translation.json';
import translationZH from '../../core/locales/zh/translation.json';

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

const createTranslator = (language, translation) => {
  const i18n = createInstance();
  i18n.init({
    resources: { [language]: { translation } },
    lng: language,
    fallbackLng: false,
    initImmediate: false,
    interpolation: { escapeValue: false },
  });
  return i18n.t.bind(i18n);
};

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
    allowedScopes: ['single', 'fromHere', 'all'],
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
  test('uses labeled native controls, all three scopes, and focuses the first control', () => {
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
      expect(radios.map((radio) => radio.value)).toEqual([
        'single',
        'fromHere',
        'all',
      ]);
      expect(new Set(radios.map((radio) => radio.id)).size).toBe(3);
      expect(radios.every((radio) => radio.id !== '')).toBe(true);
      expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
      expect(radios.every((radio) => radio.closest('label'))).toBe(true);
      expect(radios[0].checked).toBe(true);
      expect(editor.textContent).toContain('이 대사만');
      expect(editor.textContent).toContain('이 대사부터 이후');
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

  test.each([
    ['ko', translationKO, '@평상복 [기본]'],
    ['en', translationEN, '@평상복 [Default]'],
    ['jp', translationJP, '@평상복 [デフォルト]'],
    ['zh', translationZH, '@평상복 [默认]'],
  ])('localizes the active variant marker in %s', (language, translation, expected) => {
    const { container, cleanup } = renderEditor({
      t: createTranslator(language, translation),
    });

    try {
      expect(container.querySelector('select').options[0].textContent).toBe(
        expected
      );
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

  test('uses the same from-here scope for variant, direct URL, and clear actions', () => {
    const { container, props, cleanup } = renderEditor();

    try {
      const fromHereRadio = container.querySelector('input[value="fromHere"]');
      const urlInput = container.querySelector('input[type="url"]');

      act(() => fromHereRadio.click());
      act(() => buttonByText(container, '선택 이미지 적용').click());
      act(() => setNativeValue(urlInput, 'https://example.com/from-here.png'));
      act(() => buttonByText(container, 'URL 적용').click());
      act(() => buttonByText(container, '이미지 비우기').click());

      expect(props.onApplyVariant).toHaveBeenCalledWith({
        variantId: 'casual',
        url: 'https://example.com/alice-casual.png',
        scope: 'fromHere',
      });
      expect(props.onApplyUrl).toHaveBeenCalledWith({
        url: 'https://example.com/from-here.png',
        scope: 'fromHere',
      });
      expect(props.onClear).toHaveBeenCalledWith({ scope: 'fromHere' });
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

  test('applies a valid direct URL with Enter while keeping focus in the URL field', () => {
    const { container, props, cleanup } = renderEditor();

    try {
      const urlInput = container.querySelector('input[type="url"]');
      act(() => {
        setNativeValue(urlInput, 'https://example.com/enter.png');
        urlInput.focus();
        urlInput.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
          })
        );
      });

      expect(props.onApplyUrl).toHaveBeenCalledTimes(1);
      expect(props.onApplyUrl).toHaveBeenCalledWith({
        url: 'https://example.com/enter.png',
        scope: 'single',
      });
      expect(document.activeElement).toBe(urlInput);
    } finally {
      cleanup();
    }
  });

  test('keeps focus and announces an invalid direct URL submitted with Enter', () => {
    const { container, props, cleanup } = renderEditor();

    try {
      const urlInput = container.querySelector('input[type="url"]');
      act(() => {
        setNativeValue(urlInput, '/relative/enter.png');
        urlInput.focus();
        urlInput.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
          })
        );
      });

      const alert = container.querySelector('[role="alert"]');
      expect(props.onApplyUrl).not.toHaveBeenCalled();
      expect(alert).not.toBeNull();
      expect(urlInput.getAttribute('aria-describedby')).toBe(alert.id);
      expect(document.activeElement).toBe(urlInput);
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
