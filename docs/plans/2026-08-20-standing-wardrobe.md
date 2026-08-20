# Character Standing Wardrobe Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a URL-only, session-scoped character standing wardrobe with per-line and character-wide application first, followed by from-here application, while keeping exported HTML and JSON structures unchanged.

**Architecture:** Store only a versioned character-to-URL wardrobe in `sessionStorage`. Resolve the final `message.imgUrl` after parsing with per-line overrides taking precedence over the active character default, so both existing exporters continue to consume the same message shape. Scope helpers operate on the full ordered message list; release 1 exposes `single` and `all`, and release 2 exposes the already-compatible `fromHere` scope.

**Tech Stack:** React 19, JavaScript/JSX, browser `sessionStorage`, Jest, React DOM test utilities, Create React App.

---

## Required constraints

- Follow @superpowers:test-driven-development for every production-code task.
- Before implementation, use @superpowers:using-git-worktrees to create an isolated `codex/` worktree.
- Keep [the validated design](./2026-08-20-standing-wardrobe-design.md) open while implementing.
- Do not add fields to exported JSON or change `schemaVersion: 1`.
- Do not add or retain wardrobe/editor markup in exported HTML.
- Do not store files, blobs, object URLs, or base64 data.
- Do not persist per-line assignments in `sessionStorage`; only the wardrobe is session-scoped.
- Do not rewrite `src/v2/utils/exportEbookJson.js` unless a contract test reveals a pre-existing exporter bug. The feature must feed it the same message shape with a resolved `imgUrl`.

## Release sequence

1. **Release 1:** wardrobe CRUD, active default, `single`, and `all`.
2. **Release 2:** add `fromHere` using the same target-selection and override model.

---

### Task 1: Lock the current export contracts

**Files:**
- Modify: `src/v2/utils/exportEbookJson.test.js`
- Modify: `src/v2/AppV2.test.jsx`

**Step 1: Add complete JSON shape characterization tests**

Build one payload containing character, system, secret, other, dice, and image
lines. Assert exact key sets for every shape, not only a normal character:

```js
const sortedKeys = (value) => Object.keys(value).sort();
const collectKeys = (value, result = []) => {
  if (!value || typeof value !== 'object') return result;
  Object.entries(value).forEach(([key, child]) => {
    result.push(key);
    collectKeys(child, result);
  });
  return result;
};

test('keeps every schema-v1 line shape unchanged', () => {
  const result = buildEbookJson({
    messages: [
      { id: 'c', category: 'main', charName: 'Alice', text: 'hello', imgUrl: 'https://example.com/a.png' },
      { id: 's', category: 'main', charName: 'Narrator', text: 'scene', imgUrl: '' },
      { id: 'x', category: 'secret(Alice)', charName: 'Bob', text: 'secret', imgUrl: '' },
      { id: 'o', category: 'other', charName: 'Bob', text: 'chat', imgUrl: '' },
      { id: 'd', category: 'main', charName: 'Alice', text: 'CC<=50', imgUrl: '', isDice: true },
      { id: 'i', category: 'image', text: '', imgUrl: 'https://example.com/title.png' },
    ],
    fileName: 'session.html',
    selectedCategories: { main: true, other: true, 'secret(Alice)': true },
    inputTexts: ['Narrator'],
  });

  expect(sortedKeys(result)).toEqual(['ebookView', 'lines', 'schemaVersion']);
  expect(result.schemaVersion).toBe(1);
  expect(sortedKeys(result.ebookView)).toEqual(['titlePage']);
  expect(sortedKeys(result.ebookView.titlePage)).toEqual([
    'copyright', 'extraMetaItems', 'gm', 'identifier', 'pl', 'ruleType',
    'scenarioTitle', 'writer',
  ]);

  const [character, system, secret, other, dice, image] = result.lines;
  [character, system, secret, dice].forEach((line) => expect(sortedKeys(line)).toEqual([
    'id', 'input', 'role', 'safetext', 'speaker', 'text', 'timestamp',
  ]));
  expect(sortedKeys(other)).toEqual([
    'id', 'input', 'role', 'safetext', 'speaker', 'text', 'textColor', 'timestamp',
  ]);
  expect(sortedKeys(dice.input)).toEqual(['dice', 'speakerImages']);
  expect(sortedKeys(image)).toEqual(['id', 'imageUrl', 'role', 'speaker', 'text']);
  expect(character.input.speakerImages.standing.url)
    .toBe('https://example.com/a.png');
  const outputKeys = collectKeys(result);
  ['wardrobe', 'variantId', 'applyScope', 'messageOverrides']
    .forEach((key) => expect(outputKeys).not.toContain(key));
});
```

**Step 2: Add an HTML shape characterization assertion**

Use a dedicated uploaded-HTML fixture whose first row is a normal `PL` message,
not the existing `SYS` description fixture. Parse the download and assert the
stable structure:

```js
const exportedDocument = new DOMParser().parseFromString(html, 'text/html');
const exportedRow = exportedDocument.querySelector('.ccfolia_wrap > .message-row');

expect(exportedRow).not.toBeNull();
expect(exportedRow.querySelector('.msg_container > img')).not.toBeNull();
expect(exportedRow.querySelector('.message-body')).not.toBeNull();
expect(exportedDocument.querySelector('button, input, select, textarea')).toBeNull();
expect(exportedDocument.querySelector(
  '[data-export-ignore], [data-wardrobe-id], [data-apply-scope]'
)).toBeNull();
```

Add representative info, other, description, dice, title-image, and end-image
fixtures and assert their existing class/wrapper shapes too. Do not use a free-text
regex for leakage because character dialogue may legitimately contain words such
as “wardrobe” or “전투”.

