import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import LogItem from './LogItem';

describe('LogItem class naming', () => {
  test('prefixes category classes to avoid collision with styling utility classes', () => {
    const message = {
      id: '1',
      category: 'dice',
      text: '일반 텍스트',
      charName: 'Alice',
      imgUrl: 'https://ccfolia.com/blank.gif',
      color: '#fff',
      backgroundColor: '#123456',
      timestamp: null,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    flushSync(() => {
      rootApi.render(
        <LogItem
          message={message}
          t={(s) => s}
          updateMessage={() => {}}
          diceEnabled={false}
          inputTexts={[]}
          tabColorEnabled={false}
        />
      );
    });

    const root = container.firstChild;
    expect(root.className).toContain('cat-dice');
    expect(root.className.split(' ')).not.toContain('dice');
    expect(root.getAttribute('style')).toBeNull();

    rootApi.unmount();
    container.remove();
  });

  test('calls delete handler with the message id from the delete action', () => {
    const message = {
      id: 'delete-me',
      category: 'main',
      text: '삭제할 텍스트',
      charName: 'Alice',
      imgUrl: 'https://ccfolia.com/blank.gif',
      color: '#fff',
      backgroundColor: '#123456',
      timestamp: null,
    };
    const onDeleteMessage = jest.fn();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    flushSync(() => {
      rootApi.render(
        <LogItem
          message={message}
          t={(s) => s}
          updateMessage={() => {}}
          onDeleteMessage={onDeleteMessage}
          diceEnabled={false}
          inputTexts={[]}
          tabColorEnabled={false}
        />
      );
    });

    const deleteButton = container.querySelector('button[title="Delete Message"]');
    expect(deleteButton).not.toBeNull();

    flushSync(() => {
      deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onDeleteMessage).toHaveBeenCalledTimes(1);
    expect(onDeleteMessage).toHaveBeenCalledWith('delete-me');

    rootApi.unmount();
    container.remove();
  });

  test('renders a dice judgement header for 1D100 rolls without result labels', () => {
    const message = {
      id: 'plain-d100',
      category: 'main',
      text: '1D100 (1D100) ＞ 91',
      charName: 'Alice',
      imgUrl: 'https://ccfolia.com/blank.gif',
      color: '#fff',
      backgroundColor: '#123456',
      timestamp: null,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    flushSync(() => {
      rootApi.render(
        <LogItem
          message={message}
          t={(s) => s}
          updateMessage={() => {}}
          onDeleteMessage={() => {}}
          diceEnabled={true}
          inputTexts={[]}
          tabColorEnabled={false}
        />
      );
    });

    const diceBlock = container.querySelector('[data-dice="true"]');
    expect(diceBlock).not.toBeNull();
    expect(diceBlock.textContent).toContain('Alice - 판정');
    expect(diceBlock.textContent).toContain('1D100 (1D100) ＞ 91');
    expect(container.querySelector('.msg_container')).toBeNull();

    rootApi.unmount();
    container.remove();
  });

  test('shows an edit action for styled dice rolls and opens text editing', () => {
    const message = {
      id: 'dice-edit',
      category: 'main',
      text: '1D100 (1D100) ＞ 91',
      charName: 'Alice',
      imgUrl: 'https://ccfolia.com/blank.gif',
      color: '#fff',
      backgroundColor: '#123456',
      timestamp: null,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    flushSync(() => {
      rootApi.render(
        <LogItem
          message={message}
          t={(s) => s}
          updateMessage={() => {}}
          onDeleteMessage={() => {}}
          diceEnabled={true}
          inputTexts={[]}
          tabColorEnabled={false}
        />
      );
    });

    const diceBlock = container.querySelector('[data-dice="true"]');
    const editButton = diceBlock.querySelector('button[title="Edit Message"]');
    expect(editButton).not.toBeNull();

    flushSync(() => {
      editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect(input.value).toBe('1D100 (1D100) ＞ 91');

    rootApi.unmount();
    container.remove();
  });

  test('matches system styling names after trimming speaker whitespace', () => {
    const message = {
      id: 'trimmed-speaker',
      category: 'main',
      text: '앞 공백 화자',
      charName: ' 이름',
      imgUrl: 'https://ccfolia.com/blank.gif',
      color: '#fff',
      backgroundColor: '#123456',
      timestamp: null,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    flushSync(() => {
      rootApi.render(
        <LogItem
          message={message}
          t={(s) => s}
          updateMessage={() => {}}
          onDeleteMessage={() => {}}
          diceEnabled={false}
          inputTexts={['이름']}
          tabColorEnabled={false}
        />
      );
    });

    const root = container.firstChild;
    expect(root.className).toContain('cat-desc');
    expect(root.textContent).toContain('앞 공백 화자');

    rootApi.unmount();
    container.remove();
  });

  test('applies system styling by speaker name regardless of message category', () => {
    const message = {
      id: 'secret-speaker',
      category: '秘密(匿名者,넬)',
      text: '비밀 탭 화자',
      charName: 'sdfsdf',
      imgUrl: 'https://ccfolia.com/blank.gif',
      color: '#fff',
      backgroundColor: '#123456',
      timestamp: null,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    flushSync(() => {
      rootApi.render(
        <LogItem
          message={message}
          t={(s) => s}
          updateMessage={() => {}}
          onDeleteMessage={() => {}}
          diceEnabled={false}
          inputTexts={['sdfsdf']}
          tabColorEnabled={false}
        />
      );
    });

    const root = container.firstChild;
    expect(root.className).toContain('cat-desc');
    expect(root.textContent).toContain('비밀 탭 화자');

    rootApi.unmount();
    container.remove();
  });
});

describe('LogItem standing image editor', () => {
  const message = {
    id: 'alice-line',
    category: 'main',
    text: '원문 대사',
    charName: '앨리스',
    imgUrl: 'https://example.com/current.png',
    color: '#fff',
    backgroundColor: '#123456',
    timestamp: null,
  };
  const characterWardrobe = {
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
  };

  const renderItem = (overrides = {}) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);
    const props = {
      message,
      t: (value) => value,
      updateMessage: jest.fn(),
      onDeleteMessage: jest.fn(),
      diceEnabled: false,
      inputTexts: [],
      tabColorEnabled: false,
      characterWardrobe,
      onApplyStandingVariant: jest.fn(),
      onApplyStandingUrl: jest.fn(),
      standingScopes: ['single', 'all'],
      ...overrides,
    };

    flushSync(() => {
      rootApi.render(<LogItem {...props} />);
    });

    return {
      container,
      props,
      cleanup: () => {
        rootApi.unmount();
        container.remove();
      },
    };
  };

  test('keeps normal dialogue rendered and opens the editor as its sibling', () => {
    const { container, cleanup } = renderItem();

    try {
      const trigger = container.querySelector('button[title="Change Image"]');
      const textBlock = container.querySelector('.msg-normal-text');
      const controlledId = trigger.getAttribute('aria-controls');

      expect(trigger.tagName).toBe('BUTTON');
      expect(trigger.getAttribute('aria-label')).toBe('Change Image');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(textBlock.querySelector('span').textContent).toBe('원문 대사');

      trigger.focus();
      flushSync(() => {
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const editor = container.querySelector(`#${controlledId}`);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(editor).not.toBeNull();
      expect(editor.previousElementSibling).toBe(textBlock);
      expect(textBlock.contains(editor)).toBe(false);
      expect(textBlock.querySelector('span').textContent).toBe('원문 대사');
      expect(document.activeElement).toBe(editor.querySelector('select'));
    } finally {
      cleanup();
    }
  });

  test('passes the message id for variant apply, closes, announces, and returns focus', () => {
    const { container, props, cleanup } = renderItem();

    try {
      const trigger = container.querySelector('button[title="Change Image"]');
      flushSync(() => trigger.click());
      const editor = container.querySelector('.standing-image-editor');
      const select = editor.querySelector('select');

      flushSync(() => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          'value'
        ).set;
        setter.call(select, 'battle');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const applyButton = Array.from(editor.querySelectorAll('button')).find(
        (button) => button.textContent === '선택 이미지 적용'
      );
      flushSync(() => applyButton.click());

      expect(props.onApplyStandingVariant).toHaveBeenCalledWith(
        'alice-line',
        'battle',
        'https://example.com/alice-battle.png',
        'single'
      );
      expect(container.querySelector('.standing-image-editor')).toBeNull();
      expect(document.activeElement).toBe(trigger);
      const status = container.querySelector('[role="status"]');
      expect(status.textContent).toBe('이미지를 적용했습니다.');
      expect(status.getAttribute('data-export-ignore')).toBe('true');
      expect(container.textContent).not.toMatch(/\d+\s*개 대사|대사에 적용/);
    } finally {
      cleanup();
    }
  });

  test('uses the direct URL callback for clear and supports cancel focus return', () => {
    const { container, props, cleanup } = renderItem();

    try {
      const trigger = container.querySelector('button[title="Change Image"]');
      flushSync(() => trigger.click());
      const editor = container.querySelector('.standing-image-editor');
      const allRadio = editor.querySelector('input[value="all"]');
      const clearButton = Array.from(editor.querySelectorAll('button')).find(
        (button) => button.textContent === '이미지 비우기'
      );

      flushSync(() => allRadio.click());
      flushSync(() => clearButton.click());

      expect(props.onApplyStandingUrl).toHaveBeenCalledWith(
        'alice-line',
        '',
        'all'
      );
      expect(document.activeElement).toBe(trigger);
      expect(container.querySelector('[role="status"]').textContent).toBe(
        '이미지를 비웠습니다.'
      );

      flushSync(() => trigger.click());
      const cancelButton = Array.from(
        container.querySelectorAll('.standing-image-editor button')
      ).find((button) => button.textContent === '취소');
      flushSync(() => cancelButton.click());

      expect(container.querySelector('.standing-image-editor')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    } finally {
      cleanup();
    }
  });

  test('gives the legacy text edit control, field, and save action accessible names', () => {
    const { container, cleanup } = renderItem();

    try {
      const editButton = container.querySelector(
        '.msg-normal-text button[aria-label="Edit Message"]'
      );
      expect(editButton).not.toBeNull();

      flushSync(() => editButton.click());

      const editInput = container.querySelector('.message-body input');
      const saveButton = container.querySelector(
        '.message-body button[aria-label="Save Message"]'
      );
      expect(editInput.getAttribute('aria-label')).toBe('Edit message text');
      expect(saveButton).not.toBeNull();
    } finally {
      cleanup();
    }
  });

  test.each([
    ['other', false, []],
    ['info', false, []],
    ['main', false, ['앨리스']],
    ['main', true, []],
  ])('does not show the standing action for %s excluded rendering', (
    category,
    diceEnabled,
    inputTexts
  ) => {
    const excludedMessage = {
      ...message,
      category,
      text: diceEnabled ? '1D100 (1D100) ＞ 42' : message.text,
    };
    const { container, cleanup } = renderItem({
      message: excludedMessage,
      diceEnabled,
      inputTexts,
    });

    try {
      expect(container.querySelector('button[title="Change Image"]')).toBeNull();
    } finally {
      cleanup();
    }
  });
});
