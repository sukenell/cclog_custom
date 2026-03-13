# Preview Export Regression Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the v1 custom-tab dice styling regression and the v2 HTML export color regressions while keeping JSON export functionality hidden behind commented-out buttons for now.

**Architecture:** Start by locking down each reported symptom with narrow regression tests at the component/utility layer. Fixes should then target the root cause at the rule-definition layer: v1 category/dice eligibility in the parser, and v2 shared preview/export styling rules in the export CSS generator. Keep JSON export handlers intact; only the UI buttons stay commented out until release.

**Tech Stack:** React 19, CRA `react-scripts`, Jest, DOM-based rendering tests, CSS-based HTML export generation.

---

### Task 1: Lock Hidden JSON Buttons

**Files:**
- Modify: `src/v1/component/PreviewPanel.test.jsx`
- Modify: `src/v2/component/PreviewPanel.test.jsx`

**Step 1: Keep the button-hidden regression tests as the first guard**

Expected checks:
- v1 preview does not render `다운로드(JSON)`
- v2 preview does not render `다운로드 (JSON)`
- handlers still remain wired in app code and are not deleted

**Step 2: Run the UI guard tests**

Run:
```bash
CI=true npm test -- --runInBand --watch=false src/v1/component/PreviewPanel.test.jsx src/v2/component/PreviewPanel.test.jsx
```

Expected: PASS, and no JSON button is found in either version.

### Task 2: Reproduce v1 Custom-Tab Dice Regression in HTML Path

**Files:**
- Modify: `src/v1/utils/utils.test.js`
- Modify: `src/v1/utils/utils.js`

**Step 1: Write a failing test for custom tabs**

Add a test that feeds:
- category: `custom`
- text that matches `COCdice`
- `diceEnabled: false`

Assertions:
- no `판정` badge
- no `flow-root`
- no success-style inline color/bold markup

**Step 2: Run the focused test to verify it fails**

Run:
```bash
CI=true npm test -- --runInBand --watch=false src/v1/utils/utils.test.js
```

Expected: FAIL showing custom-tab dice styling still leaks through.

### Task 3: Reproduce v1 Custom-Tab Dice Regression in Firebase/JSON Path

**Files:**
- Modify: `src/v1/utils/utils.test.js`
- Modify: `src/v1/AppV1.jsx`

**Step 1: Add a second failing test or helper case for `type: "json"`**

Cover the Firebase-derived markup path because v1 has separate HTML and JSON parsing flows.

Assertions:
- custom tab remains a normal custom tab
- toggling `diceEnabled` off prevents dice presentation in JSON-fed messages too

**Step 2: Run the same focused test command**

Run:
```bash
CI=true npm test -- --runInBand --watch=false src/v1/utils/utils.test.js
```

Expected: FAIL until both parsing paths agree on the rule.

### Task 4: Reproduce v2 Export Name-Color Regression

**Files:**
- Create or modify: `src/v2/AppV2.test.jsx`
- Modify: `src/v2/AppV2.jsx`

**Step 1: Write a failing test around `buildMinimalExportCSS` or exported HTML generation**

Test should prove exported HTML includes the rule needed to consume `--msg-name-color`.

Assertions:
- export CSS contains a `.msg-name` rule
- that rule uses `var(--msg-name-color, #dddddd)` or an equivalent shared token

**Step 2: Run the focused export test**

Run:
```bash
CI=true npm test -- --runInBand --watch=false src/v2/AppV2.test.jsx
```

Expected: FAIL because current export CSS does not define the preview variable-based name color rule.

### Task 5: Reproduce v2 Export Tab-Color Regression

**Files:**
- Create or modify: `src/v2/AppV2.test.jsx`
- Modify: `src/v2/component/LogItem.jsx`
- Modify: `src/v2/AppV2.jsx`

**Step 1: Add a failing test for export background color support**

The test should prove exported HTML/CSS can render rows with:
- `class="message-row-has-bg"`
- inline variable `--row-bg-color`

Assertions:
- export CSS contains `.message-row-has-bg`
- rule applies `background-color: var(--row-bg-color)`

**Step 2: Run the focused export test again**

Run:
```bash
CI=true npm test -- --runInBand --watch=false src/v2/AppV2.test.jsx
```

Expected: FAIL because the download CSS currently lacks the rule that preview uses.

### Task 6: Fix v1 Category Eligibility at the Source

**Files:**
- Modify: `src/v1/utils/utils.js`
- Test: `src/v1/utils/utils.test.js`

**Step 1: Implement the smallest rule change**

Target behavior:
- main tab may use dice styling when enabled
- custom tabs do not inherit main-tab dice presentation rules unless there is a deliberate product rule saying they should

**Step 2: Run the focused v1 tests**

Run:
```bash
CI=true npm test -- --runInBand --watch=false src/v1/utils/utils.test.js
```

Expected: PASS

### Task 7: Fix v2 Export CSS Drift

**Files:**
- Modify: `src/v2/AppV2.jsx`
- Test: `src/v2/AppV2.test.jsx`

**Step 1: Update export CSS to include the same variable-driven rules used by preview**

Minimum shared rules:
- `.message-row-has-bg { background-color: var(--row-bg-color); }`
- `.msg-name { color: var(--msg-name-color, #dddddd); }`

Preferred direction:
- extract shared preview/export CSS fragments instead of duplicating literal rules again

**Step 2: Run the focused v2 export tests**

Run:
```bash
CI=true npm test -- --runInBand --watch=false src/v2/AppV2.test.jsx
```

Expected: PASS

### Task 8: Run the Combined Regression Suite

**Files:**
- Test: `src/v1/component/PreviewPanel.test.jsx`
- Test: `src/v1/utils/utils.test.js`
- Test: `src/v2/component/PreviewPanel.test.jsx`
- Test: `src/v2/AppV2.test.jsx`

**Step 1: Run all touched regression tests together**

Run:
```bash
CI=true npm test -- --runInBand --watch=false src/v1/component/PreviewPanel.test.jsx src/v1/utils/utils.test.js src/v2/component/PreviewPanel.test.jsx src/v2/AppV2.test.jsx
```

Expected: PASS

**Step 2: Run production build**

Run:
```bash
npm run build
```

Expected: build succeeds; existing unrelated warnings may remain, but no new syntax or test regressions are introduced.
