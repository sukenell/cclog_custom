import {
  EMPTY_WARDROBE,
  WARDROBE_STORAGE_KEY,
  isSupportedStandingUrl,
  loadWardrobe,
  normalizeCharacterKey,
  removeVariant,
  sanitizeWardrobe,
  saveWardrobe,
  setActiveVariant,
  upsertVariant,
} from './standingWardrobe';

const expectExactKeys = (value, keys) => {
  expect(Object.keys(value).sort()).toEqual([...keys].sort());
};

const makeWardrobe = () => ({
  version: 1,
  characters: {
    앨리스: {
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
  },
});

describe('standing wardrobe session model', () => {
  test('exposes the versioned storage contract and a clean empty record', () => {
    expect(WARDROBE_STORAGE_KEY).toBe(
      'cclog-custom:v2:standing-wardrobe:v1'
    );
    expect(EMPTY_WARDROBE).toEqual({ version: 1, characters: {} });
    expectExactKeys(EMPTY_WARDROBE, ['version', 'characters']);
  });

  test('normalizes character keys with String, trim, and Unicode NFC without folding case', () => {
    expect(normalizeCharacterKey()).toBe('');
    expect(normalizeCharacterKey(42)).toBe('42');
    expect(normalizeCharacterKey('  A\u030Alice  ')).toBe('Ålice');
    expect(normalizeCharacterKey('Alice')).not.toBe(
      normalizeCharacterKey('alice')
    );
  });

  test.each([
    'https://example.com/standing.png',
    'http://localhost:3000/a.webp?version=2#standing',
  ])('accepts supported absolute standing URL %s', (url) => {
    expect(isSupportedStandingUrl(url)).toBe(true);
  });

  test.each([
    '',
    '/standing.png',
    './standing.png',
    'standing.png',
    'blob:https://example.com/id',
    'data:image/png;base64,AAAA',
    'file:///tmp/standing.png',
    'ftp://example.com/standing.png',
    'not a url',
    123,
    null,
  ])('rejects unsupported standing URL %p', (url) => {
    expect(isSupportedStandingUrl(url)).toBe(false);
  });

  test('sanitizes to exact URL-only root, character, and variant key sets', () => {
    const input = JSON.parse(`{
      "__proto__": {"polluted": true},
      "version": 1,
      "characters": {
        "__proto__": {
          "displayName": "공격자",
          "activeVariantId": null,
          "variants": []
        },
        "constructor": {
          "displayName": "공격자",
          "activeVariantId": null,
          "variants": []
        },
        "prototype": {
          "displayName": "공격자",
          "activeVariantId": null,
          "variants": []
        },
        "  앨리스  ": {
          "displayName": "  앨리스  ",
          "activeVariantId": "casual",
          "messageId": "must-not-survive",
          "overrides": {"m1": {"imgUrl": "https://bad.example"}},
          "variants": [
            {
              "id": "casual",
              "label": "평상복",
              "url": "https://example.com/casual.png",
              "file": {"name": "casual.png"},
              "blob": "blob:https://example.com/id",
              "scope": "all"
            },
            {
              "id": "casual",
              "label": "중복",
              "url": "https://example.com/duplicate.png"
            },
            {
              "id": "data",
              "label": "데이터",
              "url": "data:image/png;base64,AAAA"
            },
            {
              "id": 7,
              "label": "숫자 ID",
              "url": "https://example.com/id.png"
            }
          ]
        },
        "찰리": {
          "displayName": "찰리",
          "activeVariantId": "deleted",
          "variants": [
            {
              "id": "valid",
              "label": "기본",
              "url": "http://example.com/charlie.png"
            },
            {
              "id": "deleted",
              "label": 3,
              "url": "https://example.com/deleted.png"
            }
          ]
        },
        "고장난 캐릭터": null,
        "숫자 이름": {
          "displayName": 12,
          "activeVariantId": null,
          "variants": []
        }
      },
      "files": ["standing.png"],
      "messageOverrides": {"m1": {"imgUrl": "https://bad.example"}},
      "scope": "all"
    }`);

    const result = sanitizeWardrobe(input);

    expect(result).toEqual({
      version: 1,
      characters: {
        앨리스: {
          displayName: '앨리스',
          activeVariantId: 'casual',
          variants: [
            {
              id: 'casual',
              label: '평상복',
              url: 'https://example.com/casual.png',
            },
          ],
        },
        찰리: {
          displayName: '찰리',
          activeVariantId: null,
          variants: [
            {
              id: 'valid',
              label: '기본',
              url: 'http://example.com/charlie.png',
            },
          ],
        },
      },
    });
    expect({}.polluted).toBeUndefined();
    expectExactKeys(result, ['version', 'characters']);
    Object.values(result.characters).forEach((character) => {
      expectExactKeys(character, [
        'displayName',
        'activeVariantId',
        'variants',
      ]);
      character.variants.forEach((variant) => {
        expectExactKeys(variant, ['id', 'label', 'url']);
      });
    });
  });

  test.each([
    null,
    [],
    new Date(),
    { version: 2, characters: {} },
    { version: '1', characters: {} },
    { version: 1, characters: [] },
    Object.create({ version: 1, characters: { inherited: true } }),
  ])('returns a fresh empty record for invalid root %p', (input) => {
    const first = sanitizeWardrobe(input);
    const second = sanitizeWardrobe(input);

    expect(first).toEqual({ version: 1, characters: {} });
    expect(second).toEqual({ version: 1, characters: {} });
    expect(first).not.toBe(second);
    expect(first.characters).not.toBe(second.characters);
  });

  test('keeps other characters when an individual entry or variant is malformed', () => {
    const result = sanitizeWardrobe({
      version: 1,
      characters: {
        정상: {
          displayName: '정상',
          activeVariantId: 'good',
          variants: [
            {
              id: 'bad',
              label: '상대 링크',
              url: '/not-absolute.png',
            },
            {
              id: 'good',
              label: '정상',
              url: 'https://example.com/good.png',
            },
          ],
        },
        잘못됨: 'not-an-entry',
      },
    });

    expect(Object.keys(result.characters)).toEqual(['정상']);
    expect(result.characters.정상.variants.map(({ id }) => id)).toEqual([
      'good',
    ]);
    expect(result.characters.정상.activeVariantId).toBe('good');
  });

  test('loads sanitized data and returns fresh empties for absent or malformed storage', () => {
    const stored = JSON.stringify({
      version: 1,
      characters: {
        앨리스: {
          displayName: '앨리스',
          activeVariantId: 'casual',
          variants: [
            {
              id: 'casual',
              label: '평상복',
              url: 'https://example.com/casual.png',
              base64: 'must-not-survive',
            },
          ],
          scopes: ['single', 'all'],
        },
      },
      overrides: { m1: { imgUrl: 'https://bad.example' } },
    });
    const storage = { getItem: jest.fn(() => stored) };

    expect(loadWardrobe(storage)).toEqual({
      version: 1,
      characters: {
        앨리스: {
          displayName: '앨리스',
          activeVariantId: 'casual',
          variants: [
            {
              id: 'casual',
              label: '평상복',
              url: 'https://example.com/casual.png',
            },
          ],
        },
      },
    });
    expect(storage.getItem).toHaveBeenCalledWith(WARDROBE_STORAGE_KEY);

    const absentFirst = loadWardrobe({ getItem: () => null });
    const absentSecond = loadWardrobe({ getItem: () => null });
    expect(absentFirst).toEqual({ version: 1, characters: {} });
    expect(absentFirst).not.toBe(absentSecond);
    expect(absentFirst.characters).not.toBe(absentSecond.characters);
    expect(loadWardrobe({ getItem: () => '{broken json' })).toEqual({
      version: 1,
      characters: {},
    });
    expect(
      loadWardrobe({
        getItem: () => {
          throw new Error('storage denied');
        },
      })
    ).toEqual({ version: 1, characters: {} });
  });

  test('saves only the sanitized URL metadata and reports storage failures', () => {
    const setItem = jest.fn();
    const storage = { setItem };
    const wardrobe = makeWardrobe();
    wardrobe.files = [{ name: 'standing.png' }];
    wardrobe.characters.앨리스.variants[0].base64 = 'AAAA';
    wardrobe.characters.앨리스.messageIds = ['m1'];

    expect(saveWardrobe(storage, wardrobe)).toEqual({
      ok: true,
      error: null,
    });
    expect(setItem).toHaveBeenCalledTimes(1);
    const [key, serialized] = setItem.mock.calls[0];
    expect(key).toBe(WARDROBE_STORAGE_KEY);
    const stored = JSON.parse(serialized);
    expect(stored).toEqual(makeWardrobe());
    expectExactKeys(stored, ['version', 'characters']);
    expectExactKeys(stored.characters.앨리스, [
      'displayName',
      'activeVariantId',
      'variants',
    ]);
    expectExactKeys(stored.characters.앨리스.variants[0], [
      'id',
      'label',
      'url',
    ]);

    const quotaError = new Error('quota exceeded');
    expect(
      saveWardrobe(
        {
          setItem: () => {
            throw quotaError;
          },
        },
        wardrobe
      )
    ).toEqual({ ok: false, error: quotaError });
  });

  test('upserts variants without mutating the input or carrying unknown data', () => {
    const input = makeWardrobe();
    const snapshot = JSON.parse(JSON.stringify(input));

    const replaced = upsertVariant(input, '  앨리스  ', {
      id: 'casual',
      label: '새 평상복',
      url: 'https://example.com/new-casual.png',
      file: { name: 'new-casual.png' },
    });
    const added = upsertVariant(replaced, '앨리스', {
      id: 'formal',
      label: '정장',
      url: 'https://example.com/formal.png',
    });
    const created = upsertVariant(added, '  Bob  ', {
      id: 'default',
      label: '기본',
      url: 'https://example.com/bob.png',
    });

    expect(input).toEqual(snapshot);
    expect(replaced).not.toBe(input);
    expect(replaced.characters).not.toBe(input.characters);
    expect(replaced.characters.앨리스.variants.map(({ id }) => id)).toEqual([
      'casual',
      'battle',
    ]);
    expect(replaced.characters.앨리스.variants[0]).toEqual({
      id: 'casual',
      label: '새 평상복',
      url: 'https://example.com/new-casual.png',
    });
    expect(added.characters.앨리스.variants.map(({ id }) => id)).toEqual([
      'casual',
      'battle',
      'formal',
    ]);
    expect(created.characters.Bob).toEqual({
      displayName: 'Bob',
      activeVariantId: null,
      variants: [
        {
          id: 'default',
          label: '기본',
          url: 'https://example.com/bob.png',
        },
      ],
    });
  });

  test('rejects invalid upserts without mutating or adding unsafe character keys', () => {
    const input = makeWardrobe();
    const snapshot = JSON.parse(JSON.stringify(input));

    const invalidUrl = upsertVariant(input, 'Bob', {
      id: 'default',
      label: '기본',
      url: 'blob:https://example.com/id',
    });
    const unsafeName = upsertVariant(input, '__proto__', {
      id: 'default',
      label: '기본',
      url: 'https://example.com/bob.png',
    });

    expect(input).toEqual(snapshot);
    expect(invalidUrl).toEqual(input);
    expect(unsafeName).toEqual(input);
    expect(Object.prototype.hasOwnProperty.call(unsafeName.characters, '__proto__')).toBe(
      false
    );
  });

  test('removes a variant immutably and clears the active ID when it is removed', () => {
    const input = makeWardrobe();
    const snapshot = JSON.parse(JSON.stringify(input));

    const result = removeVariant(input, '앨리스', 'casual');

    expect(input).toEqual(snapshot);
    expect(result).not.toBe(input);
    expect(result.characters.앨리스.variants).toEqual([
      {
        id: 'battle',
        label: '전투',
        url: 'https://example.com/alice-battle.png',
      },
    ]);
    expect(result.characters.앨리스.activeVariantId).toBeNull();
  });

  test('sets only an existing variant active and leaves inputs untouched', () => {
    const input = makeWardrobe();
    const snapshot = JSON.parse(JSON.stringify(input));

    const activated = setActiveVariant(input, '앨리스', 'battle');
    const missing = setActiveVariant(input, '앨리스', 'missing');

    expect(input).toEqual(snapshot);
    expect(activated.characters.앨리스.activeVariantId).toBe('battle');
    expect(missing).toEqual(input);
  });
});
