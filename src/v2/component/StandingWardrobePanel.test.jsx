import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import StandingWardrobePanel from './StandingWardrobePanel';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const t = (_key, options = {}) => options.defaultValue || _key;

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

  expect(container.querySelector('h4').textContent).toBe(
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
  expect(container.querySelectorAll('.standing-wardrobe-thumbnail[alt=""]')).toHaveLength(2);
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
  Array.from(container.querySelectorAll('button')).forEach((button) => {
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

test('adds a valid variant immutably and clears the submitted draft', async () => {
  const onChange = jest.fn();
  const original = JSON.parse(JSON.stringify(WARDROBE));
  await renderPanel({ onChange });

  const firstCard = container.querySelector('details');
  const nameInput = firstCard.querySelector('input[type="text"]');
  const urlInput = firstCard.querySelector('input[type="url"]');
  await updateInput(nameInput, '정장');
  await updateInput(urlInput, 'https://example.com/alice-formal.png');

  await act(async () => {
    firstCard.querySelector('.standing-wardrobe-add-button').click();
  });

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
});

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
  const setBattleDefault = Array.from(firstCard.querySelectorAll('button')).find(
    (button) => button.textContent.includes('전투 기본으로 설정')
  );
  await act(async () => {
    setBattleDefault.click();
  });
  expect(onApplyDefault).toHaveBeenCalledTimes(1);
  expect(onApplyDefault).toHaveBeenCalledWith('A\u030Alice', 'battle');

  const deleteCasual = Array.from(firstCard.querySelectorAll('button')).find(
    (button) => button.getAttribute('aria-label') === '평상복 삭제'
  );
  await act(async () => {
    deleteCasual.click();
  });

  expect(WARDROBE).toEqual(original);
  const nextWardrobe = onChange.mock.calls[0][0];
  expect(nextWardrobe.characters['Ålice'].activeVariantId).toBeNull();
  expect(nextWardrobe.characters['Ålice'].variants.map(({ id }) => id)).toEqual([
    'battle',
  ]);
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
