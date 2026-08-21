import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createInstance } from 'i18next';
import StandingWardrobePanel from './StandingWardrobePanel';
import translationEN from '../../core/locales/en/translation.json';
import translationJP from '../../core/locales/jp/translation.json';
import translationZH from '../../core/locales/zh/translation.json';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const t = (_key, options = {}) => options.defaultValue || _key;
const BLANK_IMAGE_URL = 'https://ccfolia.com/blank.gif';

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

const WARDROBE = {
  version: 1,
  characters: {
    'Ålice': {
      displayName: 'Ålice',
      activeVariantId: 'casual',
      variants: [
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
      ],
    },
  },
};

const MESSAGES = [
  { id: 'a1', category: 'main', charName: 'A\u030Alice', text: '첫 대사' },
  { id: 'a2', category: 'other', charName: 'Ålice', text: '둘째 대사' },
  { id: 'b1', category: 'main', charName: 'Bob', text: '밥 대사' },
  { id: 'empty', category: 'main', charName: '   ', text: '빈 이름' },
  { id: 'cover', category: 'image', charName: '표지', imgUrl: 'https://example.com/cover.png' },
];

const setInputValue = (input, value) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  valueSetter.call(input, value);
};

const updateInput = async (input, value) => {
  await act(async () => {
    setInputValue(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

let container;
let rootApi;

const renderPanel = async (props = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  rootApi = createRoot(container);

  await act(async () => {
    rootApi.render(
      <StandingWardrobePanel
        messages={MESSAGES}
        wardrobe={WARDROBE}
        onChange={jest.fn()}
        onApplyDefault={jest.fn()}
        storageError={null}
        t={t}
        {...props}
      />
    );
  });
};

afterEach(async () => {
  if (rootApi) {
    await act(async () => {
      rootApi.unmount();
    });
  }
  container?.remove();
  container = null;
  rootApi = null;
  jest.restoreAllMocks();
});

test('shows unique normalized message characters, defaults, and compact variant labels', async () => {
  await renderPanel();

  expect(container.querySelector('h2').textContent).toBe(
    '04. 캐릭터 스탠딩 이미지 변경'
  );
  expect(container.textContent).toContain(
    'URL 기준으로 작업 동안 임시 저장됩니다.'
  );

  const details = container.querySelectorAll('details');
  expect(details).toHaveLength(2);
  expect(details[0].hasAttribute('open')).toBe(true);

  const summaries = Array.from(container.querySelectorAll('summary'));
  expect(summaries[0].textContent).toContain('A\u030Alice');
  expect(summaries[0].textContent).toContain('기본: 평상복');
  expect(summaries[1].textContent).toContain('Bob');
  expect(summaries[1].textContent).toContain('기본: 없음');

  const variantLabels = Array.from(
    container.querySelectorAll('.standing-wardrobe-variant-label')
  ).map((element) => element.textContent.trim());
  expect(variantLabels).toEqual(['@평상복 [기본]', '@전투']);
  expect(container.textContent).not.toContain('개 대사');
  expect(container.textContent).not.toContain('표지');

  const links = container.querySelectorAll('.standing-wardrobe-url');
  expect(links[0].textContent).toBe('https://example.com/alice-casual.png');
  expect(links[0].getAttribute('target')).toBe('_blank');
  expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
  expect(links[0].getAttribute('aria-label')).toBe(
    'https://example.com/alice-casual.png, 새 창에서 열기'
  );
  expect(links[0].getAttribute('title')).toBe(
    'https://example.com/alice-casual.png, 새 창에서 열기'
  );
  expect(container.querySelectorAll('.standing-wardrobe-thumbnail[alt=""]')).toHaveLength(2);
});

test('falls back once when a decorative thumbnail cannot load', async () => {
  const onChange = jest.fn();
  const originalWardrobe = JSON.parse(JSON.stringify(WARDROBE));
  const failedUrl = WARDROBE.characters['Ålice'].variants[0].url;
  await renderPanel({ onChange });

  const thumbnail = container.querySelector('.standing-wardrobe-thumbnail');
  const visibleUrl = container.querySelector('.standing-wardrobe-url');
  await act(async () => {
    thumbnail.dispatchEvent(new Event('error', { bubbles: false }));
  });
  expect(thumbnail.getAttribute('src')).toBe(BLANK_IMAGE_URL);
  expect(visibleUrl.getAttribute('href')).toBe(failedUrl);
  expect(onChange).not.toHaveBeenCalled();
  expect(WARDROBE).toEqual(originalWardrobe);

  await act(async () => {
    thumbnail.dispatchEvent(new Event('error', { bubbles: false }));
  });
  expect(thumbnail.getAttribute('src')).toBe(BLANK_IMAGE_URL);
  expect(visibleUrl.getAttribute('href')).toBe(failedUrl);
  expect(onChange).not.toHaveBeenCalled();
  expect(WARDROBE).toEqual(originalWardrobe);
});

test('uses native and explicitly labelled controls with status and alert semantics', async () => {
  await renderPanel({ storageError: new DOMException('blocked', 'SecurityError') });

  expect(container.querySelector('details > summary')).not.toBeNull();
  expect(container.querySelector('[role="status"]').textContent).toContain('저장');

  const labels = Array.from(container.querySelectorAll('label'));
  expect(labels).toHaveLength(4);
  const labelledIds = labels.map((label) => label.htmlFor);
  expect(new Set(labelledIds).size).toBe(labelledIds.length);
  labelledIds.forEach((id) => {
    expect(id).not.toBe('');
    expect(container.querySelector(`[id="${id}"]`)).not.toBeNull();
  });
  const addButtons = Array.from(
    container.querySelectorAll('.standing-wardrobe-add-button')
  );
  expect(addButtons).toHaveLength(2);
  addButtons.forEach((button) => {
    expect(button.getAttribute('type')).toBe('submit');
  });
  Array.from(container.querySelectorAll('button'))
    .filter((button) => !button.classList.contains('standing-wardrobe-add-button'))
    .forEach((button) => {
    expect(button.getAttribute('type')).toBe('button');
    expect(button.textContent.trim() || button.getAttribute('aria-label')).toBeTruthy();
    });

  const firstCard = container.querySelector('details');
  const nameInput = firstCard.querySelector('input[type="text"]');
  const urlInput = firstCard.querySelector('input[type="url"]');
  const addButton = firstCard.querySelector('.standing-wardrobe-add-button');

  await act(async () => {
    addButton.click();
  });
  let alert = firstCard.querySelector('[role="alert"]');
  expect(nameInput.getAttribute('aria-invalid')).toBe('true');
  expect(nameInput.getAttribute('aria-describedby')).toBe(alert.id);
  expect(urlInput.getAttribute('aria-invalid')).toBe('false');
  expect(urlInput.hasAttribute('aria-describedby')).toBe(false);

  await updateInput(nameInput, '새 이미지');
  expect(firstCard.querySelector('[role="alert"]')).toBeNull();
  await updateInput(
    urlInput,
    'javascript:alert(1)'
  );
  await act(async () => {
    addButton.click();
  });
  alert = firstCard.querySelector('[role="alert"]');
  expect(nameInput.getAttribute('aria-invalid')).toBe('false');
  expect(nameInput.hasAttribute('aria-describedby')).toBe(false);
  expect(urlInput.getAttribute('aria-invalid')).toBe('true');
  expect(urlInput.getAttribute('aria-describedby')).toBe(alert.id);

  await updateInput(urlInput, 'https://example.com/new-image.png');
  expect(firstCard.querySelector('[role="alert"]')).toBeNull();
});

test('adds a valid variant immutably through the form submit route used by Enter', async () => {
  const onChange = jest.fn();
  const original = JSON.parse(JSON.stringify(WARDROBE));
  await renderPanel({ onChange });

  const firstCard = container.querySelector('details');
  const nameInput = firstCard.querySelector('input[type="text"]');
  const urlInput = firstCard.querySelector('input[type="url"]');
  await updateInput(nameInput, '정장');
  await updateInput(urlInput, 'https://example.com/alice-formal.png');

  const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
  await act(async () => {
    firstCard.querySelector('form').dispatchEvent(submitEvent);
  });

  expect(submitEvent.defaultPrevented).toBe(true);
  expect(onChange).toHaveBeenCalledTimes(1);
  const nextWardrobe = onChange.mock.calls[0][0];
  expect(WARDROBE).toEqual(original);
  expect(nextWardrobe).not.toBe(WARDROBE);
  expect(nextWardrobe.characters['Ålice'].variants).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: expect.any(String),
        label: '정장',
        url: 'https://example.com/alice-formal.png',
      }),
    ])
  );
  expect(nameInput.value).toBe('');
  expect(urlInput.value).toBe('');
  expect(firstCard.querySelector('[role="alert"]')).toBeNull();
  const addStatus = firstCard.querySelector('[role="status"]');
  expect(addStatus.textContent).toBe('정장 이미지를 추가했습니다.');
  expect(addStatus.textContent).not.toMatch(/\d+\s*개 대사|개 대사/);
});

