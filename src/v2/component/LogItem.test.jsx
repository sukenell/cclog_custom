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
});
