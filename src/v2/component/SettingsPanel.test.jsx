import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SettingsPanel from './SettingsPanel';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const defaultProps = {
  t: (key) => key,
  selectedCategories: { main: true, info: false, other: false },
  messages: [],
  diceEnabled: true,
  setDiceEnabled: jest.fn(),
  tabColorEnabled: false,
  setTabColorEnabled: jest.fn(),
  tabColors: {},
  setTabColor: jest.fn(),
  globalFontPercent: 100,
  setGlobalFontPercent: jest.fn(),
};

describe('SettingsPanel category detection', () => {
  test('does not update selected categories when no new category exists', async () => {
    const setSelectedCategories = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    await act(async () => {
      rootApi.render(
        <SettingsPanel
          {...defaultProps}
          setSelectedCategories={setSelectedCategories}
        />
      );
    });

    expect(setSelectedCategories).not.toHaveBeenCalled();

    await act(async () => {
      rootApi.unmount();
    });
    container.remove();
  });
});