**Step 3: Run the characterization tests**

Run:

```bash
npm test -- --watchAll=false --runInBand src/v2/utils/exportEbookJson.test.js src/v2/AppV2.test.jsx
```

Expected: PASS. These tests lock existing behavior before feature code is introduced.

**Step 4: Commit the contract tests**

```bash
git add src/v2/utils/exportEbookJson.test.js src/v2/AppV2.test.jsx
git commit -m "test: lock standing image export contracts"
```

---

### Task 2: Build the wardrobe model and safe session storage

**Files:**
- Create: `src/v2/utils/standingWardrobe.js`
- Create: `src/v2/utils/standingWardrobe.test.js`

**Step 1: Write failing model and storage tests**

Cover these behaviors:

```js
import {
  EMPTY_WARDROBE,
  WARDROBE_STORAGE_KEY,
  isSupportedStandingUrl,
  loadWardrobe,
  normalizeCharacterKey,
  removeVariant,
  saveWardrobe,
  sanitizeWardrobe,
  setActiveVariant,
  upsertVariant,
} from './standingWardrobe';

test('normalizes character keys without changing case', () => {
  expect(normalizeCharacterKey('  A\u030A lice  ')).toBe('Å lice');
  expect(normalizeCharacterKey('Alice')).not.toBe(normalizeCharacterKey('alice'));
});

test.each([
  ['https://example.com/a.png', true],
  ['http://example.com/a.png', true],
  ['blob:https://example.com/id', false],
  ['data:image/png;base64,abc', false],
  ['file:///tmp/a.png', false],
  ['not-a-url', false],
])('validates URL-only standing values', (value, expected) => {
  expect(isSupportedStandingUrl(value)).toBe(expected);
});

test('returns an empty wardrobe for malformed or unsupported storage data', () => {
  expect(sanitizeWardrobe(null)).toEqual(EMPTY_WARDROBE);
  expect(sanitizeWardrobe({ version: 1, characters: null })).toEqual(EMPTY_WARDROBE);
  expect(sanitizeWardrobe({ version: 2, characters: {} })).toEqual(EMPTY_WARDROBE);
  expect(loadWardrobe({ getItem: () => '{bad json' })).toEqual(EMPTY_WARDROBE);
});

test('catches storage access and quota errors', () => {
  expect(loadWardrobe({ getItem: () => { throw new DOMException('blocked'); } }))
    .toEqual(EMPTY_WARDROBE);
  expect(saveWardrobe({ setItem: () => { throw new DOMException('full'); } }, EMPTY_WARDROBE))
    .toEqual({ ok: false, error: expect.any(Error) });
});

test('stores only versioned wardrobe metadata', () => {
  const setItem = jest.fn();
  const wardrobe = upsertVariant(EMPTY_WARDROBE, 'Alice', {
    id: 'casual', label: '평상복', url: 'https://example.com/a.png',
  });

  expect(saveWardrobe({ setItem }, wardrobe).ok).toBe(true);
  const [key, raw] = setItem.mock.calls[0];
  expect(key).toBe(WARDROBE_STORAGE_KEY);
  expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['characters', 'version']);
  expect(raw).not.toContain('msg_');
  expect(raw).not.toContain('messageOverrides');
  expect(raw).not.toContain('applyScope');
});
```

Add CRUD tests that prove:

- `upsertVariant` creates or updates a URL variant without mutating the input.
- `setActiveVariant` accepts only an existing variant ID.
- `removeVariant` clears `activeVariantId` when the active entry is removed.
- sanitization drops invalid characters, invalid URLs, duplicate variant IDs,
  reserved keys such as `__proto__`, and unknown fields.
- one malformed character entry does not discard other valid entries.

**Step 2: Run the tests and confirm failure**

Run:

```bash
npm test -- --watchAll=false --runInBand src/v2/utils/standingWardrobe.test.js
```

Expected: FAIL because `standingWardrobe.js` does not exist.

**Step 3: Implement the minimum wardrobe utility**

Use this public interface:

```js
export const WARDROBE_STORAGE_KEY = 'cclog-custom:v2:standing-wardrobe:v1';
export const EMPTY_WARDROBE = Object.freeze({ version: 1, characters: {} });

export function normalizeCharacterKey(value = '') {
  return String(value).normalize('NFC').trim();
}

export function isSupportedStandingUrl(value = '') {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const RESERVED_CHARACTER_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function sanitizeWardrobe(value) {
  if (!isPlainRecord(value) || value.version !== 1 || !isPlainRecord(value.characters)) {
    return { version: 1, characters: {} };
  }

  const characters = {};
  Object.values(value.characters).forEach((entry) => {
    if (!isPlainRecord(entry)) return;
    const key = normalizeCharacterKey(entry?.displayName);
    if (!key || RESERVED_CHARACTER_KEYS.has(key) || !Array.isArray(entry?.variants)) return;

    const seen = new Set();
    const variants = entry.variants.flatMap((variant) => {
      const id = String(variant?.id || '').trim();
      const label = String(variant?.label || '').trim();
      const url = String(variant?.url || '').trim();
      if (!id || !label || seen.has(id) || !isSupportedStandingUrl(url)) return [];
      seen.add(id);
      return [{ id, label, url }];
    });

    if (!variants.length) return;
    const activeVariantId = variants.some(({ id }) => id === entry.activeVariantId)
      ? entry.activeVariantId
      : null;
    characters[key] = {
      displayName: String(entry.displayName).trim(),
      activeVariantId,
      variants,
    };
  });

  return { version: 1, characters };
}

function getSessionStorage(storage) {
  if (storage) return storage;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadWardrobe(storage) {
  try {
    const target = getSessionStorage(storage);
    const raw = target?.getItem(WARDROBE_STORAGE_KEY);
    return raw ? sanitizeWardrobe(JSON.parse(raw)) : { version: 1, characters: {} };
  } catch {
    return { version: 1, characters: {} };
  }
}

export function saveWardrobe(storage, wardrobe) {
  try {
    const target = getSessionStorage(storage);
    if (!target) throw new Error('sessionStorage is unavailable');
    target.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(sanitizeWardrobe(wardrobe)));
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}
```

