import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import PreviewPanel from './PreviewPanel';

describe('PreviewPanel divider markup', () => {
  test('renders message-divider without inline style attribute', () => {
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

    const divider = container.querySelector('hr.message-divider');
    expect(divider).not.toBeNull();
    expect(divider.getAttribute('style')).toBeNull();

    rootApi.unmount();
    container.remove();
  });
});