test('remounts the live status when the same variant name is added repeatedly', async () => {
  await renderPanel();

  const firstCard = container.querySelector('details');
  const nameInput = firstCard.querySelector('input[type="text"]');
  const urlInput = firstCard.querySelector('input[type="url"]');

  await updateInput(nameInput, '정장');
  await updateInput(urlInput, 'https://example.com/alice-formal-1.png');
  await act(async () => {
    firstCard
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  const firstStatus = firstCard.querySelector('.standing-wardrobe-action-status');
  expect(firstStatus.textContent).toBe('정장 이미지를 추가했습니다.');

  await updateInput(nameInput, '정장');
  await updateInput(urlInput, 'https://example.com/alice-formal-2.png');
  await act(async () => {
    firstCard
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  const secondStatus = firstCard.querySelector('.standing-wardrobe-action-status');
  expect(secondStatus).not.toBe(firstStatus);
  expect(secondStatus.getAttribute('aria-atomic')).toBe('true');
  expect(secondStatus.textContent).toBe('정장 이미지를 추가했습니다.');
});

test.each([
  [
    'en',
    translationEN,
    'Change character standing images',
    'Only URLs are stored temporarily during this editing session.',
    '@평상복 [Default]',
    'https://example.com/alice-casual.png, opens in a new window',
    'Added the Formal image.',
  ],
  [
    'jp',
    translationJP,
    'キャラクターの立ち絵を変更',
    '画像ファイルは保存せず、URLのみを作業中に一時保存します。',
    '@평상복 [デフォルト]',
    'https://example.com/alice-casual.png、新しいウィンドウで開きます',
    'Formalの画像を追加しました。',
  ],
  [
    'zh',
    translationZH,
    '更改角色立绘',
    '不会保存图片文件，仅在本次编辑期间临时保存 URL。',
    '@평상복 [默认]',
    'https://example.com/alice-casual.png，将在新窗口中打开',
    '已添加 Formal 图片。',
  ],
])(
  'renders localized heading, storage note, link context, and add feedback in %s',
  async (
    language,
    translation,
    heading,
    storageNote,
    activeLabel,
    linkLabel,
    addStatus
  ) => {
    await renderPanel({ t: createTranslator(language, translation) });

    expect(container.querySelector('h2').textContent).toBe(`04. ${heading}`);
    expect(container.querySelector('.standing-wardrobe-storage-note').textContent).toBe(
      storageNote
    );
    expect(
      container.querySelector('.standing-wardrobe-variant-label').textContent.trim()
    ).toBe(activeLabel);
    const link = container.querySelector('.standing-wardrobe-url');
    expect(link.textContent).toBe('https://example.com/alice-casual.png');
    expect(link.getAttribute('aria-label')).toBe(linkLabel);
    expect(link.getAttribute('title')).toBe(linkLabel);

    const firstCard = container.querySelector('details');
    await updateInput(firstCard.querySelector('input[type="text"]'), 'Formal');
    await updateInput(
      firstCard.querySelector('input[type="url"]'),
      'https://example.com/alice-formal-locale.png'
    );
    await act(async () => {
      firstCard
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(firstCard.querySelector('[role="status"]').textContent).toBe(
      addStatus
    );
    const localizedUi = [heading, storageNote, linkLabel, addStatus].join(' ');
    if (language === 'en') {
      expect(localizedUi).not.toMatch(/새 창|이미지를 추가|임시 저장/);
    } else {
      expect(localizedUi).not.toMatch(
        /opens in a new window|Added the|이미지를 추가|임시 저장/
      );
    }
  }
);

test('uses a guaranteed unique fallback id after repeated random UUID collisions', async () => {
  const onChange = jest.fn();
  const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'crypto'
  );
  const randomUUID = jest.fn().mockReturnValue('casual');
  Object.defineProperty(window, 'crypto', {
    configurable: true,
    value: { randomUUID },
  });

  try {
    await renderPanel({ onChange });
    const firstCard = container.querySelector('details');
    await updateInput(firstCard.querySelector('input[type="text"]'), '정장');
    await updateInput(
      firstCard.querySelector('input[type="url"]'),
      'https://example.com/alice-formal.png'
    );

    await act(async () => {
      firstCard
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(randomUUID).toHaveBeenCalledTimes(3);
    const variants = onChange.mock.calls[0][0].characters['Ålice'].variants;
    expect(variants).toHaveLength(3);
    expect(variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'casual', label: '평상복' }),
        expect.objectContaining({ id: 'battle', label: '전투' }),
        expect.objectContaining({ id: 'variant-1', label: '정장' }),
      ])
    );
  } finally {
    if (originalCryptoDescriptor) {
      Object.defineProperty(window, 'crypto', originalCryptoDescriptor);
    } else {
      delete window.crypto;
    }
  }
});

test('accepts a normal variant label after the storage model normalizes Unicode', async () => {
  const onChange = jest.fn();
  await renderPanel({ onChange });

  const firstCard = container.querySelector('details');
  await updateInput(firstCard.querySelector('input[type="text"]'), 'A\u030A 복장');
  await updateInput(
    firstCard.querySelector('input[type="url"]'),
    'https://example.com/alice-normalized.png'
  );
  await act(async () => {
    firstCard
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(
    onChange.mock.calls[0][0].characters['Ålice'].variants.at(-1).label
  ).toBe('Å 복장');
  expect(firstCard.querySelector('[role="alert"]')).toBeNull();
});

test.each(['__proto__', 'constructor', 'prototype'])(
  'retains the draft and links an alert when character %s is rejected by storage',
  async (reservedName) => {
    const onChange = jest.fn();
    await renderPanel({
      messages: [
        MESSAGES[0],
        {
          id: `reserved-${reservedName}`,
          category: 'main',
          charName: reservedName,
          text: '예약어 대사',
        },
      ],
      onChange,
    });

    const reservedCard = Array.from(container.querySelectorAll('details')).find(
      (card) =>
        card.querySelector('.standing-wardrobe-character-name').textContent ===
        reservedName
    );
    const form = reservedCard.querySelector('form');
    const nameInput = form.querySelector('input[type="text"]');
    const urlInput = form.querySelector('input[type="url"]');
    await updateInput(nameInput, '평상복');
    await updateInput(urlInput, `https://example.com/${reservedName}.png`);

    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
    });

    const alert = form.querySelector('[role="alert"]');
    expect(onChange).not.toHaveBeenCalled();
    expect(nameInput.value).toBe('평상복');
    expect(urlInput.value).toBe(`https://example.com/${reservedName}.png`);
    expect(alert.textContent).toContain('저장할 수 없습니다');
    expect(form.getAttribute('aria-describedby')).toBe(alert.id);
    expect(nameInput.getAttribute('aria-invalid')).toBe('false');
    expect(urlInput.getAttribute('aria-invalid')).toBe('false');
  }
);

test('keeps invalid and duplicate URL drafts without changing the wardrobe', async () => {
  const onChange = jest.fn();
  await renderPanel({ onChange });

  const firstCard = container.querySelector('details');
  const nameInput = firstCard.querySelector('input[type="text"]');
  const urlInput = firstCard.querySelector('input[type="url"]');
  const addButton = firstCard.querySelector('.standing-wardrobe-add-button');
  await updateInput(nameInput, '복제');
  await updateInput(urlInput, '/relative/alice.png');
  await act(async () => {
    addButton.click();
  });

  expect(onChange).not.toHaveBeenCalled();
  expect(firstCard.querySelector('[role="alert"]').textContent).toContain('URL');
  expect(nameInput.value).toBe('복제');
  expect(urlInput.value).toBe('/relative/alice.png');

  await updateInput(urlInput, 'https://example.com/alice-casual.png');
  await act(async () => {
    addButton.click();
  });

  expect(onChange).not.toHaveBeenCalled();
  expect(firstCard.querySelector('[role="alert"]').textContent).toContain('이미 등록');
  expect(urlInput.value).toBe('https://example.com/alice-casual.png');
});

test('requests an immediate default change and immutably clears active state on delete', async () => {
  const onChange = jest.fn();
  const onApplyDefault = jest.fn();
  const original = JSON.parse(JSON.stringify(WARDROBE));
  await renderPanel({ onChange, onApplyDefault });

  const firstCard = container.querySelector('details');
  const defaultButtons = Array.from(
    firstCard.querySelectorAll('.standing-wardrobe-default-button')
  );
  expect(defaultButtons).toHaveLength(2);
  const casualDefault = defaultButtons.find((button) =>
    button.textContent.includes('평상복 기본으로 설정')
  );
  const setBattleDefault = defaultButtons.find(
    (button) => button.textContent.includes('전투 기본으로 설정')
  );
  expect(casualDefault.getAttribute('aria-pressed')).toBe('true');
  expect(setBattleDefault.getAttribute('aria-pressed')).toBe('false');
  await act(async () => {
    setBattleDefault.click();
  });
  expect(onApplyDefault).toHaveBeenCalledTimes(1);
  expect(onApplyDefault).toHaveBeenCalledWith('A\u030Alice', 'battle');

  const deleteCasual = Array.from(firstCard.querySelectorAll('button')).find(
    (button) => button.getAttribute('aria-label') === '평상복 삭제'
  );
  deleteCasual.focus();
  await act(async () => {
    deleteCasual.click();
  });

  expect(WARDROBE).toEqual(original);
  const nextWardrobe = onChange.mock.calls[0][0];
  expect(nextWardrobe.characters['Ålice'].activeVariantId).toBeNull();
  expect(nextWardrobe.characters['Ålice'].variants.map(({ id }) => id)).toEqual([
    'battle',
  ]);
  expect(document.activeElement).toBe(
    firstCard.querySelector('input[type="text"]')
  );
  const deletionStatus = Array.from(firstCard.querySelectorAll('[role="status"]')).find(
    (status) => status.textContent.includes('평상복')
  );
  expect(deletionStatus.textContent).toContain('삭제');
});

test('keeps editing enabled while the nonblocking storage warning is visible', async () => {
  const onChange = jest.fn();
  await renderPanel({
    onChange,
    storageError: new DOMException('blocked', 'SecurityError'),
  });

  const firstCard = container.querySelector('details');
  await updateInput(firstCard.querySelector('input[type="text"]'), '우비');
  await updateInput(
    firstCard.querySelector('input[type="url"]'),
    'https://example.com/alice-raincoat.png'
  );
  await act(async () => {
    firstCard.querySelector('.standing-wardrobe-add-button').click();
  });

  expect(container.querySelector('[role="status"]')).not.toBeNull();
  expect(onChange).toHaveBeenCalledTimes(1);
});