Implement `upsertVariant`, `removeVariant`, and `setActiveVariant` as immutable transforms returning sanitized version-1 records. Do not generate IDs inside the storage layer; accept an ID from the caller so tests and UI remain deterministic.

**Step 4: Run the utility tests**

Run:

```bash
npm test -- --watchAll=false --runInBand src/v2/utils/standingWardrobe.test.js
```

Expected: PASS.

**Step 5: Commit the storage model**

```bash
git add src/v2/utils/standingWardrobe.js src/v2/utils/standingWardrobe.test.js
git commit -m "feat: add session standing wardrobe model"
```

---

### Task 3: Add pure image resolution and scope targeting

**Files:**
- Modify: `src/v2/utils/standingWardrobe.js`
- Modify: `src/v2/utils/standingWardrobe.test.js`

**Step 1: Write failing resolution tests**

Add fixtures with repeated speakers and an intervening character:

```js
const messages = [
  { id: 'a-1', category: 'main', charName: ' Alice ', imgUrl: 'source-a.png' },
  { id: 'b-1', category: 'main', charName: 'Bob', imgUrl: 'source-b.png' },
  { id: 'a-2', category: 'other', charName: 'Alice', imgUrl: 'source-a.png' },
  { id: 'title-img-0', category: 'image', imgUrl: 'title.png' },
  { id: 'a-3', category: 'main', charName: 'Alice', imgUrl: 'source-a.png' },
];

test('resolves per-line override before wardrobe default and source image', () => {
  const wardrobe = {
    version: 1,
    characters: {
      Alice: {
        displayName: 'Alice',
        activeVariantId: 'battle',
        variants: [{ id: 'battle', label: '전투', url: 'https://example.com/battle.png' }],
      },
    },
  };

  expect(resolveStandingUrl({
    message: messages[0],
    override: { imgUrl: 'https://example.com/line.png' },
    wardrobe,
  })).toBe('https://example.com/line.png');

  expect(resolveStandingUrl({ message: messages[0], override: {}, wardrobe }))
    .toBe('https://example.com/battle.png');
});

test.each([
  ['single', 'a-2', ['a-2']],
  ['all', 'a-2', ['a-1', 'a-2', 'a-3']],
])('selects %s targets in full message order', (scope, anchorId, expected) => {
  expect(collectScopeTargetIds(messages, anchorId, scope)).toEqual(expected);
});
```

Also test:

- An own override `{ imgUrl: '' }` remains an explicit per-line choice.
- Missing/deleted active variants fall back to the parsed source image.
- `all` matches normalized, case-sensitive names.
- Unknown anchors and unknown scopes return an empty target list.
- `clearCharacterImageOverrides` removes only `imgUrl`, preserving text edits and other characters' overrides.
- `applyImageUrlToTargets` immutably merges only the selected message IDs.

**Step 2: Run the focused tests and confirm failure**

```bash
npm test -- --watchAll=false --runInBand src/v2/utils/standingWardrobe.test.js
```

Expected: FAIL with missing exported functions.

**Step 3: Implement the pure helpers**

```js
export const STANDING_SCOPE = Object.freeze({
  SINGLE: 'single',
  ALL: 'all',
});

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

export function getCharacterWardrobe(wardrobe, charName) {
  const characters = wardrobe?.characters;
  const key = normalizeCharacterKey(charName);
  return Object.prototype.hasOwnProperty.call(characters || {}, key)
    ? characters[key]
    : null;
}

export function resolveStandingUrl({ message, override, wardrobe, fallbackUrl }) {
  if (hasOwn(override, 'imgUrl')) return override.imgUrl;

  const character = getCharacterWardrobe(wardrobe, message?.charName);
  const active = character?.variants?.find(
    ({ id }) => id === character.activeVariantId
  );

  return active?.url || message?.imgUrl || fallbackUrl;
}

export function collectScopeTargetIds(messages, anchorId, scope) {
  const anchorIndex = messages.findIndex(({ id }) => id === anchorId);
  if (anchorIndex < 0) return [];

  const anchor = messages[anchorIndex];
  if (anchor.category === 'image') return [];
  const key = normalizeCharacterKey(anchor.charName);

  if (scope === STANDING_SCOPE.SINGLE) return [anchorId];
  if (scope !== STANDING_SCOPE.ALL) return [];

  return messages
    .filter((message) =>
      message.category !== 'image' && normalizeCharacterKey(message.charName) === key
    )
    .map(({ id }) => id);
}
```

Implement `applyImageUrlToTargets` and `clearCharacterImageOverrides` with object copies. When clearing `imgUrl`, remove an empty per-message override object entirely but retain `{ text: ... }` or other fields.

**Step 4: Run the focused tests**

```bash
npm test -- --watchAll=false --runInBand src/v2/utils/standingWardrobe.test.js
```

Expected: PASS.

**Step 5: Commit the resolver and scope model**

