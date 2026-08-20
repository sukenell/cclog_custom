# Character Standing Wardrobe Design

**Date:** 2026-08-20

**Status:** Validated

**Scope:** CCFolia log customizer v2

## Goal

Add a URL-only standing-image wardrobe that can automatically fill every dialogue line for a matching character name and can override the image on selected lines. The first release supports `one line` and `all lines for this character`; the follow-up release adds `this line and later lines for this character` without changing the storage model.

## Non-negotiable output contract

- Exported HTML keeps the current document and message markup. The feature may change only an existing `<img src>` value.
- Exported JSON keeps `schemaVersion: 1`, the current `ebookView` shape, and the current `lines[]` shape. The feature may change only `lines[].input.speakerImages.standing.url`.
- Wardrobe metadata, variant labels, variant IDs, scope values, and session-storage keys must never appear in either export.
- Only URL metadata is stored. Image files, blobs, object URLs, and base64 image data are out of scope.

## Approaches considered

### 1. Character name to one URL

This is the smallest change and resembles the inactive v1 `charHeads` implementation. It supports bulk fill but cannot represent outfits or expressions, so it does not satisfy the complete request.

### 2. Session wardrobe plus per-line overrides — selected

Each normalized character name owns multiple labeled URLs and one active default. The active default fills matching lines, while the existing per-message override remains the higher-priority escape hatch. This preserves the current export pipeline because every rendered message still exposes one final `imgUrl`.

### 3. Persisted timeline rules

A rule such as “use outfit B from line 120 to line 180” would model ranges directly. It adds rule ordering, deletion, and line-identity problems that are unnecessary for the requested behavior. The same UX can be delivered more safely by writing ordinary per-line overrides to the selected scope.

## Data model

The browser stores one versioned record under `cclog-custom:v2:standing-wardrobe:v1`:

```js
{
  version: 1,
  characters: {
    "Alice": {
      displayName: "Alice",
      activeVariantId: "casual",
      variants: [
        { id: "casual", label: "평상복", url: "https://example.com/alice-casual.png" },
        { id: "battle", label: "전투", url: "https://example.com/alice-battle.png" }
      ]
    }
  }
}
```

Character keys use Unicode NFC normalization plus `trim()`. Matching remains case-sensitive, and the original `message.charName` is never mutated, so exported speaker names remain unchanged.

The wardrobe alone is stored in `sessionStorage`. Per-line choices continue to use the current in-memory `messageOverrides[id].imgUrl`; they are cleared when another log is confirmed. A new log in the same browser tab therefore receives remembered character defaults, but not line assignments from the previous log.

## Image resolution

For every non-image message, the effective image is resolved in this order:

1. An own `imgUrl` property in `messageOverrides[message.id]`.
2. The active wardrobe variant for the normalized character name.
3. The image parsed from the source log.
4. `https://ccfolia.com/blank.gif`.

The resolver runs after parsing, rather than changing the Firebase or HTML parsers. This leaves existing source-image precedence untouched and keeps the wardrobe behavior identical for both parser paths.

## Apply-scope semantics

- `single`: write the chosen wardrobe or direct URL to the anchor message override only.
- `all`: for a wardrobe variant, set it as the character default and remove existing per-line image overrides for every matching message. For a direct URL, write current-log overrides to every matching message without adding it to the session wardrobe.
- `fromHere` (follow-up release): starting at the anchor message index, write the chosen wardrobe or direct URL to every later message whose normalized character name matches. Earlier messages and other characters remain unchanged.

Scope matching uses the complete ordered `messages` array, not the filtered preview. Hidden categories are therefore included, while title and ending pseudo-messages with `category: "image"` are excluded.

## Components and data flow

1. `AppV2` loads a sanitized wardrobe through a lazy state initializer and saves changes through an effect guarded against storage errors.
2. Parsing continues to create the existing message objects.
3. During the current post-parse merge, `AppV2` applies deletions, message overrides, and then resolves a final `imgUrl` using the precedence above.
4. `StandingWardrobePanel` derives unique character names and message counts from the complete message list. It adds, edits, deletes, previews, and activates labeled URL variants.
5. `StandingImageEditor` appears alongside the normal message body and offers wardrobe choices, a direct-URL input, and an explicit clear-image action. The normal message text remains rendered while the editor is open. The first release exposes `single` and `all`; the follow-up adds `fromHere` to the same scope interface.
6. `PreviewPanel` passes each row's matching variants and the scope callback to `LogItem`.
7. HTML export continues to clone the preview. Only the sibling interactive editor wrapper is marked `data-export-ignore="true"` and removed before serialization, so an open editor cannot leak UI markup or remove the normal message text.
8. JSON export continues to consume `messages`, whose `imgUrl` has already been resolved.

## Error handling

- Loading malformed JSON, an unsupported storage version, or an invalid record returns an empty wardrobe without blocking the app.
- Storage `SecurityError` or quota errors leave the in-memory wardrobe usable for the current render and surface a non-blocking warning.
- Variant URLs accept only absolute `http:` or `https:` URLs. Invalid values remain in the draft input and show an inline error; they are not saved or applied.
- An explicit “clear image” action writes an empty per-line value and preserves the old ability to fall back to `blank.gif`; an empty URL draft is not treated as a valid variant.
- A failed preview image falls back visually to `blank.gif`. The saved URL is not silently rewritten.
- Deleting the active variant clears `activeVariantId`; affected lines fall back through the normal resolution chain.

## UI releases

### Release 1

- Detect characters from an uploaded log.
- Manage labeled URL variants for each character.
- Choose one active default and apply it to all matching messages.
- Pick a wardrobe variant, enter a direct URL, or clear the image for one message or every matching character message. Direct-URL bulk application affects only the current log; adding a reusable default requires a wardrobe variant.
- Preserve all existing title/end-image, text-edit, delete, HTML export, split HTML export, and JSON export behavior.

### Release 2

- Add `fromHere` to wardrobe, direct-URL, and clear-image actions in the standing-image editor.
- Show the number of affected matching messages before applying.
- Apply to later matching appearances of the same character across every category.

## Testing strategy

- Characterization tests cover every current line type and lock the existing HTML and JSON output shapes before feature work.
- Pure utility tests cover name normalization, storage sanitization, storage failures, URL validation, resolution precedence, and scope target selection.
- Component tests cover wardrobe CRUD, active-default selection, per-line selection, all-character application, and the later `fromHere` option.
- App integration tests cover new-log auto-fill, reset boundaries, hidden categories, settings-triggered reparsing, and identical final URLs in HTML, split HTML, and JSON.
- Contract assertions redact generated IDs and image URLs, then deep-compare complete outputs so only expected image URL values may differ. Leakage checks inspect forbidden keys, attributes, and form nodes rather than user-controlled text.
- Storage-boundary tests prove the stored object contains only `version` and `characters`, with no message IDs, overrides, or scope state.

## Explicit non-goals

- Uploading or storing local image files.
- Embedding base64 images in an export.
- Changing JSON schema versions or adding wardrobe fields to JSON.
- Changing exported HTML message structure or classes.
- Persisting wardrobes across browser sessions with `localStorage` or a server.
