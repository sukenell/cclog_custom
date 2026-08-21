import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'fs';
import path from 'path';
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

const renderSettings = async (props = {}) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rootApi = createRoot(container);

  await act(async () => {
    rootApi.render(
      <SettingsPanel
        {...defaultProps}
        setSelectedCategories={jest.fn()}
        {...props}
      />
    );
  });

  return { container, rootApi };
};

const cleanupSettings = async ({ container, rootApi }) => {
  await act(async () => rootApi.unmount());
  container.remove();
};

describe('SettingsPanel accessibility', () => {
  test('names the category and style checkbox groups without skipped headings', async () => {
    const rendered = await renderSettings();

    try {
      const groups = Array.from(
        rendered.container.querySelectorAll('[role="group"][aria-labelledby]')
      );

      expect(groups).toHaveLength(2);
      expect(groups.map((group) => {
        const heading = rendered.container.querySelector(
          `#${group.getAttribute('aria-labelledby')}`
        );
        return heading?.textContent;
      })).toEqual([
        expect.stringContaining('02-1.'),
        expect.stringContaining('02-2.'),
      ]);
      expect(rendered.container.querySelectorAll('h3')).toHaveLength(3);
      expect(rendered.container.querySelector('h4')).toBeNull();
    } finally {
      await cleanupSettings(rendered);
    }
  });

  test('keeps native checkboxes keyboard focusable and paired with labels', async () => {
    const rendered = await renderSettings();

    try {
      const checkboxes = Array.from(
        rendered.container.querySelectorAll('input[type="checkbox"]')
      );
      expect(checkboxes.length).toBeGreaterThan(0);

      checkboxes.forEach((checkbox) => {
        const label = rendered.container.querySelector(`label[for="${checkbox.id}"]`);
        expect(checkbox.tabIndex).toBe(0);
        expect(checkbox.getAttribute('aria-hidden')).toBeNull();
        expect(label).not.toBeNull();
      });

      checkboxes[0].focus();
      expect(document.activeElement).toBe(checkboxes[0]);
    } finally {
      await cleanupSettings(rendered);
    }
  });

  test('gives each dynamic color input a translated or safe fallback name', async () => {
    const rendered = await renderSettings({
      selectedCategories: { main: true, custom: true },
      messages: [{ id: 'custom-1', category: 'custom' }],
      tabColorEnabled: true,
    });

    try {
      const colorInput = rendered.container.querySelector('input[type="color"]');
      expect(colorInput).not.toBeNull();
      expect(colorInput.getAttribute('aria-label')).toContain('custom');
      expect(colorInput.getAttribute('aria-label')).not.toContain('setting.');
    } finally {
      await cleanupSettings(rendered);
    }
  });

  test('uses reusable responsive slider classes without an inline minimum width', async () => {
    const rendered = await renderSettings();

    try {
      const slider = rendered.container.querySelector('input[type="range"]');
      expect(slider.classList.contains('font-size-slider')).toBe(true);
      expect(slider.parentElement.classList.contains('font-size-row')).toBe(true);
      expect(slider.style.minWidth).toBe('');
    } finally {
      await cleanupSettings(rendered);
    }
  });

  test('visually hides native checkboxes while preserving a clear label focus ring', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/v2/AppV2.css'),
      'utf8'
    );
    const checkboxRule = css.match(
      /\.skinTypeCheck input\[type="checkbox"\]\s*\{([^}]*)\}/
    );

    expect(checkboxRule).not.toBeNull();
    expect(checkboxRule[1]).not.toMatch(/display:\s*none/);
    expect(checkboxRule[1]).toMatch(/position:\s*absolute/);
    expect(checkboxRule[1]).toMatch(/clip-path:\s*inset\(50%\)/);
    expect(css).toMatch(
      /\.skinTypeCheck input\[type="checkbox"\]:focus-visible\s*\+\s*label\s*\{[^}]*outline:\s*3px solid/
    );
  });
});