```bash
git add src/v2/utils/standingWardrobe.js src/v2/utils/standingWardrobe.test.js
git commit -m "feat: resolve wardrobe images by apply scope"
```

---

### Task 4: Integrate wardrobe state and default resolution into AppV2

**Files:**
- Modify: `src/v2/AppV2.jsx:272-575`
- Modify: `src/v2/AppV2.test.jsx`

**Step 1: Write failing app integration tests**

Add `sessionStorage.clear()` to the existing test setup/teardown, then add tests for:

```js
test('auto-fills matching character images from the session wardrobe', async () => {
  sessionStorage.setItem('cclog-custom:v2:standing-wardrobe:v1', JSON.stringify({
    version: 1,
    characters: {
      Alice: {
        displayName: 'Alice',
        activeVariantId: 'casual',
        variants: [{
          id: 'casual',
          label: '평상복',
          url: 'https://example.com/alice-casual.png',
        }],
      },
    },
  }));

  // Render AppV2 and upload an HTML log containing Alice, Bob, and Alice again.
  // Reuse the existing uploadLogFile helper.

  const rows = container.querySelectorAll('.message-row');
  expect(rows[0].querySelector('.msg_container img').src)
    .toBe('https://example.com/alice-casual.png');
  expect(rows[1].querySelector('.msg_container img').src)
    .toBe('https://ccfolia.com/blank.gif');
  expect(rows[2].querySelector('.msg_container img').src)
    .toBe('https://example.com/alice-casual.png');
});
```

Add tests proving:

- A current per-line `imgUrl` override wins over the active default.
- Changing a non-image setting, which reparses the log, preserves per-line precedence.
- Confirming a new log clears line overrides but reapplies the same-tab wardrobe default.
- A blocked `sessionStorage` write is caught and does not crash rendering. The
  accessible warning is added and tested with the panel in Task 5.

**Step 2: Run the app test and confirm failure**

```bash
npm test -- --watchAll=false --runInBand src/v2/AppV2.test.jsx
```

Expected: FAIL because AppV2 does not load or resolve a wardrobe.

**Step 3: Add lazy wardrobe state and safe persistence**

At the start of `App`, add:

```js
const [wardrobe, setWardrobe] = useState(() => loadWardrobe());
const [wardrobeStorageError, setWardrobeStorageError] = useState('');

useEffect(() => {
  const result = saveWardrobe(undefined, wardrobe);
  setWardrobeStorageError(result.ok ? '' : t('wardrobe.storage_error'));
}, [wardrobe, t]);
```

Do not clear `wardrobe` inside `handleFileContentChange`; continue clearing only `messageOverrides` and deleted IDs.

**Step 4: Resolve a final URL in the existing post-parse merge**

Replace the final merge body with the equivalent of:

```js
.map((message) => {
  const override = messageOverrides[message.id] || {};
  const merged = { ...message, ...override };
  if (message.category === 'image') return merged;

  return {
    ...merged,
    imgUrl: resolveStandingUrl({
      message,
      override,
      wardrobe,
      fallbackUrl: 'https://ccfolia.com/blank.gif',
    }),
  };
});
```

Add `wardrobe` to the effect dependencies. Do not write derived default URLs into `messageOverrides`; computed resolution avoids loops and lets URL edits propagate to defaulted lines.

**Step 5: Run the app integration and existing parser/export tests**

```bash
npm test -- --watchAll=false --runInBand src/v2/AppV2.test.jsx src/v2/utils/parseFirebase.test.js src/v2/utils/exportEbookJson.test.js
```

Expected: PASS.

**Step 6: Commit AppV2 integration**

```bash
git add src/v2/AppV2.jsx src/v2/AppV2.test.jsx
git commit -m "feat: resolve session wardrobe defaults in logs"
```

---

### Task 5: Add the character wardrobe management panel

**Files:**
- Create: `src/v2/component/StandingWardrobePanel.jsx`
- Create: `src/v2/component/StandingWardrobePanel.test.jsx`
- Modify: `src/v2/AppV2.jsx:525-557`
- Modify: `src/v2/AppV2.css`

**Step 1: Write failing panel tests**

Render the component with repeated speakers and assert using the existing
`createRoot`/container style:

```js
const cards = container.querySelectorAll('.standing-wardrobe-card');
expect(cards).toHaveLength(2);
expect(cards[0].textContent).toContain('Alice');
expect(cards[0].textContent).toContain('기본: 평상복');
expect(cards[0].textContent).not.toContain('개 대사');
expect(container.textContent).not.toContain('title-img-0');
```

Do not add Testing Library. With `createRoot`, cover:

- Unique normalized character names without message counts.
- Adding a label plus an `https:` URL calls `onChange` with a new immutable variant.
- Duplicate or invalid URLs show inline validation and do not call `onChange`.
- Choosing “기본으로 설정” calls `onApplyDefault(charName, variantId)`.
- Deleting the active variant clears the active selection.
- The storage warning uses `role="status"` and does not block editing.

After inserting the panel in AppV2, add an App integration test that mocks
`Storage.prototype.setItem` to throw, then asserts `[role="status"]` is rendered
and the uploaded log remains editable.

**Step 2: Run the panel test and confirm failure**

```bash
npm test -- --watchAll=false --runInBand src/v2/component/StandingWardrobePanel.test.jsx
```

Expected: FAIL because the component does not exist.

**Step 3: Implement the panel contract**

Use these props:

```jsx
<StandingWardrobePanel
  messages={messages}
  wardrobe={wardrobe}
  onChange={setWardrobe}
  onApplyDefault={applyCharacterDefault}
  storageError={wardrobeStorageError}
  t={t}
/>
```

