import { buildEbookJson, parseDiceFromText, toSafeText } from './exportEbookJson';

const expectExactKeys = (value, expectedKeys) => {
  expect(Object.keys(value).sort()).toEqual([...expectedKeys].sort());
};

const collectObjectKeys = (value, keys = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjectKeys(item, keys));
    return keys;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nestedValue]) => {
      keys.push(key);
      collectObjectKeys(nestedValue, keys);
    });
  }

  return keys;
};

describe('exportEbookJson', () => {
  test('locks the complete schema-v1 export shape without wardrobe metadata', () => {
    const messages = [
      {
        id: 'character',
        category: 'main',
        charName: '앨리스',
        text: 'wardrobe variantId applyScope messageOverrides도 대사로 보존',
        imgUrl: 'https://example.com/alice-standing.png',
        timestamp: '2025-01-01T13:25:00',
        isDice: false,
      },
      {
        id: 'system',
        category: 'main',
        charName: '나레이션',
        text: '장면 전환',
        imgUrl: '',
        timestamp: '2025-01-01T13:26:00',
        isDice: false,
      },
      {
        id: 'secret',
        category: 'secret(kp,alice)',
        charName: 'KP',
        text: '비밀 정보',
        imgUrl: 'https://example.com/kp.png',
        timestamp: '2025-01-01T13:27:00',
        isDice: false,
      },
      {
        id: 'other',
        category: 'other',
        charName: 'PL',
        text: '잡담!',
        imgUrl: 'https://example.com/pl.png',
        timestamp: '2025-01-01T13:28:00',
        isDice: false,
      },
      {
        id: 'dice',
        category: 'main',
        charName: '앨리스',
        text: 'CC<=75 [관찰력] 굴림: 33',
        imgUrl: 'https://example.com/alice-standing.png',
        timestamp: '2025-01-01T13:29:00',
        isDice: true,
      },
      {
        id: 'image',
        category: 'image',
        text: '이미지 설명',
        imgUrl: 'https://example.com/title.png',
      },
    ];

    const result = buildEbookJson({
      messages,
      fileName: '스키마 계약.html',
      selectedCategories: {
        main: true,
        other: true,
        'secret(kp,alice)': true,
      },
      inputTexts: ['나레이션'],
    });

    expectExactKeys(result, ['schemaVersion', 'ebookView', 'lines']);
    expectExactKeys(result.ebookView, ['titlePage']);
    expectExactKeys(result.ebookView.titlePage, [
      'scenarioTitle',
      'ruleType',
      'gm',
      'pl',
      'writer',
      'copyright',
      'identifier',
      'extraMetaItems',
    ]);
    expect(result.ebookView.titlePage).toEqual({
      scenarioTitle: '스키마 계약',
      ruleType: 'COC',
      gm: '',
      pl: '',
      writer: '',
      copyright: '',
      identifier: '',
      extraMetaItems: [],
    });
    expect(result.schemaVersion).toBe(1);
    expect(result.lines).toHaveLength(6);

    const [character, system, secret, other, dice, image] = result.lines;
    const standardLineKeys = [
      'id',
      'speaker',
      'role',
      'timestamp',
      'text',
      'safetext',
      'input',
    ];

    [character, system, secret].forEach((line) => {
      expectExactKeys(line, standardLineKeys);
      expectExactKeys(line.input, ['speakerImages']);
      expectExactKeys(line.input.speakerImages, ['standing']);
      expectExactKeys(line.input.speakerImages.standing, ['url']);
    });

    expect(character.id).toMatch(/^\d{16}$/);
    expect(character.role).toBe('character');
    expect(character.timestamp).toBe('오후 1:25');
    expect(character.text).toBe(
      'wardrobe variantId applyScope messageOverrides도 대사로 보존'
    );
    expect(character.input.speakerImages.standing.url).toBe(
      'https://example.com/alice-standing.png'
    );
    expect(system.role).toBe('system');
    expect(secret.role).toBe('secret');

    expectExactKeys(other, [...standardLineKeys, 'textColor']);
    expectExactKeys(other.input, ['speakerImages']);
    expectExactKeys(other.input.speakerImages, ['standing']);
    expectExactKeys(other.input.speakerImages.standing, ['url']);
    expect(other.role).toBe('character');
    expect(other.textColor).toBe('color: #aaaaaa');

    expectExactKeys(dice, standardLineKeys);
    expectExactKeys(dice.input, ['speakerImages', 'dice']);
    expectExactKeys(dice.input.speakerImages, ['standing']);
    expectExactKeys(dice.input.speakerImages.standing, ['url']);
    expectExactKeys(dice.input.dice, ['source', 'rule', 'template', 'inputs']);
    expectExactKeys(dice.input.dice.inputs, ['skill', 'roll', 'success']);
    expect(dice.role).toBe('dice');
    expect(dice.input.dice).toEqual({
      source: 'ccfolia',
      rule: 'coc7',
      template: 'coc-1',
      inputs: {
        skill: '관찰력',
        roll: 33,
        success: 75,
      },
    });

    expectExactKeys(image, ['id', 'speaker', 'role', 'text', 'imageUrl']);
    expect(image).toEqual({
      id: expect.stringMatching(/^\d{16}$/),
      speaker: '',
      role: 'system',
      text: '이미지 설명',
      imageUrl: 'https://example.com/title.png',
    });

    const serializedKeys = collectObjectKeys(result);
    ['wardrobe', 'variantId', 'applyScope', 'messageOverrides'].forEach((key) => {
      expect(serializedKeys).not.toContain(key);
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

  test('maps desc to system and 비밀(...) to secret', () => {
    const messages = [
      {
        id: 'm1',
        category: 'main',
        charName: '나레이션',
        text: '장면 전환',
        imgUrl: '',
        timestamp: '2025-01-01T10:00:00+09:00',
        isDice: false,
      },
      {
        id: 'm2',
        category: '비밀(kp,pl)',
        charName: 'KP',
        text: '비밀 정보',
        imgUrl: '',
        timestamp: '2025-01-01T10:01:00+09:00',
        isDice: false,
      },
    ];

    const result = buildEbookJson({
      messages,
      fileName: 'role-test.html',
      selectedCategories: { main: true, '비밀(kp,pl)': true },
      inputTexts: ['나레이션'],
    });

    expect(result.lines[0].role).toBe('system');
    expect(result.lines[1].role).toBe('secret');
  });
});
