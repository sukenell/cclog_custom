export const WARDROBE_STORAGE_KEY =
  'cclog-custom:v2:standing-wardrobe:v1';

const createEmptyWardrobe = () => ({ version: 1, characters: {} });

export const EMPTY_WARDROBE = Object.freeze({
  version: 1,
  characters: Object.freeze({}),
});

const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isSafeKey = (value) => value !== '' && !RESERVED_KEYS.has(value);

const isPlainRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch (_error) {
    return false;
  }
};

const readOwnDataProperty = (record, key) => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      return { found: false, value: undefined };
    }
    return { found: true, value: descriptor.value };
  } catch (_error) {
    return { found: false, value: undefined };
  }
};

const ownKeys = (record) => {
  try {
    return Object.keys(record);
  } catch (_error) {
    return [];
  }
};

const normalizeRequiredString = (value) => {
  if (typeof value !== 'string') return '';
  return value.normalize('NFC').trim();
};

export const normalizeCharacterKey = (value = '') =>
  String(value).normalize('NFC').trim();

export const isSupportedStandingUrl = (value = '') => {
  if (typeof value !== 'string' || value.trim() === '') return false;

  try {
    const parsed = new URL(value.trim());
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname !== ''
    );
  } catch (_error) {
    return false;
  }
};

const sanitizeVariant = (value) => {
  if (!isPlainRecord(value)) return null;

  const idProperty = readOwnDataProperty(value, 'id');
  const labelProperty = readOwnDataProperty(value, 'label');
  const urlProperty = readOwnDataProperty(value, 'url');
  if (!idProperty.found || !labelProperty.found || !urlProperty.found) {
    return null;
  }

  const id = normalizeRequiredString(idProperty.value);
  const label = normalizeRequiredString(labelProperty.value);
  const url =
    typeof urlProperty.value === 'string' ? urlProperty.value.trim() : '';

  if (!isSafeKey(id) || label === '' || !isSupportedStandingUrl(url)) {
    return null;
  }

  return { id, label, url };
};

const sanitizeCharacter = (value) => {
  if (!isPlainRecord(value)) return null;

  const displayNameProperty = readOwnDataProperty(value, 'displayName');
  const variantsProperty = readOwnDataProperty(value, 'variants');
  if (
    !displayNameProperty.found ||
    !variantsProperty.found ||
    !Array.isArray(variantsProperty.value)
  ) {
    return null;
  }

  const displayName = normalizeRequiredString(displayNameProperty.value);
  if (displayName === '') return null;

  const variants = [];
  const variantIds = new Set();
  variantsProperty.value.forEach((candidate) => {
    const variant = sanitizeVariant(candidate);
    if (!variant || variantIds.has(variant.id)) return;
    variantIds.add(variant.id);
    variants.push(variant);
  });

  const activeProperty = readOwnDataProperty(value, 'activeVariantId');
  const activeCandidate = activeProperty.found
    ? normalizeRequiredString(activeProperty.value)
    : '';
  const activeVariantId = variantIds.has(activeCandidate)
    ? activeCandidate
    : null;

  return { displayName, activeVariantId, variants };
};

export const sanitizeWardrobe = (value) => {
  if (!isPlainRecord(value)) return createEmptyWardrobe();

  const versionProperty = readOwnDataProperty(value, 'version');
  const charactersProperty = readOwnDataProperty(value, 'characters');
  if (
    !versionProperty.found ||
    versionProperty.value !== 1 ||
    !charactersProperty.found ||
    !isPlainRecord(charactersProperty.value)
  ) {
    return createEmptyWardrobe();
  }

  const characters = {};
  ownKeys(charactersProperty.value).forEach((rawKey) => {
    let key;
    try {
      key = normalizeCharacterKey(rawKey);
    } catch (_error) {
      return;
    }

    if (
      !isSafeKey(key) ||
      Object.prototype.hasOwnProperty.call(characters, key)
    ) {
      return;
    }

    const entryProperty = readOwnDataProperty(charactersProperty.value, rawKey);
    if (!entryProperty.found) return;
    const character = sanitizeCharacter(entryProperty.value);
    if (!character) return;
    characters[key] = character;
  });

  return { version: 1, characters };
};