Derive characters from `messages.filter(message => message.category !== 'image')`. Use `normalizeCharacterKey` for grouping while preserving the first display name. Create variant IDs in the UI with `crypto.randomUUID()` and a deterministic fallback; pass the ID to `upsertVariant`.

Each character card must contain:

- Display name and active-default summary such as `기본: 평상복`.
- Existing variant thumbnail, `@`-prefixed label, URL, `[기본]` active marker, default button, and delete button.
- Label and URL draft inputs with an add button.
- Inline validation without `alert()`.

Do not render any panel content inside `#preview-scroll-box`.

**Step 4: Implement default application in AppV2**

Add:

```js
const applyCharacterDefault = (charName, variantId) => {
  setWardrobe((current) => setActiveVariant(current, charName, variantId));
  setMessageOverrides((current) =>
    clearCharacterImageOverrides(current, messages, charName)
  );
};
```

Clearing matching per-line image overrides is required for “캐릭터 전체 적용”. Text edits must remain intact.

**Step 5: Add panel layout styles**

Add named classes for the panel, character cards, variant list, thumbnail, validation message, and actions. Also make `.setting_container` vertically scrollable so a long wardrobe does not push controls out of the fixed viewport. Avoid broad selectors that could affect exported `.ccfolia_wrap` markup.

**Step 6: Run panel and App tests**

```bash
npm test -- --watchAll=false --runInBand src/v2/component/StandingWardrobePanel.test.jsx src/v2/AppV2.test.jsx
```

Expected: PASS.

**Step 7: Commit the management panel**

```bash
git add src/v2/component/StandingWardrobePanel.jsx src/v2/component/StandingWardrobePanel.test.jsx src/v2/AppV2.jsx src/v2/AppV2.css
git commit -m "feat: manage character standing wardrobes"
```

---

### Task 6: Release 1 line editor with single and all scopes

**Files:**
- Create: `src/v2/component/StandingImageEditor.jsx`
- Create: `src/v2/component/StandingImageEditor.test.jsx`
- Modify: `src/v2/component/LogItem.jsx:12-337`
- Modify: `src/v2/component/LogItem.test.jsx`
- Modify: `src/v2/component/PreviewPanel.jsx:4-120`
- Modify: `src/v2/component/PreviewPanel.test.jsx`
- Modify: `src/v2/AppV2.jsx:325-336,559-575`
- Modify: `src/v2/AppV2.test.jsx`

**Step 1: Write failing editor tests**

Define the release-1 props and behavior:

```jsx
<StandingImageEditor
  variants={[
    { id: 'casual', label: '평상복', url: 'https://example.com/casual.png' },
    { id: 'battle', label: '전투', url: 'https://example.com/battle.png' },
  ]}
  currentUrl="https://example.com/casual.png"
  allowedScopes={['single', 'all']}
  onApplyVariant={onApplyVariant}
  onApplyCustomUrl={onApplyCustomUrl}
  onClearImage={onClearImage}
  onCancel={onCancel}
  t={(key) => key}
/>
```

Test that:

- Only `single` and `all` scope controls render in release 1.
- Choosing `battle` with `single` calls `onApplyVariant({ variantId, url, scope: 'single' })`.
- Choosing `battle` with `all` calls the same callback with `scope: 'all'`.
- A custom URL uses the same selected scope and calls
  `onApplyCustomUrl({ url, scope })` for both `single` and `all`.
- “이미지 비우기” calls `onClearImage({ scope })`, preserving the current
  ability to store an explicit empty image override.
- Invalid custom URLs cannot be applied.
- The editor root has `data-export-ignore="true"`.

**Step 2: Run the editor tests and confirm failure**

```bash
npm test -- --watchAll=false --runInBand src/v2/component/StandingImageEditor.test.jsx
```

Expected: FAIL because the component does not exist.

**Step 3: Implement StandingImageEditor**

Keep scope selection local and default it to `single`. Render variant buttons
with image previews and accessible labels. Apply the same scope selector to
wardrobe variants, direct URLs, and the explicit clear-image action. A direct
URL applied with `all` writes overrides for the current log only; it does not
silently add a session wardrobe variant or change the active default.

The apply call must happen immediately when the user confirms; do not leave an uncommitted preview-only URL that could make HTML and JSON disagree.

**Step 4: Replace LogItem's URL-only inline block**

Add these props to `LogItem`:

```js
characterWardrobe,
onApplyStandingVariant,
onApplyStandingUrl,
standingScopes = ['single', 'all'],
```

Refactor the normal-message branch so its `.msg-normal-text` and dialogue text
remain rendered whether the standing editor is open or closed. When
`isImgEditing` is true, render `StandingImageEditor` as a sibling below the
normal body; never replace the only copy of the message text with an
export-ignored editor. Hide or disable the duplicate image action while the
editor is open. When the editor is closed, preserve the current normal-row DOM
wrappers and classes exactly. Preserve the existing text edit, delete, dice, info, other, and
description behavior. `other`, `info`, `desc`, and dice rows remain without an
image action as they are today.

**Step 5: Thread wardrobe data through PreviewPanel**

Add props:

```js
wardrobe,
onApplyStandingVariant,
onApplyStandingUrl,
standingScopes,
t,
```

For each message, pass `getCharacterWardrobe(wardrobe, msg.charName)` to `LogItem`. Continue filtering only for rendering; application callbacks remain owned by AppV2 and operate on the complete message list.

**Step 6: Implement release-1 callbacks in AppV2**

