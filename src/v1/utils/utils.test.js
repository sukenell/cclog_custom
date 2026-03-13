import { processMessageTag } from './utils';

const t = (key) => {
  const map = {
    'preview.secret': '비밀',
    'preview.judgment': '판정',
    'setting.info': '정보',
  };
  return map[key] || key;
};

const baseArgs = () => ({
  type: 'html',
  charHeads: {},
  charColors: { Alice: '#ffffff' },
  diceEnabled: false,
  secretEnabled: false,
  tabColorEnabled: false,
  tabColors: { custom: '#525569' },
  limitLines: true,
  count: { main: 0, info: 0, other: 0, custom: 0 },
  parsedDivs: [],
  lastCharName: null,
  lastCategory: null,
  inputTexts: [],
  selectedCategories: { main: true, info: true, other: true, custom: true },
});

function runProcessWithP(p, overrides = {}) {
  const args = { ...baseArgs(), ...overrides };

  processMessageTag(
    p,
    args.type,
    t,
    args.charHeads,
    args.charColors,
    args.diceEnabled,
    () => {},
    args.secretEnabled,
    () => {},
    args.tabColorEnabled,
    () => {},
    args.tabColors,
    () => {},
    args.limitLines,
    args.count,
    args.parsedDivs,
    args.lastCharName,
    args.lastCategory,
    args.inputTexts,
    args.selectedCategories,
    () => {}
  );

  return args;
}

describe('processMessageTag', () => {
  test('does not apply dice styling for custom category when diceEnabled is false', () => {
    const p = document.createElement('p');
    p.innerHTML = '<span>[custom]</span> <span>Alice</span> : <span>CC<=50 성공</span>';

    const { parsedDivs } = runProcessWithP(p, { diceEnabled: false });
    const html = parsedDivs.join('');

    expect(html).not.toContain('판정');
    expect(html).not.toContain('flow-root');
  });

  test('applies explicit main background color in generated html', () => {
    const p = document.createElement('p');
    p.innerHTML = '<span>[main]</span> <span>Alice</span> : <span>일반 대사</span>';

    const { parsedDivs } = runProcessWithP(p, { selectedCategories: { main: true, info: true, other: true } });
    const html = parsedDivs.join('');

    expect(html).toContain('background-color: #313131');
    expect(html).not.toContain('background-color: transparent');
  });

  test('removes imported dice styling from custom category when diceEnabled is false', () => {
    const p = document.createElement('p');
    p.innerHTML =
      '<span>[custom]</span> <span>Alice</span> : <span><span style="color: rgb(255, 0, 0); font-weight: bold;">CC<=50 성공</span></span>';

    const { parsedDivs } = runProcessWithP(p, { diceEnabled: false });
    const html = parsedDivs.join('');

    expect(html).not.toContain('판정');
    expect(html).not.toContain('flow-root');
    expect(html).not.toContain('rgb(255, 0, 0)');
    expect(html).not.toContain('font-weight: bold;');
  });

  test('does not inject dice presentation for custom json category when diceEnabled is false', () => {
    const p = document.createElement('p');
    p.innerHTML = '<span>[custom]</span> <span>Alice</span><b> - 2025/01/01</b> : <span>CC<=50 성공</span>';

    const { parsedDivs } = runProcessWithP(p, {
      type: 'json',
      charHeads: '',
      charColors: '#ffffff',
      diceEnabled: false,
    });
    const html = parsedDivs.join('');

    expect(html).not.toContain('판정');
    expect(html).not.toContain('flow-root');
    expect(html).toContain('background-color: #525569');
  });
});
