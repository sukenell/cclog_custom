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

  test('renders a json download button wired to the export action', () => {
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

    expect(jsonButton).not.toBeUndefined();

    flushSync(() => {
      jsonButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onExportJSON).toHaveBeenCalledTimes(1);

    rootApi.unmount();
    container.remove();
  });

  test('passes the delete action through to rendered log items', () => {
    const messages = [
      { id: 'delete-me', category: 'main', text: 'a', charName: 'A', imgUrl: '', color: '#fff' },
    ];

    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);
    const deleteMessage = jest.fn();

    flushSync(() => {
      rootApi.render(
        <PreviewPanel
          messages={messages}
          updateMessage={() => {}}
          deleteMessage={deleteMessage}
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

    const deleteButton = container.querySelector('button[title="Delete Message"]');
    expect(deleteButton).not.toBeNull();

    flushSync(() => {
      deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(deleteMessage).toHaveBeenCalledTimes(1);
    expect(deleteMessage).toHaveBeenCalledWith('delete-me');

    rootApi.unmount();
    container.remove();
  });

  test('passes the matching character variants and row message id to standing callbacks', () => {
    const messages = [
      {
        id: 'alice-line',
        category: 'main',
        text: '앨리스 대사',
        charName: '앨리스',
        imgUrl: 'https://example.com/current.png',
        color: '#fff',
      },
      {
        id: 'bob-line',
        category: 'main',
        text: '밥 대사',
        charName: '밥',
        imgUrl: '',
        color: '#fff',
      },
    ];
    const wardrobe = {
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
        '밥': {
          displayName: '밥',
          activeVariantId: null,
          variants: [
            {
              id: 'bob-only',
              label: '밥 전용',
              url: 'https://example.com/bob.png',
            },
          ],
        },
      },
    };
    const onApplyStandingVariant = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    flushSync(() => {
      rootApi.render(
        <PreviewPanel
          messages={messages}
          updateMessage={() => {}}
          deleteMessage={() => {}}
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
          wardrobe={wardrobe}
          onApplyStandingVariant={onApplyStandingVariant}
          onApplyStandingUrl={() => {}}
          standingScopes={['single', 'all']}
          t={(value) => value}
        />
      );
    });

    try {
      const aliceRow = Array.from(container.querySelectorAll('.message-row')).find(
        (row) => row.textContent.includes('앨리스 대사')
      );
      flushSync(() => {
        aliceRow.querySelector('button[title="Change Image"]').click();
      });

      const editor = aliceRow.querySelector('.standing-image-editor');
      expect(Array.from(editor.querySelectorAll('option')).map(
        (option) => option.textContent
      )).toEqual(['@평상복 [기본]', '@전투']);
      expect(editor.textContent).not.toContain('밥 전용');

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

      expect(onApplyStandingVariant).toHaveBeenCalledWith(
        'alice-line',
        'battle',
        'https://example.com/alice-battle.png',
        'single'
      );
    } finally {
      rootApi.unmount();
      container.remove();
    }
  });
});