```js
const applyStandingUrl = (messageId, url, scope = STANDING_SCOPE.SINGLE) => {
  const targetIds = collectScopeTargetIds(messages, messageId, scope);
  setMessageOverrides((current) =>
    applyImageUrlToTargets(current, targetIds, url)
  );
  setMessages((current) =>
    current.map((message) => targetIds.includes(message.id)
      ? { ...message, imgUrl: url }
      : message)
  );
};

const applyStandingVariant = ({ messageId, variantId, url, scope }) => {
  const anchor = messages.find(({ id }) => id === messageId);
  if (!anchor) return;
  if (scope === STANDING_SCOPE.ALL) {
    applyCharacterDefault(anchor.charName, variantId);
    return;
  }
  applyStandingUrl(messageId, url, scope);
};
```

Pass direct URL and clear-image actions to the same helper:

```js
const applyCustomStandingUrl = ({ messageId, url, scope }) =>
  applyStandingUrl(messageId, url, scope);

const clearStandingImage = ({ messageId, scope }) =>
  applyStandingUrl(messageId, '', scope);
```

Use a `Set` inside the actual implementation instead of repeated
`targetIds.includes` for large logs. Variant `all` remains special because it
also updates the reusable active default; direct URL `all` affects only current
message overrides.

**Step 7: Add integration tests for both scopes**

Upload `Alice, Bob, Alice`, add two wardrobe variants, then assert:

- `single` changes only the selected Alice row.
- `all` changes both Alice rows, leaves Bob unchanged, sets the active default, and removes earlier Alice image exceptions.
- Toggling a settings control does not undo either result.
- Direct custom URL supports both one-row and current-log all-character scopes
  without being added to the wardrobe.
- Clear-image supports both scopes and resolves to the existing blank image in
  HTML and JSON.
- After line and bulk actions, the single session-storage value contains only
  `version` and `characters`; it contains no message IDs, overrides, or scope,
  and `localStorage` has not been touched.

**Step 8: Run component and integration tests**

```bash
npm test -- --watchAll=false --runInBand src/v2/component/StandingImageEditor.test.jsx src/v2/component/LogItem.test.jsx src/v2/component/PreviewPanel.test.jsx src/v2/AppV2.test.jsx
```

Expected: PASS.

**Step 9: Commit release 1**

```bash
git add src/v2/component/StandingImageEditor.jsx src/v2/component/StandingImageEditor.test.jsx src/v2/component/LogItem.jsx src/v2/component/LogItem.test.jsx src/v2/component/PreviewPanel.jsx src/v2/component/PreviewPanel.test.jsx src/v2/AppV2.jsx src/v2/AppV2.test.jsx
git commit -m "feat: apply standing variants to one or all lines"
```

---

### Task 7: Protect HTML and JSON output from wardrobe UI leakage

**Files:**
- Modify: `src/v2/AppV2.jsx:347-463`
- Modify: `src/v2/AppV2.test.jsx`
- Modify: `src/v2/utils/exportEbookJson.test.js`

**Step 1: Write failing open-editor export tests**

Export once with the editor closed, apply only a standing URL, then export with
the editor open. Normalize generated IDs and image URLs before comparing the
complete contracts:

```js
const normalizeHtmlContract = (content) => {
  const document = new DOMParser().parseFromString(content, 'text/html');
  document.querySelectorAll('img').forEach((image) => {
    image.setAttribute('src', '__IMAGE_URL__');
  });
  return document.querySelector('.ccfolia_wrap').innerHTML;
};

const normalizeJsonContract = (payload) => ({
  ...payload,
  lines: payload.lines.map((line) => {
    const normalized = JSON.parse(JSON.stringify(line));
    normalized.id = '__GENERATED_ID__';
    if (normalized.input?.speakerImages?.standing) {
      normalized.input.speakerImages.standing.url = '__STANDING_URL__';
    }
    return normalized;
  }),
});

expect(normalizeHtmlContract(afterHtml)).toBe(normalizeHtmlContract(beforeHtml));
expect(normalizeHtmlContract(afterSplitHtml)).toBe(
  normalizeHtmlContract(beforeSplitHtml)
);
expect(normalizeJsonContract(afterJson)).toEqual(normalizeJsonContract(beforeJson));

[afterHtml, afterSplitHtml].forEach((content) => {
  const document = new DOMParser().parseFromString(content, 'text/html');
  expect(document.querySelector('[data-export-ignore]')).toBeNull();
  expect(document.querySelector('button, input, select, textarea')).toBeNull();
  expect(document.querySelector('.message-row .msg_container > img')).not.toBeNull();
  expect(document.querySelector('[data-wardrobe-id], [data-apply-scope]')).toBeNull();
  const exportedDialogue = document.querySelectorAll('.msg-normal-text');
  expect(exportedDialogue).toHaveLength(1);
  expect(exportedDialogue[0].textContent).toContain('OPEN_EDITOR_DIALOGUE');
});

expect(afterJson.schemaVersion).toBe(1);
```

Recursively collect JSON **keys** and assert that `wardrobe`, `variantId`,
`applyScope`, and `messageOverrides` are absent. Do not reject free text values;
users may legitimately use those words in dialogue, labels, or URLs.

**Step 2: Run the export integration test and confirm failure**

```bash
npm test -- --watchAll=false --runInBand src/v2/AppV2.test.jsx
```

Expected: FAIL if the open editor wrapper or scope UI remains in cloned HTML.

**Step 3: Centralize export-only control removal**

Add and export a small helper:

```js
export function clonePreviewForExport(preview) {
  const cloned = preview.cloneNode(true);
  cloned
    .querySelectorAll('[data-export-ignore="true"], button, input, select, textarea')
    .forEach((element) => element.remove());
  return cloned;
}
```

