import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import PreviewPanel from './PreviewPanel';

describe('PreviewPanel divider markup', () => {
  test('renders message-divider as a non-hr block element', () => {
    const messages = [
      { id: '1', category: 'main', text: 'a', charName: 'A', imgUrl: '', color: '#fff' },
      { id: '2', category: 'main', text: 'b', charName: 'B', imgUrl: '', color: '#fff' },
    ];

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    flushSync(() => {
      rootApi.render(
        <PreviewPanel
          messages={messages}
          updateMessage={() => {}}
          selectedCategories={{ main: true }}
          tabColors={{}}
          charColors={{}}
          charHeads={{}}
          diceEnabled={false}
          secretEnabled={false}
          inputTexts={[]}
          onExportHTML={() => {}}
          onExportSplitHTML={() => {}}
          onExportJSON={() => {}}
          tabColorEnabled={false}
          globalFontPercent={100}
        />
      );
    });

    const divider = container.querySelector('.message-divider');
    expect(divider).not.toBeNull();
    expect(divider.tagName).toBe('DIV');
    expect(container.querySelector('hr.message-divider')).toBeNull();

    rootApi.unmount();
    container.remove();
  });

  test('does not render a json download button', () => {
    const messages = [
      { id: '1', category: 'main', text: 'a', charName: 'A', imgUrl: '', color: '#fff' },
    ];

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);
    const onExportJSON = jest.fn();

    flushSync(() => {
      rootApi.render(
        <PreviewPanel
          messages={messages}
          updateMessage={() => {}}
          selectedCategories={{ main: true }}
          tabColors={{}}
          charColors={{}}
          charHeads={{}}
          diceEnabled={false}
          secretEnabled={false}
          inputTexts={[]}
          onExportHTML={() => {}}
          onExportSplitHTML={() => {}}
          onExportJSON={onExportJSON}
          tabColorEnabled={false}
          globalFontPercent={100}
        />
      );
    });

    const jsonButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === '다운로드 (JSON)'
    );

    expect(jsonButton).toBeUndefined();
    expect(onExportJSON).not.toHaveBeenCalled();

    rootApi.unmount();
    container.remove();
  });
});
