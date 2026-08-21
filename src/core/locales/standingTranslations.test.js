import { createInstance } from 'i18next';
import translationEN from './en/translation.json';
import translationJP from './jp/translation.json';
import translationKO from './ko/translation.json';
import translationZH from './zh/translation.json';

const TRANSLATIONS = {
  en: translationEN,
  jp: translationJP,
  ko: translationKO,
  zh: translationZH,
};

const WARDROBE_KEYS = [
  'standing_wardrobe_active',
  'standing_wardrobe_add',
  'standing_wardrobe_add_status',
  'standing_wardrobe_character_unsupported',
  'standing_wardrobe_default_empty',
  'standing_wardrobe_default_summary',
  'standing_wardrobe_delete',
  'standing_wardrobe_delete_action',
  'standing_wardrobe_delete_status',
  'standing_wardrobe_name_required',
  'standing_wardrobe_set_default',
  'standing_wardrobe_storage_error',
  'standing_wardrobe_storage_note',
  'standing_wardrobe_title',
  'standing_wardrobe_url_duplicate',
  'standing_wardrobe_url_invalid',
  'standing_wardrobe_url_new_window',
  'standing_wardrobe_variant_name',
  'standing_wardrobe_variant_url',
];

const EDITOR_KEYS = [
  'active',
  'applied_status',
  'apply_url',
  'apply_variant',
  'cancel',
  'change_image',
  'clear',
  'cleared_status',
  'scope',
  'scope_all',
  'scope_from_here',
  'scope_single',
  'url_error',
  'url_label',
  'variant_label',
];

const PREVIEW_A11Y_KEYS = [
  'delete_message',
  'edit_message',
  'edit_message_text',
  'save_message',
];

const FULL_KEYS = [
  ...WARDROBE_KEYS.map((key) => `setting.${key}`),
  ...EDITOR_KEYS.map((key) => `standing_editor.${key}`),
  ...PREVIEW_A11Y_KEYS.map((key) => `preview.${key}`),
];

describe('standing image translations', () => {
  test.each(Object.entries(TRANSLATIONS))(
    '%s defines the complete standing image key set',
    (_language, translation) => {
      expect(
        Object.keys(translation.setting)
          .filter((key) => key.startsWith('standing_wardrobe_'))
          .sort()
      ).toEqual([...WARDROBE_KEYS].sort());
      expect(Object.keys(translation.standing_editor).sort()).toEqual(
        [...EDITOR_KEYS].sort()
      );
      PREVIEW_A11Y_KEYS.forEach((key) => {
        expect(translation.preview).toHaveProperty(key);
      });
    }
  );

  test.each(Object.entries(TRANSLATIONS))(
    '%s resolves every standing image label without exposing a raw key',
    (language, translation) => {
      const i18n = createInstance();
      i18n.init({
        resources: { [language]: { translation } },
        lng: language,
        fallbackLng: false,
        initImmediate: false,
        interpolation: { escapeValue: false },
      });

      FULL_KEYS.forEach((key) => {
        const resolved = i18n.t(key, { variant: '평상복' });
        expect(resolved).not.toBe(key);
        expect(resolved.trim()).not.toBe('');
      });
    }
  );

  test('keeps the required Korean copy and scope labels exact', () => {
    const { setting, standing_editor: editor } = translationKO;

    expect(setting.standing_wardrobe_title).toBe(
      '캐릭터 스탠딩 이미지 변경'
    );
    expect(setting.standing_wardrobe_storage_note).toBe(
      'URL 기준으로 작업 동안 임시 저장됩니다.'
    );
    expect(
      setting.standing_wardrobe_default_summary.replace(
        '{{variant}}',
        '평상복'
      )
    ).toBe('기본: 평상복');
    expect(`[${setting.standing_wardrobe_active}]`).toBe('[기본]');
    expect(`[${editor.active}]`).toBe('[기본]');
    expect(editor.scope_single).toBe('이 대사만');
    expect(editor.scope_from_here).toBe('이 대사부터 이후');
    expect(editor.scope_all).toBe('캐릭터 전체');
  });

  test.each(Object.entries(TRANSLATIONS))(
    '%s does not add affected-message counts to standing image labels',
    (_language, translation) => {
      const standingCopy = [
        ...WARDROBE_KEYS.map((key) => translation.setting[key]),
        ...EDITOR_KEYS.map((key) => translation.standing_editor[key]),
      ].join(' ');

      expect(standingCopy).not.toMatch(/{{\s*count\s*}}/i);
      expect(standingCopy).not.toContain('개 대사');
    }
  );

  test('uses natural storage and URL guidance in the reviewed locales', () => {
    expect(translationJP.setting.standing_wardrobe_storage_note).toBe(
      '画像ファイルは保存せず、URLのみを作業中に一時保存します。'
    );
    expect(translationZH.setting.standing_wardrobe_storage_note).toBe(
      '不会保存图片文件，仅在本次编辑期间临时保存 URL。'
    );
    expect(translationEN.setting.standing_wardrobe_url_invalid).toBe(
      'Enter a full URL that starts with http:// or https://.'
    );
    expect(translationEN.standing_editor.url_error).toBe(
      'Enter a full URL that starts with http:// or https://.'
    );
  });
});