const resolveStorage = (storage) => {
  if (storage !== undefined) return storage;
  if (typeof globalThis === 'undefined') return null;
  return globalThis.sessionStorage;
};

export const loadWardrobe = (storage) => {
  try {
    const target = resolveStorage(storage);
    if (!target || typeof target.getItem !== 'function') {
      return createEmptyWardrobe();
    }

    const serialized = target.getItem(WARDROBE_STORAGE_KEY);
    if (typeof serialized !== 'string') return createEmptyWardrobe();
    return sanitizeWardrobe(JSON.parse(serialized));
  } catch (_error) {
    return createEmptyWardrobe();
  }
};

export const saveWardrobe = (storage, wardrobe) => {
  try {
    const target = resolveStorage(storage);
    if (!target || typeof target.setItem !== 'function') {
      throw new TypeError('sessionStorage is unavailable');
    }

    target.setItem(
      WARDROBE_STORAGE_KEY,
      JSON.stringify(sanitizeWardrobe(wardrobe))
    );
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
};

const normalizeCrudCharacterKey = (charName) => {
  try {
    const key = normalizeCharacterKey(charName);
    return isSafeKey(key) ? key : '';
  } catch (_error) {
    return '';
  }
};

export const upsertVariant = (wardrobe, charName, variant) => {
  const result = sanitizeWardrobe(wardrobe);
  const characterKey = normalizeCrudCharacterKey(charName);
  const sanitizedVariant = sanitizeVariant(variant);
  if (!characterKey || !sanitizedVariant) return result;

  const existing = Object.prototype.hasOwnProperty.call(
    result.characters,
    characterKey
  )
    ? result.characters[characterKey]
    : {
        displayName: characterKey,
        activeVariantId: null,
        variants: [],
      };
  const existingIndex = existing.variants.findIndex(
    ({ id }) => id === sanitizedVariant.id
  );
  const variants = [...existing.variants];
  if (existingIndex >= 0) variants[existingIndex] = sanitizedVariant;
  else variants.push(sanitizedVariant);

  result.characters[characterKey] = { ...existing, variants };
  return result;
};

export const removeVariant = (wardrobe, charName, variantId) => {
  const result = sanitizeWardrobe(wardrobe);
  const characterKey = normalizeCrudCharacterKey(charName);
  const normalizedVariantId = normalizeRequiredString(variantId);
  if (
    !characterKey ||
    !isSafeKey(normalizedVariantId) ||
    !Object.prototype.hasOwnProperty.call(result.characters, characterKey)
  ) {
    return result;
  }

  const existing = result.characters[characterKey];
  const variants = existing.variants.filter(
    ({ id }) => id !== normalizedVariantId
  );
  result.characters[characterKey] = {
    ...existing,
    activeVariantId:
      existing.activeVariantId === normalizedVariantId
        ? null
        : existing.activeVariantId,
    variants,
  };
  return result;
};

export const setActiveVariant = (wardrobe, charName, variantId) => {
  const result = sanitizeWardrobe(wardrobe);
  const characterKey = normalizeCrudCharacterKey(charName);
  const normalizedVariantId = normalizeRequiredString(variantId);
  if (
    !characterKey ||
    !isSafeKey(normalizedVariantId) ||
    !Object.prototype.hasOwnProperty.call(result.characters, characterKey)
  ) {
    return result;
  }

  const existing = result.characters[characterKey];
  if (!existing.variants.some(({ id }) => id === normalizedVariantId)) {
    return result;
  }

  result.characters[characterKey] = {
    ...existing,
    activeVariantId: normalizedVariantId,
  };
  return result;
};