Use it in both `handleExportHTML` and `handleExportSplitHTML`. Do not otherwise change HTML templates, wrappers, classes, CSS, or JSON mapping.

**Step 4: Run all export contract tests**

```bash
npm test -- --watchAll=false --runInBand src/v2/AppV2.test.jsx src/v2/utils/exportEbookJson.test.js
```

Expected: PASS.

**Step 5: Commit the export guard**

```bash
git add src/v2/AppV2.jsx src/v2/AppV2.test.jsx src/v2/utils/exportEbookJson.test.js
git commit -m "fix: exclude wardrobe controls from exports"
```

---

### Task 8: Localize and finish release-1 presentation

**Files:**
- Modify: `src/core/locales/ko/translation.json`
- Modify: `src/core/locales/en/translation.json`
- Modify: `src/core/locales/jp/translation.json`
- Modify: `src/core/locales/zh/translation.json`
- Modify: `src/v2/AppV2.css`
- Modify: `src/v2/AppV2.test.jsx`

**Step 1: Write a failing localization smoke test**

Seed a wardrobe variant, render AppV2, and upload a log containing its matching
character before asserting labels. The empty App does not render a default
button, so do not add that assertion to the fixture-less localization test:

```js
expect(container.textContent).toContain('캐릭터 스탠딩 이미지 변경');
expect(container.textContent).toContain('URL 기준으로 작업 동안 임시 저장됩니다.');
expect(container.textContent).toContain('기본으로 설정');
expect(container.textContent).not.toContain('wardrobe.title');
expect(container.textContent).not.toContain('wardrobe.set_default');
```

**Step 2: Run the test and confirm failure**

```bash
npm test -- --watchAll=false --runInBand src/v2/AppV2.test.jsx
```

Expected: FAIL because the keys are absent.

**Step 3: Add equivalent keys to every locale**

Add a `wardrobe` section containing at least:

```json
{
  "title": "캐릭터 스탠딩 이미지 변경",
  "storage_note": "URL 기준으로 작업 동안 임시 저장됩니다.",
  "default_summary": "기본: {{label}}",
  "no_default": "없음",
  "variant_label": "종류 이름",
  "variant_url": "이미지 URL",
  "add": "스탠딩 추가",
  "delete": "삭제",
  "set_default": "기본으로 설정",
  "active": "[기본]",
  "scope_single": "이 대사만",
  "scope_all": "이 캐릭터 전체",
  "scope_from_here": "이 대사부터 이후",
  "custom_url": "직접 URL",
  "clear_image": "이미지 비우기",
  "current_log_only": "직접 URL 일괄 적용은 현재 로그에만 유지됩니다.",
  "invalid_url": "http 또는 https 이미지 URL을 입력하세요.",
  "storage_error": "세션 옷장을 저장하지 못했습니다. 현재 화면에서는 계속 사용할 수 있습니다."
}
```

Provide natural equivalents in English, Japanese, and Chinese. Keep interpolation syntax identical.

**Step 4: Complete scoped CSS**

Verify keyboard focus, small-window wrapping, sidebar scrolling, thumbnail sizing, long URL wrapping, error colors, and active-variant state. Do not alter selectors used by exported message rows.

**Step 5: Run tests and a production build**

```bash
npm test -- --watchAll=false --runInBand src/v2/AppV2.test.jsx src/v2/component/StandingWardrobePanel.test.jsx src/v2/component/StandingImageEditor.test.jsx
npm run build
```

Expected: tests PASS and build completes without ESLint errors.

**Step 6: Commit release-1 polish**

```bash
git add src/core/locales/ko/translation.json src/core/locales/en/translation.json src/core/locales/jp/translation.json src/core/locales/zh/translation.json src/v2/AppV2.css src/v2/AppV2.test.jsx
git commit -m "feat: localize standing wardrobe controls"
```

At this point Release 1 is shippable.

---

### Task 9: Release 2 from-here scope

**Files:**
- Modify: `src/v2/utils/standingWardrobe.js`
- Modify: `src/v2/utils/standingWardrobe.test.js`
- Modify: `src/v2/component/StandingImageEditor.jsx`
- Modify: `src/v2/component/StandingImageEditor.test.jsx`
- Modify: `src/v2/component/LogItem.jsx`
- Modify: `src/v2/component/PreviewPanel.jsx`
- Modify: `src/v2/AppV2.jsx`
- Modify: `src/v2/AppV2.test.jsx`

**Step 1: Write failing UI and integration tests**

First add a failing pure target-selection test:

```js
expect(collectScopeTargetIds(messages, 'a-2', 'fromHere'))
  .toEqual(['a-2', 'a-3']);
```

Then change `allowedScopes` to include `fromHere` and assert the editor exposes
all three choices. Add this ordered integration fixture:

```js
const order = [
  ['Alice', 'A1'],
  ['Bob', 'B1'],
  ['Alice', 'A2'],
  ['Alice', 'A3'],
];
```

Choose a new Alice variant from `A2` with `fromHere`, then assert:

- A1 retains its previous URL.
- B1 is unchanged.
- A2 and A3 receive the selected URL.
- Alice's active default is not changed by a range override.
- A hidden-category Alice message after A2 is also updated.
- Direct URL and clear-image actions use the same `fromHere` target set.
- Settings-triggered reparsing preserves the range overrides.
- HTML, split HTML, and JSON contain the same final URLs and unchanged shapes.
- The session-storage JSON remains unchanged by `fromHere` overrides and contains
  no anchor ID or scope value.

