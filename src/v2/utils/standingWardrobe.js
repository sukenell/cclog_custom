export const WARDROBE_STORAGE_KEY =
  'cclog-custom:v2:standing-wardrobe:v1';

const createEmptyWardrobe = () => ({ version: 1, characters: {} });

export const EMPTY_WARDROBE = Object.freeze({
  version: 1,
  characters: Object.freeze({}),
});

const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isSafeKey = (value) => value !== '' && !RESERVED_KEYS.has(value);

const isArrayValue = (value) => {
  try {
    return Array.isArray(value);
  } catch (_error) {
    return false;
  }
};

const isPlainRecord = (value) => {
  if (!value || typeof value !== 'object' || isArrayValue(value)) {
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

const ownArrayValues = (array) => {
  const lengthProperty = readOwnDataProperty(array, 'length');
  if (
    !lengthProperty.found ||
    !Number.isSafeInteger(lengthProperty.value) ||
    lengthProperty.value < 0
  ) {
    return [];
  }

  const values = [];
  for (let index = 0; index < lengthProperty.value; index += 1) {
    const item = readOwnDataProperty(array, String(index));
    if (item.found) values.push(item.value);
  }
  return values;
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
    !isArrayValue(variantsProperty.value)
  ) {
    return null;
  }

  const displayName = normalizeRequiredString(displayNameProperty.value);
  if (displayName === '') return null;

  const variants = [];
  const variantIds = new Set();
  ownArrayValues(variantsProperty.value).forEach((candidate) => {
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

export const STANDING_SCOPE = Object.freeze({
  SINGLE: 'single',
  ALL: 'all',
});

export const getCharacterWardrobe = (wardrobe, charName) => {
  const characterKey = normalizeCrudCharacterKey(charName);
  if (!characterKey) return null;

  const sanitized = sanitizeWardrobe(wardrobe);
  if (
    !Object.prototype.hasOwnProperty.call(
      sanitized.characters,
      characterKey
    )
  ) {
    return null;
  }
  return sanitized.characters[characterKey];
};

export const resolveStandingUrl = ({
  message,
  override,
  wardrobe,
  fallbackUrl,
} = {}) => {
  if (isPlainRecord(override)) {
    const overrideUrl = readOwnDataProperty(override, 'imgUrl');
    if (overrideUrl.found && typeof overrideUrl.value === 'string') {
      return overrideUrl.value;
    }
  }

  if (isPlainRecord(message)) {
    const charName = readOwnDataProperty(message, 'charName');
    if (charName.found) {
      const character = getCharacterWardrobe(wardrobe, charName.value);
      if (character && character.activeVariantId !== null) {
        const activeVariant = character.variants.find(
          ({ id }) => id === character.activeVariantId
        );
        if (activeVariant) return activeVariant.url;
      }
    }

    const parsedUrl = readOwnDataProperty(message, 'imgUrl');
    if (
      parsedUrl.found &&
      typeof parsedUrl.value === 'string' &&
      parsedUrl.value !== ''
    ) {
      return parsedUrl.value;
    }
  }

  return typeof fallbackUrl === 'string' ? fallbackUrl : '';
};

const readMessageProperty = (message, key) => {
  if (!isPlainRecord(message)) return { found: false, value: undefined };
  return readOwnDataProperty(message, key);
};

const isImageMessage = (message) => {
  const category = readMessageProperty(message, 'category');
  return category.found && category.value === 'image';
};

const normalizedMessageCharacter = (message) => {
  const charName = readMessageProperty(message, 'charName');
  if (!charName.found) return '';
  return normalizeCrudCharacterKey(charName.value);
};

export const collectScopeTargetIds = (messages, anchorId, scope) => {
  if (
    !Array.isArray(messages) ||
    (scope !== STANDING_SCOPE.SINGLE && scope !== STANDING_SCOPE.ALL)
  ) {
    return [];
  }

  const anchor = messages.find((message) => {
    const id = readMessageProperty(message, 'id');
    return id.found && id.value === anchorId;
  });
  if (!anchor || isImageMessage(anchor)) return [];

  const anchorIdProperty = readMessageProperty(anchor, 'id');
  if (scope === STANDING_SCOPE.SINGLE) return [anchorIdProperty.value];

  const characterKey = normalizedMessageCharacter(anchor);
  if (!characterKey) return [];

  return messages.reduce((targetIds, message) => {
    if (
      isImageMessage(message) ||
      normalizedMessageCharacter(message) !== characterKey
    ) {
      return targetIds;
    }

    const id = readMessageProperty(message, 'id');
    if (id.found) targetIds.push(id.value);
    return targetIds;
  }, []);
};

const cloneOwnDataRecord = (record) => {
  if (!isPlainRecord(record)) return {};

  const clone = {};
  ownKeys(record).forEach((key) => {
    if (!isSafeKey(key)) return;
    const property = readOwnDataProperty(record, key);
    if (property.found) clone[key] = property.value;
  });
  return clone;
};

const normalizeOverrideId = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const id = String(value);
  return isSafeKey(id) ? id : '';
};

export const applyImageUrlToTargets = (overrides, targetIds, url) => {
  const result = cloneOwnDataRecord(overrides);
  if (!Array.isArray(targetIds)) return result;

  targetIds.forEach((targetId) => {
    const id = normalizeOverrideId(targetId);
    if (!id) return;

    const existing = Object.prototype.hasOwnProperty.call(result, id)
      ? cloneOwnDataRecord(result[id])
      : {};
    result[id] = { ...existing, imgUrl: url };
  });
  return result;
};

export const clearCharacterImageOverrides = (
  overrides,
  messages,
  charName
) => {
  const result = cloneOwnDataRecord(overrides);
  const characterKey = normalizeCrudCharacterKey(charName);
  if (!characterKey || !Array.isArray(messages)) return result;

  const targetIds = new Set();
  messages.forEach((message) => {
    if (
      isImageMessage(message) ||
      normalizedMessageCharacter(message) !== characterKey
    ) {
      return;
    }

    const id = readMessageProperty(message, 'id');
    if (!id.found) return;
    const normalizedId = normalizeOverrideId(id.value);
    if (normalizedId) targetIds.add(normalizedId);
  });

  targetIds.forEach((id) => {
    if (!Object.prototype.hasOwnProperty.call(result, id)) return;
    const existing = result[id];
    if (!isPlainRecord(existing)) return;

    const imageUrl = readOwnDataProperty(existing, 'imgUrl');
    if (!imageUrl.found) return;

    const nextOverride = cloneOwnDataRecord(existing);
    delete nextOverride.imgUrl;
    if (Object.keys(nextOverride).length === 0) delete result[id];
    else result[id] = nextOverride;
  });

  return result;
};
