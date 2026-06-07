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
