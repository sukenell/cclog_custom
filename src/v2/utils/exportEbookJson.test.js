import { buildEbookJson, parseDiceFromText, toSafeText } from './exportEbookJson';

describe('exportEbookJson', () => {
  test('builds lines with required mapping and includes image category', () => {
    const messages = [
      {
        id: 'a',
        category: 'main',
        charName: 'KP',
        text: '일반 대사',
        imgUrl: 'https://i.imgur.com/a.png',
        timestamp: '2025-01-01T13:25:00+09:00',
        isDice: false,
      },
      {
        id: 'b',
        category: 'other',
        charName: 'PL',
        text: '잡담!',
        imgUrl: 'https://i.imgur.com/b.png',
        timestamp: '2025-01-01T20:42:00+09:00',
        isDice: false,
      },
      {
        id: 'c',
        category: 'secret',
        charName: 'A',
        text: 'CC(+1)<=55 굴림: 67',
        imgUrl: 'https://i.imgur.com/c.png',
        timestamp: '2025-01-01T20:42:00+09:00',
        isDice: true,
      },
      {
        id: 'd',
        category: 'image',
        text: '',
      },
    ];

    const result = buildEbookJson({
      messages,
      fileName: '테스트룸.html',
      selectedCategories: { main: true, other: true, secret: true },
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.ebookView.titlePage.scenarioTitle).toBe('테스트룸');
    expect(result.ebookView.titlePage.ruleType).toBe('COC');
    expect(result.lines).toHaveLength(4);

    expect(result.lines[0].id).toMatch(/^\d{16}$/);
    expect(result.lines[0].role).toBe('main');
    expect(result.lines[0].timestamp).toBe('오후 1:25');
    expect(result.lines[0].input.speakerImages.standing.url).toBe('https://i.imgur.com/a.png');

    expect(result.lines[1].role).toBe('other');
    expect(result.lines[1].textColor).toBe('color: #aaaaaa');

    expect(result.lines[2].role).toBe('Dice');
    expect(result.lines[2].input.dice.source).toBe('ccfolia');
    expect(result.lines[2].input.dice.template).toBe('coc');

    expect(result.lines[3]).toEqual({
      id: expect.stringMatching(/^\d{16}$/),
      speaker: '',
      role: 'system',
      text: '',
      imageUrl: '',
    });
  });

  test('safe text removes punctuation for TTS', () => {
    expect(toSafeText('안녕?!,.- 테스트')).toBe('안녕 테스트');
  });

  test('parses CC<= as coc-1 template', () => {
    const dice = parseDiceFromText('CC<=60 굴림: 22');
    expect(dice).toEqual({
      source: 'ccfolia',
      rule: 'coc7',
      template: 'coc-1',
      inputs: {
        skill: '',
        roll: 22,
        success: 60,
      },
    });
  });

  test('parses ccfolia dice text skill and roll', () => {
    const dice = parseDiceFromText(
      'CC<=85  [ 이성 ] (1D100<=85) 보너스, 패널티 주사위[0] ＞ 41 ＞ 41 ＞ 어려운 성공'
    );

    expect(dice).toEqual({
      source: 'ccfolia',
      rule: 'coc7',
      template: 'coc-1',
      inputs: {
        skill: '이성',
        roll: 41,
        success: 85,
      },
    });
  });
});
