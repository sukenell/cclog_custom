jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'fs';
import path from 'path';
import AppV2, {
  buildMinimalExportCSS,
  clonePreviewForExport,
  removeMessageById,
} from './AppV2';
import { WARDROBE_STORAGE_KEY } from './utils/standingWardrobe';

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

const setInputValue = (input, value) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  valueSetter.call(input, value);
};

const uploadLogFile = async (container, html) => {
  const fileInput = container.querySelector('input[type="file"]');
  const confirmButton = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === '확인'
  );
  const file = new File(['ignored by mock'], 'session.html', { type: 'text/html' });

  Object.defineProperty(file, 'mockText', {
    value: html,
  });
  Object.defineProperty(fileInput, 'files', {
    value: [file],
    configurable: true,
  });

  await act(async () => {
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await act(async () => {
    confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await act(async () => {});
};

const updateTextInput = async (input, value) => {
  await act(async () => {
    setInputValue(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const readBlobText = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new NativeFileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

let originalDownloadGlobals = null;

const captureDownloads = () => {
  if (originalDownloadGlobals) {
    throw new Error('Download capture is already active');
  }

  const downloads = [];
  originalDownloadGlobals = {
    createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL,
    anchorClick: HTMLAnchorElement.prototype.click,
  };

  URL.createObjectURL = jest.fn((blob) => {
    downloads.push({ blob, download: null });
    return `blob:download-${downloads.length}`;
  });
  URL.revokeObjectURL = jest.fn();
  HTMLAnchorElement.prototype.click = function click() {
    downloads[downloads.length - 1].download = this.download;
  };

  return downloads;
};

const restoreDownloadCapture = () => {
  if (!originalDownloadGlobals) return;

  URL.createObjectURL = originalDownloadGlobals.createObjectURL;
  URL.revokeObjectURL = originalDownloadGlobals.revokeObjectURL;
  HTMLAnchorElement.prototype.click = originalDownloadGlobals.anchorClick;
  originalDownloadGlobals = null;
};

const expectClassTokens = (element, expectedTokens) => {
  expect(Array.from(element.classList).sort()).toEqual([...expectedTokens].sort());
};

const collectObjectKeys = (value, keys = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjectKeys(item, keys));
    return keys;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nestedValue]) => {
      keys.push(key);
      collectObjectKeys(nestedValue, keys);
    });
  }

  return keys;
};

const normalizeDomNode = (node) => {
  if (node.nodeType === 3) {
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    return text ? { type: 'text', text } : null;
  }
  if (node.nodeType !== 1) return null;

  const attributes = Object.fromEntries(
    Array.from(node.attributes)
      .map(({ name, value }) => [name, value.replace(/\s+/g, ' ').trim()])
      .sort(([left], [right]) => left.localeCompare(right))
  );
  const children = Array.from(node.childNodes)
    .map(normalizeDomNode)
    .filter(Boolean);

  return {
    type: 'element',
    tag: node.tagName.toLowerCase(),
    attributes,
    children,
  };
};

const normalizeHtmlExport = (content) => {
  const documentNode = new DOMParser().parseFromString(content, 'text/html');
  return {
    doctype: documentNode.doctype?.name || null,
    document: normalizeDomNode(documentNode.documentElement),
  };
};

const normalizeEbookExport = (payload) => ({
  ...payload,
  lines: payload.lines.map((line) => ({ ...line, id: '<generated-line-id>' })),
});

const ALICE_WARDROBE = {
  version: 1,
  characters: {
    '앨리스': {
      displayName: '앨리스',
      activeVariantId: 'casual',
      variants: [
        {
          id: 'casual',
          label: '평상복',
          url: 'https://example.com/alice-casual.png',
        },
      ],
    },
  },
};

const ALICE_TWO_VARIANT_WARDROBE = {
  version: 1,
  characters: {
    '앨리스': {
      displayName: '앨리스',
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

const ALICE_BOB_ALICE_LOG = `
  <div>
    <p><span>[main]</span> <span>앨리스</span> : <span>첫 번째 대사</span></p>
    <p><span>[main]</span> <span>밥</span> : <span>밥의 대사</span></p>
    <p><span>[main]</span> <span>앨리스</span> : <span>두 번째 대사</span></p>
  </div>
`;

const seedAliceWardrobe = () => {
  sessionStorage.setItem(
    WARDROBE_STORAGE_KEY,
    JSON.stringify(ALICE_WARDROBE)
  );
};

const getMessageRowByText = (container, text) =>
  Array.from(container.querySelectorAll('.message-row')).find((row) =>
    row.textContent.includes(text)
  );

const getProfileImageUrl = (container, text) =>
  getMessageRowByText(container, text)
    ?.querySelector('.msg_container img')
    ?.getAttribute('src');

const editMessageImage = async (container, text, url) => {
  const row = getMessageRowByText(container, text);

  await act(async () => {
    row.querySelector('button[title="Change Image"]').click();
  });

  const editor = row.querySelector('.standing-image-editor');
  if (url === '') {
    const clearButton = Array.from(editor.querySelectorAll('button')).find(
      (button) => button.textContent === '이미지 비우기'
    );
    await act(async () => clearButton.click());
    return;
  }

  const imageInput = editor.querySelector('input[type="url"]');
  await updateTextInput(imageInput, url);
  const applyButton = Array.from(editor.querySelectorAll('button')).find(
    (button) => button.textContent === 'URL 적용'
  );

  await act(async () => applyButton.click());
};

const setSelectValue = async (select, value) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    'value'
  ).set;

  await act(async () => {
    valueSetter.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const openStandingEditor = async (container, text) => {
  const row = getMessageRowByText(container, text);
  await act(async () => {
    row.querySelector('button[title="Change Image"]').click();
  });
  return row.querySelector('.standing-image-editor');
};

const chooseStandingScope = async (editor, scope) => {
  if (scope === 'single') return;
  await act(async () => {
    editor.querySelector(`input[value="${scope}"]`).click();
  });
};

const applyMessageVariant = async (
  container,
  text,
  variantId,
  scope = 'single'
) => {
  const editor = await openStandingEditor(container, text);
  await chooseStandingScope(editor, scope);
  await setSelectValue(editor.querySelector('select'), variantId);
  const applyButton = Array.from(editor.querySelectorAll('button')).find(
    (button) => button.textContent === '선택 이미지 적용'
  );
  await act(async () => applyButton.click());
};

const applyMessageUrl = async (container, text, url, scope = 'single') => {
  const editor = await openStandingEditor(container, text);
  await chooseStandingScope(editor, scope);
  await updateTextInput(editor.querySelector('input[type="url"]'), url);
  const applyButton = Array.from(editor.querySelectorAll('button')).find(
    (button) => button.textContent === 'URL 적용'
  );
  await act(async () => applyButton.click());
};

const clearMessageImage = async (container, text, scope = 'single') => {
  const editor = await openStandingEditor(container, text);
  await chooseStandingScope(editor, scope);
  const clearButton = Array.from(editor.querySelectorAll('button')).find(
    (button) => button.textContent === '이미지 비우기'
  );
  await act(async () => clearButton.click());
};

const editMessageText = async (container, text, nextText) => {
  const row = getMessageRowByText(container, text);
  const editButton = Array.from(row.querySelectorAll('button')).find(
    (button) => !button.hasAttribute('title')
  );

  await act(async () => {
    editButton.click();
  });

  const textInput = row.querySelector('input');
  await updateTextInput(textInput, nextText);

  await act(async () => {
    textInput.parentElement.querySelector('button').click();
  });
};

beforeEach(() => {
  sessionStorage.clear();
  global.FileReader = MockFileReader;
});

afterEach(() => {
  global.FileReader = NativeFileReader;
  restoreDownloadCapture();
  jest.restoreAllMocks();
  sessionStorage.clear();
});

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

describe('AppV2 preview export clone', () => {
  test('removes ignored subtrees and every interactive form control from a clone', () => {
    const preview = document.createElement('div');
    preview.innerHTML = `
      <div class="dialogue">보존할 대사</div>
      <img class="final-image" src="https://example.com/final.png" alt="" />
      <form data-export-ignore="true">
        <label>편집기 <select><option>의상</option></select></label>
        <input value="draft" />
        <textarea>draft</textarea>
        <button type="button">적용</button>
      </form>
      <button type="button">행 버튼</button>
      <input value="행 입력" />
      <select><option>행 선택</option></select>
      <textarea>행 텍스트</textarea>
    `;

    const cloned = clonePreviewForExport(preview);

    expect(cloned).not.toBe(preview);
    expect(cloned.querySelector('.dialogue').textContent).toBe('보존할 대사');
    expect(cloned.querySelector('.final-image').getAttribute('src')).toBe(
      'https://example.com/final.png'
    );
    expect(
      cloned.querySelectorAll(
        '[data-export-ignore="true"], button, input, select, textarea'
      )
    ).toHaveLength(0);
    expect(preview.querySelector('[data-export-ignore="true"]')).not.toBeNull();
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

describe('AppV2 session standing wardrobe integration', () => {
  test('applies the active same-tab default to every matching character row', async () => {
    seedAliceWardrobe();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>앨리스</span> : <span>첫 번째 대사</span></p>
            <p><span>[main]</span> <span>밥</span> : <span>밥의 대사</span></p>
            <p><span>[main]</span> <span>앨리스</span> : <span>두 번째 대사</span></p>
          </div>
        `
      );

      expect(getProfileImageUrl(container, '첫 번째 대사')).toBe(
        'https://example.com/alice-casual.png'
      );
      expect(getProfileImageUrl(container, '두 번째 대사')).toBe(
        'https://example.com/alice-casual.png'
      );
      expect(getProfileImageUrl(container, '밥의 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('changes every matching default through the panel while preserving text edits and other characters', async () => {
    sessionStorage.setItem(
      WARDROBE_STORAGE_KEY,
      JSON.stringify(ALICE_TWO_VARIANT_WARDROBE)
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>앨리스</span> : <span>첫 번째 대사</span></p>
            <p><span>[main]</span> <span>밥</span> : <span>밥의 대사</span></p>
            <p><span>[main]</span> <span>앨리스</span> : <span>두 번째 대사</span></p>
          </div>
        `
      );

      const wardrobePanel = container.querySelector('.standing-wardrobe-panel');
      expect(wardrobePanel).not.toBeNull();
      expect(wardrobePanel.querySelector('h4').textContent).toBe(
        '04. 캐릭터 스탠딩 이미지 변경'
      );
      expect(container.querySelector('.setting_container > .standing-wardrobe-panel')).toBe(
        wardrobePanel
      );
      expect(container.querySelector('#preview-scroll-box .standing-wardrobe-panel')).toBeNull();
      expect(container.querySelector('.title_input').previousElementSibling.textContent).toContain(
        '05.'
      );
      expect(container.querySelector('.end_input').previousElementSibling.textContent).toContain(
        '06.'
      );
      expect(container.querySelector('.system_input').previousElementSibling.textContent).toContain(
        '07.'
      );

      await editMessageText(container, '첫 번째 대사', '수정된 첫 번째 대사');
      await editMessageImage(
        container,
        '수정된 첫 번째 대사',
        'https://example.com/alice-exception.png'
      );
      expect(getProfileImageUrl(container, '수정된 첫 번째 대사')).toBe(
        'https://example.com/alice-exception.png'
      );

      const setBattleDefault = Array.from(
        wardrobePanel.querySelectorAll('button')
      ).find((button) => button.textContent.includes('전투 기본으로 설정'));
      setBattleDefault.focus();
      expect(document.activeElement).toBe(setBattleDefault);
      await act(async () => {
        setBattleDefault.click();
      });

      expect(document.activeElement).toBe(setBattleDefault);
      expect(setBattleDefault.getAttribute('aria-pressed')).toBe('true');

      expect(getProfileImageUrl(container, '수정된 첫 번째 대사')).toBe(
        'https://example.com/alice-battle.png'
      );
      expect(getProfileImageUrl(container, '두 번째 대사')).toBe(
        'https://example.com/alice-battle.png'
      );
      expect(getProfileImageUrl(container, '밥의 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );
      expect(container.textContent).toContain('수정된 첫 번째 대사');
      expect(wardrobePanel.textContent).not.toContain('개 대사');

      const stored = JSON.parse(sessionStorage.getItem(WARDROBE_STORAGE_KEY));
      expect(Object.keys(stored).sort()).toEqual(['characters', 'version']);
      expect(stored.characters['앨리스'].activeVariantId).toBe('battle');
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('keeps focus on the add form and announces deletion after removing the last variant', async () => {
    seedAliceWardrobe();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });
      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>앨리스</span> : <span>삭제 후 대사</span></p>
          </div>
        `
      );

      const wardrobePanel = container.querySelector('.standing-wardrobe-panel');
      const deleteButton = wardrobePanel.querySelector(
        '.standing-wardrobe-delete-button'
      );
      deleteButton.focus();
      await act(async () => {
        deleteButton.click();
      });

      const currentNameInput = wardrobePanel.querySelector('input[type="text"]');
      expect(document.activeElement).toBe(currentNameInput);
      expect(wardrobePanel.querySelector('[role="status"]').textContent).toContain(
        '평상복 이미지를 삭제했습니다.'
      );
      expect(wardrobePanel.querySelector('summary').textContent).toContain(
        '기본: 없음'
      );
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('keeps explicit line image exceptions when title settings reparse the log', async () => {
    seedAliceWardrobe();
    const downloads = captureDownloads();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>앨리스</span> : <span>예외 대사</span></p>
            <p><span>[main]</span> <span>앨리스</span> : <span>빈 이미지 대사</span></p>
          </div>
        `
      );

      await editMessageImage(
        container,
        '예외 대사',
        'https://example.com/alice-exception.png'
      );
      await editMessageImage(container, '빈 이미지 대사', '');

      expect(getProfileImageUrl(container, '예외 대사')).toBe(
        'https://example.com/alice-exception.png'
      );
      expect(getProfileImageUrl(container, '빈 이미지 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );

      await updateTextInput(
        container.querySelector('.title_input'),
        'https://example.com/reparse-title.png'
      );

      const titlePseudoImages = container.querySelectorAll(
        '.message-container.image img'
      );
      expect(titlePseudoImages).toHaveLength(1);
      expect(titlePseudoImages[0].getAttribute('src')).toBe(
        'https://example.com/reparse-title.png'
      );
      expect(getProfileImageUrl(container, '예외 대사')).toBe(
        'https://example.com/alice-exception.png'
      );
      expect(getProfileImageUrl(container, '빈 이미지 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );

      const jsonDownloadButton = Array.from(
        container.querySelectorAll('button')
      ).find((button) => button.textContent === '다운로드 (JSON)');

      await act(async () => {
        jsonDownloadButton.click();
      });

      const json = JSON.parse(await readBlobText(downloads[0].blob));
      const exceptionLine = json.lines.find(
        ({ text }) => text === '예외 대사'
      );
      const emptyLine = json.lines.find(
        ({ text }) => text === '빈 이미지 대사'
      );
      const titleLine = json.lines.find(
        ({ imageUrl }) => imageUrl === 'https://example.com/reparse-title.png'
      );

      expect(titleLine).toBeDefined();
      expect(exceptionLine.input.speakerImages.standing.url).toBe(
        'https://example.com/alice-exception.png'
      );
      expect(emptyLine.input.speakerImages.standing.url).toBe(
        'https://ccfolia.com/blank.gif'
      );
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('clears a line exception for a newly confirmed log but keeps the same-tab default', async () => {
    seedAliceWardrobe();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>앨리스</span> : <span>기존 로그 대사</span></p>
            <p><span>[main]</span> <span>앨리스</span> : <span>삭제할 대사</span></p>
          </div>
        `
      );
      await editMessageImage(
        container,
        '기존 로그 대사',
        'https://example.com/alice-exception.png'
      );

      expect(getProfileImageUrl(container, '기존 로그 대사')).toBe(
        'https://example.com/alice-exception.png'
      );

      await act(async () => {
        getMessageRowByText(container, '삭제할 대사')
          .querySelector('button[title="Delete Message"]')
          .click();
      });
      expect(container.textContent).not.toContain('삭제할 대사');

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>앨리스</span> : <span>새 로그 대사</span></p>
            <p><span>[main]</span> <span>앨리스</span> : <span>새 로그 두 번째 대사</span></p>
          </div>
        `
      );

      expect(container.textContent).not.toContain('기존 로그 대사');
      expect(getProfileImageUrl(container, '새 로그 대사')).toBe(
        'https://example.com/alice-casual.png'
      );
      expect(getProfileImageUrl(container, '새 로그 두 번째 대사')).toBe(
        'https://example.com/alice-casual.png'
      );
      expect(
        JSON.parse(sessionStorage.getItem(WARDROBE_STORAGE_KEY))
      ).toEqual(ALICE_WARDROBE);
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('continues rendering and editing when session wardrobe writes are blocked', async () => {
    seedAliceWardrobe();
    const storagePrototype = Object.getPrototypeOf(sessionStorage);
    const setItemSpy = jest
      .spyOn(storagePrototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage blocked', 'SecurityError');
      });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        WARDROBE_STORAGE_KEY,
        expect.any(String)
      );
      expect(container.querySelector('[role="status"]')).not.toBeNull();
      expect(container.querySelector('[role="status"]').textContent).toContain(
        '저장'
      );

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>앨리스</span> : <span>차단 상태 대사</span></p>
          </div>
        `
      );
      await editMessageImage(
        container,
        '차단 상태 대사',
        'https://example.com/still-editable.png'
      );

      expect(getProfileImageUrl(container, '차단 상태 대사')).toBe(
        'https://example.com/still-editable.png'
      );
      expect(container.querySelector('[role="status"]')).not.toBeNull();
    } finally {
      setItemSpy.mockRestore();
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('leaves title and ending image pseudo messages on their configured URLs', async () => {
    seedAliceWardrobe();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>앨리스</span> : <span>일반 대사</span></p>
          </div>
        `
      );
      await updateTextInput(
        container.querySelector('.title_input'),
        'https://example.com/title.png'
      );
      await updateTextInput(
        container.querySelector('.end_input'),
        'https://example.com/end.png'
      );

      const pseudoImageUrls = Array.from(
        container.querySelectorAll('.message-container.image img')
      ).map((image) => image.getAttribute('src'));

      expect(pseudoImageUrls).toEqual([
        'https://example.com/title.png',
        'https://example.com/end.png',
      ]);
      expect(getProfileImageUrl(container, '일반 대사')).toBe(
        'https://example.com/alice-casual.png'
      );
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('applies a selected variant to only the anchored Alice line', async () => {
    sessionStorage.setItem(
      WARDROBE_STORAGE_KEY,
      JSON.stringify(ALICE_TWO_VARIANT_WARDROBE)
    );
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => rootApi.render(<AppV2 />));
      await uploadLogFile(container, ALICE_BOB_ALICE_LOG);
      await applyMessageVariant(container, '첫 번째 대사', 'battle');

      expect(getProfileImageUrl(container, '첫 번째 대사')).toBe(
        'https://example.com/alice-battle.png'
      );
      expect(getProfileImageUrl(container, '두 번째 대사')).toBe(
        'https://example.com/alice-casual.png'
      );
      expect(getProfileImageUrl(container, '밥의 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );
      expect(
        JSON.parse(sessionStorage.getItem(WARDROBE_STORAGE_KEY)).characters[
          '앨리스'
        ].activeVariantId
      ).toBe('casual');
    } finally {
      await act(async () => rootApi.unmount());
      container.remove();
    }
  });

  test('applies a variant to every Alice line, sets the default, and clears image exceptions only', async () => {
    sessionStorage.setItem(
      WARDROBE_STORAGE_KEY,
      JSON.stringify(ALICE_TWO_VARIANT_WARDROBE)
    );
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => rootApi.render(<AppV2 />));
      await uploadLogFile(container, ALICE_BOB_ALICE_LOG);
      await editMessageText(container, '첫 번째 대사', '수정된 첫 번째 대사');
      await applyMessageUrl(
        container,
        '수정된 첫 번째 대사',
        'https://example.com/alice-exception.png'
      );
      await applyMessageVariant(container, '두 번째 대사', 'battle', 'all');

      expect(getProfileImageUrl(container, '수정된 첫 번째 대사')).toBe(
        'https://example.com/alice-battle.png'
      );
      expect(getProfileImageUrl(container, '두 번째 대사')).toBe(
        'https://example.com/alice-battle.png'
      );
      expect(getProfileImageUrl(container, '밥의 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );
      expect(container.textContent).toContain('수정된 첫 번째 대사');

      await updateTextInput(
        container.querySelector('.title_input'),
        'https://example.com/reparse.png'
      );
      expect(getProfileImageUrl(container, '수정된 첫 번째 대사')).toBe(
        'https://example.com/alice-battle.png'
      );
      expect(
        JSON.parse(sessionStorage.getItem(WARDROBE_STORAGE_KEY)).characters[
          '앨리스'
        ].activeVariantId
      ).toBe('battle');
    } finally {
      await act(async () => rootApi.unmount());
      container.remove();
    }
  });

  test('keeps direct single/all URLs in the current log and never changes the wardrobe default', async () => {
    sessionStorage.setItem(
      WARDROBE_STORAGE_KEY,
      JSON.stringify(ALICE_TWO_VARIANT_WARDROBE)
    );
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => rootApi.render(<AppV2 />));
      await uploadLogFile(container, ALICE_BOB_ALICE_LOG);
      await applyMessageUrl(
        container,
        '첫 번째 대사',
        'https://example.com/alice-single.png'
      );

      expect(getProfileImageUrl(container, '첫 번째 대사')).toBe(
        'https://example.com/alice-single.png'
      );
      expect(getProfileImageUrl(container, '두 번째 대사')).toBe(
        'https://example.com/alice-casual.png'
      );

      await applyMessageUrl(
        container,
        '두 번째 대사',
        'https://example.com/alice-log-all.png',
        'all'
      );
      await updateTextInput(
        container.querySelector('.title_input'),
        'https://example.com/direct-reparse.png'
      );

      expect(getProfileImageUrl(container, '첫 번째 대사')).toBe(
        'https://example.com/alice-log-all.png'
      );
      expect(getProfileImageUrl(container, '두 번째 대사')).toBe(
        'https://example.com/alice-log-all.png'
      );
      expect(getProfileImageUrl(container, '밥의 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );
      expect(
        JSON.parse(sessionStorage.getItem(WARDROBE_STORAGE_KEY)).characters[
          '앨리스'
        ].activeVariantId
      ).toBe('casual');

      await uploadLogFile(
        container,
        '<p><span>[main]</span> <span>앨리스</span> : <span>새 로그</span></p>'
      );
      expect(getProfileImageUrl(container, '새 로그')).toBe(
        'https://example.com/alice-casual.png'
      );
    } finally {
      await act(async () => rootApi.unmount());
      container.remove();
    }
  });

  test('stores explicit single/all clears above the default without leaking log state to session storage', async () => {
    sessionStorage.setItem(
      WARDROBE_STORAGE_KEY,
      JSON.stringify(ALICE_TWO_VARIANT_WARDROBE)
    );
    const downloads = captureDownloads();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => rootApi.render(<AppV2 />));
      await uploadLogFile(container, ALICE_BOB_ALICE_LOG);
      await clearMessageImage(container, '첫 번째 대사');

      expect(getProfileImageUrl(container, '첫 번째 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );
      expect(getProfileImageUrl(container, '두 번째 대사')).toBe(
        'https://example.com/alice-casual.png'
      );

      await clearMessageImage(container, '두 번째 대사', 'all');
      await updateTextInput(
        container.querySelector('.title_input'),
        'https://example.com/clear-reparse.png'
      );
      expect(getProfileImageUrl(container, '첫 번째 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );
      expect(getProfileImageUrl(container, '두 번째 대사')).toBe(
        'https://ccfolia.com/blank.gif'
      );

      const jsonButton = Array.from(container.querySelectorAll('button')).find(
        (button) => button.textContent === '다운로드 (JSON)'
      );
      await act(async () => jsonButton.click());
      const json = JSON.parse(await readBlobText(downloads[0].blob));
      const aliceLines = json.lines.filter(({ speaker }) => speaker === '앨리스');
      expect(aliceLines.map(
        (line) => line.input.speakerImages.standing.url
      )).toEqual([
        'https://ccfolia.com/blank.gif',
        'https://ccfolia.com/blank.gif',
      ]);

      const stored = JSON.parse(sessionStorage.getItem(WARDROBE_STORAGE_KEY));
      expect(stored).toEqual(ALICE_TWO_VARIANT_WARDROBE);
      const storedKeys = collectObjectKeys(stored);
      [
        'messageId',
        'messageOverrides',
        'overrides',
        'applyScope',
        'scope',
        'imgUrl',
      ].forEach((forbiddenKey) => {
        expect(storedKeys).not.toContain(forbiddenKey);
      });
    } finally {
      await act(async () => rootApi.unmount());
      container.remove();
    }
  });
});

describe('AppV2 uploaded-file settings', () => {
  test('applies settings panel changes after confirming an uploaded file', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    await act(async () => {
      rootApi.render(<AppV2 />);
    });

    await uploadLogFile(
      container,
      `
        <div>
          <p><span>[main]</span> <span>KP</span> : <span>1D100 (1D100) ＞ 91</span></p>
          <p><span>[정보]</span> <span>system</span> : <span>장면 전환</span></p>
          <p><span>[room-a]</span> <span>PL</span> : <span>개별 탭 대사</span></p>
        </div>
      `
    );

    expect(container.querySelector('[data-dice="true"]')).not.toBeNull();
    expect(container.textContent).not.toContain('장면 전환');
    expect(container.textContent).toContain('개별 탭 대사');

    await act(async () => {
      container.querySelector('label[for="diceToggle"]').click();
    });

    expect(container.querySelector('[data-dice="true"]')).toBeNull();
    expect(container.textContent).toContain('1D100 (1D100) ＞ 91');

    await act(async () => {
      container.querySelector('label[for="cat-info"]').click();
    });

    expect(container.textContent).toContain('장면 전환');

    expect(container.querySelector('.cat-room-a.message-row-has-bg')).toBeNull();

    await act(async () => {
      container.querySelector('label[for="tabColorToggle"]').click();
    });

    expect(container.querySelector('.cat-room-a.message-row-has-bg')).not.toBeNull();

    const slider = container.querySelector('input[aria-label="텍스트 크기 조절"]');

    await act(async () => {
      setInputValue(slider, '140');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const preview = container.querySelector('#preview-scroll-box');

    expect(preview.style.getPropertyValue('--font-scale')).toBe('1.4');
    expect(preview.classList.contains('ccfolia_wrap')).toBe(true);

    await act(async () => {
      rootApi.unmount();
    });
    container.remove();
  });

  test('applies title images, end images, and system speaker styling from settings', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    await act(async () => {
      rootApi.render(<AppV2 />);
    });

    await uploadLogFile(
      container,
      `
        <div>
          <p><span>[main]</span> <span>SYS</span> : <span>시스템 문장</span></p>
          <p><span>[main]</span> <span>PL</span> : <span>일반 문장</span></p>
        </div>
      `
    );

    expect(container.querySelector('.cat-desc')).toBeNull();

    await updateTextInput(
      container.querySelector('.title_input'),
      'https://example.com/title-a.png, https://example.com/title-b.png'
    );
    await updateTextInput(
      container.querySelector('.end_input'),
      'https://example.com/end.png'
    );
    await updateTextInput(container.querySelector('.system_input'), 'SYS');

    const imageMessages = container.querySelectorAll('.message-container.image img');
    expect(imageMessages).toHaveLength(3);
    expect(imageMessages[0].getAttribute('src')).toBe('https://example.com/title-a.png');
    expect(imageMessages[1].getAttribute('src')).toBe('https://example.com/title-b.png');
    expect(imageMessages[2].getAttribute('src')).toBe('https://example.com/end.png');

    const systemRow = container.querySelector('.cat-desc');
    expect(systemRow).not.toBeNull();
    expect(systemRow.textContent).toContain('시스템 문장');

    await act(async () => {
      rootApi.unmount();
    });
    container.remove();
  });

  test('edits a message image and deletes a message after file upload', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    await act(async () => {
      rootApi.render(<AppV2 />);
    });

    await uploadLogFile(
      container,
      `
        <div>
          <p><span>[main]</span> <span>PL</span> : <span>이미지 수정 대상</span></p>
        </div>
      `
    );

    await applyMessageUrl(
      container,
      '이미지 수정 대상',
      'https://example.com/face.png'
    );

    expect(container.querySelector('.msg_container img').getAttribute('src')).toBe(
      'https://example.com/face.png'
    );

    await act(async () => {
      container.querySelector('button[title="Delete Message"]').click();
    });

    expect(container.textContent).not.toContain('이미지 수정 대상');

    await act(async () => {
      rootApi.unmount();
    });
    container.remove();
  });

  test('starts html, split html, and json downloads after file upload', async () => {
    const downloads = captureDownloads();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>PL</span> : <span>다운로드 대상</span></p>
          </div>
        `
      );

      const downloadButtons = Array.from(container.querySelectorAll('button')).filter(
        (button) => button.textContent.startsWith('다운로드')
      );

      expect(downloadButtons.map((button) => button.textContent)).toEqual([
        '다운로드 (HTML)',
        '다운로드 (분할 HTML)',
        '다운로드 (JSON)',
      ]);

      await act(async () => {
        downloadButtons[0].click();
      });
      await act(async () => {
        downloadButtons[1].click();
      });
      await act(async () => {
        downloadButtons[2].click();
      });

      expect(downloads.map((download) => download.download)).toEqual([
        'session.html',
        'session (1).html',
        'session.json',
      ]);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('locks the downloaded html message and image wrapper structure', async () => {
    const downloads = captureDownloads();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>PL</span> : <span>일반 대사</span></p>
            <p><span>[정보]</span> <span>system</span> : <span>정보 대사</span></p>
            <p><span>[잡담]</span> <span>PL2</span> : <span>잡담 대사</span></p>
            <p><span>[main]</span> <span>나레이션</span> : <span>설명 대사</span></p>
            <p><span>[main]</span> <span>PL</span> : <span>1D100 (1D100) ＞ 42</span></p>
          </div>
        `
      );

      await act(async () => {
        container.querySelector('label[for="cat-info"]').click();
        container.querySelector('label[for="cat-other"]').click();
      });

      await updateTextInput(
        container.querySelector('.title_input'),
        'https://example.com/title.png'
      );
      await updateTextInput(
        container.querySelector('.end_input'),
        'https://example.com/end.png'
      );
      await updateTextInput(container.querySelector('.system_input'), '나레이션');

      const htmlDownloadButton = Array.from(container.querySelectorAll('button')).find(
        (button) => button.textContent === '다운로드 (HTML)'
      );

      await act(async () => {
        htmlDownloadButton.click();
      });

      expect(downloads).toHaveLength(1);
      expect(downloads[0].download).toBe('session.html');

      const html = await readBlobText(downloads[0].blob);
      const exportedDocument = new DOMParser().parseFromString(html, 'text/html');
      const exportWrapper = exportedDocument.querySelector('body > .ccfolia_wrap');

      expect(exportWrapper).not.toBeNull();

      const rows = Array.from(
        exportedDocument.querySelectorAll('.ccfolia_wrap > .message-row')
      );
      expect(rows).toHaveLength(5);

      const normalRow = rows[0];
      expect(normalRow.textContent).toContain('PL');
      expect(normalRow.textContent).toContain('일반 대사');
      expectClassTokens(normalRow, [
        'gap',
        'message-row',
        'cat-main',
      ]);
      expect(normalRow.children).toHaveLength(2);
      expect(normalRow.firstElementChild.matches('.msg_container')).toBe(true);
      expect(normalRow.lastElementChild.matches('.message-body')).toBe(true);

      const standingImages = normalRow.querySelectorAll('.msg_container > img');
      expect(standingImages).toHaveLength(1);
      expect(standingImages[0].getAttribute('src')).toBe(
        'https://ccfolia.com/blank.gif'
      );

      const infoRow = rows.find((row) => row.textContent.includes('정보 대사'));
      expectClassTokens(infoRow, [
        'gap',
        'message-row',
        'cat-info',
      ]);
      expect(
        infoRow.querySelector('.message-body > .message-container > .info')
      ).not.toBeNull();

      const otherRow = rows.find((row) => row.textContent.includes('잡담 대사'));
      expectClassTokens(otherRow, [
        'gap',
        'message-row',
        'cat-other',
        'message-row-other',
      ]);
      expect(
        otherRow.querySelector('.message-body > .message-container.other > .other')
      ).not.toBeNull();

      const descriptionRow = rows.find((row) => row.textContent.includes('설명 대사'));
      expectClassTokens(descriptionRow, [
        'gap',
        'message-row',
        'cat-desc',
      ]);
      expect(descriptionRow.firstElementChild.tagName).toBe('DIV');
      expect(descriptionRow.firstElementChild.querySelector('span').textContent).toBe(
        '설명 대사'
      );

      const diceRow = rows.find((row) => row.textContent.includes('1D100'));
      expectClassTokens(diceRow, [
        'gap',
        'message-row',
        'cat-main',
      ]);
      expect(diceRow.querySelector('.message-body > [data-dice="true"]')).not.toBeNull();

      const imageWrappers = Array.from(exportWrapper.children).filter((element) =>
        element.matches('.message-container.image')
      );
      expect(imageWrappers).toHaveLength(2);
      expectClassTokens(imageWrappers[0], [
        'message-container',
        'image',
      ]);
      expectClassTokens(imageWrappers[1], [
        'message-container',
        'image',
      ]);
      expect(exportWrapper.firstElementChild).toBe(imageWrappers[0]);
      expect(exportWrapper.lastElementChild).toBe(imageWrappers[1]);
      expect(imageWrappers[0].children).toHaveLength(1);
      expect(imageWrappers[1].children).toHaveLength(1);
      expect(imageWrappers[0].firstElementChild.getAttribute('src')).toBe(
        'https://example.com/title.png'
      );
      expect(imageWrappers[1].firstElementChild.getAttribute('src')).toBe(
        'https://example.com/end.png'
      );

      expect(
        exportedDocument.querySelectorAll('button, input, select, textarea')
      ).toHaveLength(0);
      expect(
        exportedDocument.querySelectorAll(
          '[data-export-ignore], [data-wardrobe-id], [data-apply-scope]'
        )
      ).toHaveLength(0);
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('exports settings into html, split html, and json file contents', async () => {
    const downloads = captureDownloads();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>SYS</span> : <span>시스템 대사</span></p>
            <p><span>[정보]</span> <span>system</span> : <span>숨김 정보</span></p>
            <p><span>[room-a]</span> <span>PL</span> : <span>커스텀 탭 대사</span></p>
            <p><span>[main]</span> <span>PL</span> : <span>1D100 (1D100) ＞ 91</span></p>
          </div>
        `
      );

      await updateTextInput(container.querySelector('.title_input'), 'https://example.com/title.png');
      await updateTextInput(container.querySelector('.end_input'), 'https://example.com/end.png');
      await updateTextInput(container.querySelector('.system_input'), 'SYS');

      await act(async () => {
        container.querySelector('label[for="tabColorToggle"]').click();
      });

      await updateTextInput(container.querySelector('input[type="color"]'), '#123456');

      const slider = container.querySelector('input[aria-label="텍스트 크기 조절"]');
      await act(async () => {
        setInputValue(slider, '140');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });

      const downloadButtons = Array.from(container.querySelectorAll('button')).filter(
        (button) => button.textContent.startsWith('다운로드')
      );

      await act(async () => {
        downloadButtons[0].click();
      });
      await act(async () => {
        downloadButtons[1].click();
      });
      await act(async () => {
        downloadButtons[2].click();
      });

      const html = await readBlobText(downloads[0].blob);
      const splitHtml = await readBlobText(downloads[1].blob);
      const json = JSON.parse(await readBlobText(downloads[2].blob));
      const jsonText = JSON.stringify(json);

      [html, splitHtml].forEach((content) => {
        expect(content).toContain('--font-scale: 1.40');
        expect(content).toContain('https://example.com/title.png');
        expect(content).toContain('https://example.com/end.png');
        expect(content).toContain('시스템 대사');
        expect(content).toContain('cat-desc');
        expect(content).toContain('커스텀 탭 대사');
        expect(content).toContain('--row-bg-color: #123456');
        expect(content).toContain('data-dice="true"');
        expect(content).not.toContain('숨김 정보');
      });

      expect(json.lines.map((line) => line.text)).not.toContain('숨김 정보');
      expect(jsonText).toContain('https://example.com/title.png');
      expect(jsonText).toContain('https://example.com/end.png');
      expect(json.lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: '시스템 대사', role: 'system' }),
          expect.objectContaining({ text: '커스텀 탭 대사', role: 'character' }),
          expect.objectContaining({ text: '1D100 (1D100) ＞ 91', role: 'dice' }),
        ])
      );
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });

  test('keeps edited and deleted messages in every download after settings change', async () => {
    const downloads = captureDownloads();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => {
        rootApi.render(<AppV2 />);
      });

      await uploadLogFile(
        container,
        `
          <div>
            <p><span>[main]</span> <span>PL</span> : <span>원본 문장</span></p>
            <p><span>[main]</span> <span>NPC</span> : <span>삭제될 문장</span></p>
          </div>
        `
      );

      await applyMessageUrl(
        container,
        '원본 문장',
        'https://example.com/edited-face.png'
      );

      const editedImageMessage = container.querySelector('.msg-normal-text');
      const editedImageMessageButtons = editedImageMessage.querySelectorAll('button');

      await act(async () => {
        editedImageMessageButtons[1].click();
      });

      const messageTextInput = container.querySelector('.message-body input');
      await updateTextInput(messageTextInput, '수정된 문장');

      await act(async () => {
        messageTextInput.parentElement.querySelector('button').click();
      });

      await act(async () => {
        Array.from(container.querySelectorAll('button[title="Delete Message"]'))[1].click();
      });

      await updateTextInput(container.querySelector('.system_input'), 'SYS');

      const downloadButtons = Array.from(container.querySelectorAll('button')).filter(
        (button) => button.textContent.startsWith('다운로드')
      );

      await act(async () => {
        downloadButtons[0].click();
      });
      await act(async () => {
        downloadButtons[1].click();
      });
      await act(async () => {
        downloadButtons[2].click();
      });

      const html = await readBlobText(downloads[0].blob);
      const splitHtml = await readBlobText(downloads[1].blob);
      const json = JSON.parse(await readBlobText(downloads[2].blob));
      const jsonText = JSON.stringify(json);

      [html, splitHtml, jsonText].forEach((content) => {
        expect(content).toContain('수정된 문장');
        expect(content).toContain('https://example.com/edited-face.png');
        expect(content).not.toContain('원본 문장');
        expect(content).not.toContain('삭제될 문장');
      });
    } finally {
      await act(async () => {
        rootApi.unmount();
      });
      container.remove();
    }
  });
});

describe('AppV2 open standing editor export contract', () => {
  test('exports one final dialogue image without editor drafts or schema metadata', async () => {
    const dialogueText =
      'wardrobe variantId applyScope messageOverrides도 대사로 보존';
    const finalUrl =
      'https://example.com/wardrobe/variantId/applyScope/messageOverrides/standing-image-editor.png';
    sessionStorage.setItem(
      WARDROBE_STORAGE_KEY,
      JSON.stringify(ALICE_TWO_VARIANT_WARDROBE)
    );
    const downloads = captureDownloads();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => rootApi.render(<AppV2 />));
      await uploadLogFile(
        container,
        `<p><span>[main]</span> <span>앨리스</span> : <span>${dialogueText}</span></p>`
      );
      await applyMessageUrl(
        container,
        dialogueText,
        finalUrl
      );

      let downloadButtons = Array.from(container.querySelectorAll('button')).filter(
        (button) => button.textContent.startsWith('다운로드')
      );
      await act(async () => downloadButtons[0].click());
      await act(async () => downloadButtons[1].click());
      await act(async () => downloadButtons[2].click());

      const editor = await openStandingEditor(container, dialogueText);
      await updateTextInput(
        editor.querySelector('input[type="url"]'),
        'https://example.com/unapplied-draft.png'
      );
      expect(container.querySelector('.standing-image-editor')).not.toBeNull();

      downloadButtons = Array.from(container.querySelectorAll('button')).filter(
        (button) => button.textContent.startsWith('다운로드')
      );
      await act(async () => downloadButtons[0].click());
      await act(async () => downloadButtons[1].click());
      await act(async () => downloadButtons[2].click());

      expect(downloads.map(({ download }) => download)).toEqual([
        'session.html',
        'session (1).html',
        'session.json',
        'session.html',
        'session (1).html',
        'session.json',
      ]);

      const closedHtml = await readBlobText(downloads[0].blob);
      const closedSplitHtml = await readBlobText(downloads[1].blob);
      const closedJson = JSON.parse(await readBlobText(downloads[2].blob));
      const html = await readBlobText(downloads[3].blob);
      const splitHtml = await readBlobText(downloads[4].blob);
      const jsonText = await readBlobText(downloads[5].blob);
      const forbiddenSelector = [
        '[data-export-ignore]',
        '[data-wardrobe-id]',
        '[data-apply-scope]',
        '[aria-controls]',
        '[aria-expanded]',
        '[aria-invalid]',
        'form',
        'button',
        'input',
        'select',
        'textarea',
        'label',
        'fieldset',
        'legend',
      ].join(', ');

      expect(normalizeHtmlExport(html)).toEqual(
        normalizeHtmlExport(closedHtml)
      );
      expect(normalizeHtmlExport(splitHtml)).toEqual(
        normalizeHtmlExport(closedSplitHtml)
      );

      [html, splitHtml].forEach((content) => {
        expect(content.split(dialogueText)).toHaveLength(2);
        expect(content).toContain(finalUrl);
        expect(content).not.toContain('https://example.com/unapplied-draft.png');
        expect(content).not.toContain('URL 적용');

        const exportedDocument = new DOMParser().parseFromString(
          content,
          'text/html'
        );
        const row = exportedDocument.querySelector('.message-row');
        expect(row.querySelector('.msg-normal-text > span').textContent).toBe(dialogueText);
        expect(row.querySelector('.msg_container > img').getAttribute('src')).toBe(
          finalUrl
        );
        expect(exportedDocument.querySelectorAll(forbiddenSelector)).toHaveLength(0);
      });

      const json = JSON.parse(jsonText);
      expect(normalizeEbookExport(json)).toEqual(
        normalizeEbookExport(closedJson)
      );
      expect(Object.keys(json).sort()).toEqual(
        ['schemaVersion', 'ebookView', 'lines'].sort()
      );
      expect(json.schemaVersion).toBe(1);
      expect(json.lines).toHaveLength(1);
      expect(Object.keys(json.lines[0]).sort()).toEqual(
        ['id', 'speaker', 'role', 'timestamp', 'text', 'safetext', 'input'].sort()
      );
      expect(json.lines[0].text).toBe(dialogueText);
      expect(json.lines[0].input).toEqual({
        speakerImages: {
          standing: { url: finalUrl },
        },
      });
      expect(jsonText).not.toContain('https://example.com/unapplied-draft.png');
      const jsonKeys = collectObjectKeys(json);
      [
        'wardrobe',
        'variantId',
        'applyScope',
        'messageOverrides',
        'standing-image-editor',
      ].forEach((forbiddenKey) => {
        expect(jsonKeys).not.toContain(forbiddenKey);
      });
    } finally {
      await act(async () => rootApi.unmount());
      container.remove();
    }
  });

  test('keeps the saved standing URL in every export after a preview load error', async () => {
    const savedUrl = 'https://example.com/unavailable-standing.png';
    const downloads = captureDownloads();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    try {
      await act(async () => rootApi.render(<AppV2 />));
      await uploadLogFile(
        container,
        '<p><span>[main]</span> <span>앨리스</span> : <span>로드 실패 대사</span></p>'
      );
      await applyMessageUrl(container, '로드 실패 대사', savedUrl);

      const previewImage = getMessageRowByText(container, '로드 실패 대사')
        .querySelector('.msg_container > img');
      await act(async () => {
        previewImage.dispatchEvent(new Event('error', { bubbles: false }));
      });
      expect(previewImage.getAttribute('src')).toBe(
        'https://ccfolia.com/blank.gif'
      );

      const downloadButtons = Array.from(container.querySelectorAll('button')).filter(
        (button) => button.textContent.startsWith('다운로드')
      );
      await act(async () => downloadButtons[0].click());
      await act(async () => downloadButtons[1].click());
      await act(async () => downloadButtons[2].click());

      const html = await readBlobText(downloads[0].blob);
      const splitHtml = await readBlobText(downloads[1].blob);
      const json = JSON.parse(await readBlobText(downloads[2].blob));

      [html, splitHtml].forEach((content) => {
        const exportedDocument = new DOMParser().parseFromString(
          content,
          'text/html'
        );
        const exportedImage = exportedDocument.querySelector(
          '.message-row .msg_container > img'
        );
        expect(exportedImage.getAttribute('src')).toBe(savedUrl);
        expect(exportedImage.hasAttribute('data-export-src')).toBe(false);
      });
      expect(json.lines[0].input.speakerImages.standing.url).toBe(savedUrl);
    } finally {
      await act(async () => rootApi.unmount());
      container.remove();
    }
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

describe('AppV2 narrow-screen accessibility CSS', () => {
  test('stacks the fixed layout and constrains wardrobe content without horizontal overflow', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/v2/AppV2.css'),
      'utf8'
    );
    const narrowMediaStart = css.indexOf('@media (max-width: 800px)');

    expect(narrowMediaStart).toBeGreaterThanOrEqual(0);
    const narrowCss = css.slice(narrowMediaStart);
    expect(narrowCss).toMatch(
      /\.fix-layout\s*\{[^}]*flex-direction:\s*column/
    );
    expect(narrowCss).toMatch(
      /\.setting_container,\s*\.preview-wrapper\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/
    );
    expect(narrowCss).toMatch(
      /\.preview-scroll-box\s*\{[^}]*width:\s*100%[^}]*max-width:\s*100%/
    );
    expect(css).toMatch(
      /\.standing-wardrobe-card\s*\{[^}]*min-width:\s*0/
    );
    expect(css).toMatch(
      /\.standing-wardrobe-variant\s*\{[^}]*min-width:\s*0/
    );
    expect(css).toMatch(
      /\.standing-wardrobe-thumbnail\s*\{[^}]*max-width:\s*100%/
    );
    expect(css).toMatch(
      /\.standing-wardrobe-actions button,\s*\.standing-wardrobe-add-button\s*\{[^}]*min-width:\s*0[^}]*overflow-wrap:\s*anywhere/
    );
  });

  test('wraps the line standing editor at phone width with visible focus styles', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/v2/AppV2.css'),
      'utf8'
    );

    expect(css).toMatch(
      /\.standing-image-editor\s*\{[^}]*width:\s*100%[^}]*max-width:\s*100%[^}]*min-width:\s*0/
    );
    expect(css).toMatch(
      /\.standing-image-editor-scopes\s*\{[^}]*flex-wrap:\s*wrap/
    );
    expect(css).toMatch(
      /\.standing-image-editor-scopes label\s*\{[^}]*min-width:\s*0[^}]*overflow-wrap:\s*anywhere/
    );
    expect(css).toMatch(
      /\.standing-image-editor-actions\s*\{[^}]*flex-wrap:\s*wrap/
    );
    expect(css).toMatch(
      /\.standing-image-editor button:focus-visible,[\s\S]*\.standing-image-editor input:focus-visible,[\s\S]*\.standing-image-editor select:focus-visible\s*\{[^}]*outline:/
    );
    expect(css).toMatch(
      /@media \(max-width:\s*400px\)[\s\S]*\.standing-image-editor button\s*\{[^}]*width:\s*100%/
    );
  });
});