**Step 2: Run focused tests and confirm failure**

```bash
npm test -- --watchAll=false --runInBand src/v2/utils/standingWardrobe.test.js src/v2/component/StandingImageEditor.test.jsx src/v2/AppV2.test.jsx
```

Expected: FAIL because `fromHere` is not exposed or dispatched.

**Step 3: Add the compatible scope to the pure model and UI**

Extend the enum and the existing target helper without changing storage:

```js
export const STANDING_SCOPE = Object.freeze({
  SINGLE: 'single',
  FROM_HERE: 'fromHere',
  ALL: 'all',
});

// Inside collectScopeTargetIds, after resolving anchorIndex and key:
if (scope === STANDING_SCOPE.FROM_HERE) {
  return messages
    .slice(anchorIndex)
    .filter((message) =>
      message.category !== 'image' &&
      normalizeCharacterKey(message.charName) === key
    )
    .map(({ id }) => id);
}
```

Now pass:

Pass:

```js
standingScopes={[
  STANDING_SCOPE.SINGLE,
  STANDING_SCOPE.FROM_HERE,
  STANDING_SCOPE.ALL,
]}
```

The generic direct-URL and clear-image callbacks already pass the selected
scope to `applyStandingUrl`. Update `applyStandingVariant` so `fromHere` also
calls:

```js
applyStandingUrl(messageId, url, STANDING_SCOPE.FROM_HERE);
```

Do not change the wardrobe storage schema. Do not set the active default for `fromHere`.

**Step 4: Keep scope application immediate and count-free**

Keep `selectedScope` local to `StandingImageEditor`. Applying a variant, direct
URL, or clear-image action immediately dispatches the selected scope without an
affected-dialogue count or an additional confirmation dialog. Add a component
assertion that no `개 대사`/affected-count label is rendered for any scope.

**Step 5: Run release-2 tests**

```bash
npm test -- --watchAll=false --runInBand src/v2/utils/standingWardrobe.test.js src/v2/component/StandingImageEditor.test.jsx src/v2/component/LogItem.test.jsx src/v2/component/PreviewPanel.test.jsx src/v2/AppV2.test.jsx src/v2/utils/exportEbookJson.test.js
```

Expected: PASS.

**Step 6: Commit release 2**

```bash
git add src/v2/utils/standingWardrobe.js src/v2/utils/standingWardrobe.test.js src/v2/component/StandingImageEditor.jsx src/v2/component/StandingImageEditor.test.jsx src/v2/component/LogItem.jsx src/v2/component/LogItem.test.jsx src/v2/component/PreviewPanel.jsx src/v2/component/PreviewPanel.test.jsx src/v2/AppV2.jsx src/v2/AppV2.test.jsx
git commit -m "feat: apply standing variants from a selected line"
```

---

### Task 10: Full regression and manual output comparison

**Files:**
- Verify only; modify tests or implementation only if a failure exposes a real defect.

**Step 1: Run the entire test suite once**

```bash
npm test -- --watchAll=false --runInBand
```

Expected: all suites PASS; no open-handle warning.

**Step 2: Run the production build**

```bash
npm run build
```

Expected: `Compiled successfully.`

**Step 3: Perform manual release-1 checks**

1. Upload a log with repeated Alice and Bob messages across visible and hidden categories.
2. Add two Alice URL variants and set one as default.
3. Confirm all Alice images update and Bob does not.
4. Apply the other variant to one Alice line.
5. Toggle dice, category, tab-color, and font-size settings.
6. Confirm the one-line choice and defaults survive reparsing.
7. Reload the tab, re-upload the log, and confirm the session wardrobe remains while line overrides reset.

**Step 4: Perform manual release-2 checks**

1. Choose Alice's second appearance.
2. Apply a variant with `이 대사부터 이후`.
3. Confirm earlier Alice messages remain unchanged and every later Alice message changes.
4. Confirm `이 캐릭터 전체` still replaces line exceptions and becomes the default.

**Step 5: Compare exported contracts**

For HTML and split HTML:

- Parse both outputs.
- Confirm the existing `.ccfolia_wrap`, `.message-row`, `.msg_container > img`, `.message-body`, and divider structure.
- Confirm no wardrobe labels, variant IDs, scope values, form controls, or `data-export-ignore` nodes.

For JSON:

- Confirm `schemaVersion === 1`.
- Confirm root, `ebookView`, `lines[]`, `input`, `speakerImages`, and `standing` key sets match the characterization test.
- Confirm only expected `standing.url` values differ.

**Step 6: Review the final diff**

```bash
git status --short
git diff --check
git log --oneline --decorate -10
```

Expected: no accidental `.DS_Store`, generated build output, or unrelated files in commits; `git diff --check` prints nothing.

**Step 7: Request code review before integration**

Use @superpowers:requesting-code-review, address verified findings with @superpowers:receiving-code-review, and run @superpowers:verification-before-completion before claiming the branch is ready.

---

## Definition of done

- Release 1 supports URL wardrobe CRUD, one-line application, and character-wide default application.
- Release 2 supports one-line, from-here, and character-wide scopes.
- Wardrobe data survives reloads in the same tab only.
- Per-line assignments reset on a newly confirmed log.
- Character matching is NFC-normalized, trimmed, and case-sensitive without changing exported names.
- HTML and split HTML structures remain unchanged except for expected image `src` values.
- JSON remains schema version 1 with unchanged object shapes; only expected standing URL values change.
- No storage or UI metadata appears in any output.
- Invalid URLs and storage failures are non-fatal and covered by tests.
- Full tests and production build pass.
