jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AppV2, { buildMinimalExportCSS, removeMessageById } from './AppV2';
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

  const imageInput = container.querySelector(
    'input[placeholder="Image URL..."]'
  );
  await updateTextInput(imageInput, url);

  await act(async () => {
    imageInput.parentElement.querySelector('button').click();
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

    await act(async () => {
      container.querySelector('button[title="Change Image"]').click();
    });

    const imageInput = container.querySelector('input[placeholder="Image URL..."]');
    await updateTextInput(imageInput, 'https://example.com/face.png');

    await act(async () => {
      imageInput.parentElement.querySelector('button').click();
    });

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

      const firstMessage = container.querySelector('.msg-normal-text');

      await act(async () => {
        firstMessage.querySelector('button[title="Change Image"]').click();
      });

      const imageInput = container.querySelector('input[placeholder="Image URL..."]');
      await updateTextInput(imageInput, 'https://example.com/edited-face.png');

      await act(async () => {
        imageInput.parentElement.querySelector('button').click();
      });

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
