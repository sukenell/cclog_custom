import React, { useId, useMemo, useState } from 'react';
import {
  getCharacterWardrobe,
  isSupportedStandingUrl,
  normalizeCharacterKey,
  removeVariant,
  upsertVariant,
} from '../utils/standingWardrobe.js';

const translate = (t, key, defaultValue, values = {}) => {
  if (typeof t !== 'function') return defaultValue;
  return t(key, { ...values, defaultValue });
};

const collectCharacters = (messages) => {
  if (!Array.isArray(messages)) return [];

  const seen = new Set();
  const characters = [];

  messages.forEach((message) => {
    if (
      !message ||
      message.category === 'image' ||
      typeof message.charName !== 'string'
    ) {
      return;
    }

    const displayName = message.charName.trim();
    if (displayName === '') return;

    let key;
    try {
      key = normalizeCharacterKey(displayName);
    } catch (_error) {
      return;
    }
    if (key === '' || seen.has(key)) return;

    seen.add(key);
    characters.push({ key, displayName });
  });

  return characters;
};

const fallbackVariantId = (variants) => {
  const existingIds = new Set(variants.map(({ id }) => id));
  let suffix = 1;
  while (existingIds.has(`variant-${suffix}`)) suffix += 1;
  return `variant-${suffix}`;
};

const createVariantId = (variants) => {
  try {
    const runtimeCrypto = typeof window === 'undefined' ? null : window.crypto;
    if (typeof runtimeCrypto?.randomUUID === 'function') {
      return runtimeCrypto.randomUUID();
    }
  } catch (_error) {
    // Use the stable per-character sequence below when crypto is unavailable.
  }
  return fallbackVariantId(variants);
};

const CharacterWardrobeCard = ({
  character,
  wardrobe,
  onChange,
  onApplyDefault,
  initiallyOpen,
  t,
}) => {
  const formId = useId();
  const [variantName, setVariantName] = useState('');
  const [variantUrl, setVariantUrl] = useState('');
  const [validationError, setValidationError] = useState(null);

  const storedCharacter = getCharacterWardrobe(wardrobe, character.key);
  const variants = storedCharacter?.variants || [];
  const activeVariant =
    variants.find(({ id }) => id === storedCharacter?.activeVariantId) || null;

  const nameInputId = `${formId}-variant-name`;
  const urlInputId = `${formId}-variant-url`;
  const errorId = `${formId}-validation`;

  const handleAdd = () => {
    const label = variantName.trim();
    const url = variantUrl.trim();

    if (label === '') {
      setValidationError({
        field: 'name',
        message: translate(
          t,
          'setting.standing_wardrobe_name_required',
          '이미지 이름을 입력해주세요.'
        ),
      });
      return;
    }
    if (!isSupportedStandingUrl(url)) {
      setValidationError({
        field: 'url',
        message: translate(
          t,
          'setting.standing_wardrobe_url_invalid',
          'http(s) 절대 URL을 입력해주세요.'
        ),
      });
      return;
    }
    if (variants.some((variant) => variant.url.trim() === url)) {
      setValidationError({
        field: 'url',
        message: translate(
          t,
          'setting.standing_wardrobe_url_duplicate',
          '이미 등록된 URL입니다.'
        ),
      });
      return;
    }

    const nextWardrobe = upsertVariant(wardrobe, character.key, {
      id: createVariantId(variants),
      label,
      url,
    });
    if (typeof onChange === 'function') onChange(nextWardrobe);
    setVariantName('');
    setVariantUrl('');
    setValidationError(null);
  };

  const handleDelete = (variantId) => {
    if (typeof onChange !== 'function') return;
    onChange(removeVariant(wardrobe, character.key, variantId));
  };

  const activeSummary = activeVariant
    ? translate(
        t,
        'setting.standing_wardrobe_default_summary',
        `기본: ${activeVariant.label}`,
        { variant: activeVariant.label }
      )
    : translate(
        t,
        'setting.standing_wardrobe_default_empty',
        '기본: 없음'
      );

  return (
    <details className="standing-wardrobe-card" open={initiallyOpen}>
      <summary>
        <span className="standing-wardrobe-summary-content">
          <span className="standing-wardrobe-character-name">
            {character.displayName}
          </span>
          <span className="standing-wardrobe-default-summary">
            {activeSummary}
          </span>
        </span>
      </summary>

      <div className="standing-wardrobe-card-body">
        {variants.length > 0 && (
          <ul className="standing-wardrobe-variant-list">
            {variants.map((variant) => {
              const isActive = variant.id === activeVariant?.id;
              const defaultActionLabel = translate(
                t,
                'setting.standing_wardrobe_set_default',
                `${variant.label} 기본으로 설정`,
                { variant: variant.label }
              );
              const deleteLabel = translate(
                t,
                'setting.standing_wardrobe_delete',
                `${variant.label} 삭제`,
                { variant: variant.label }
              );

              return (
                <li className="standing-wardrobe-variant" key={variant.id}>
                  <span className="standing-wardrobe-variant-label">
                    @{variant.label}{' '}
                    {isActive && (
                      <span className="standing-wardrobe-active-label">
                        [
                        {translate(
                          t,
                          'setting.standing_wardrobe_active',
                          '기본'
                        )}
                        ]
                      </span>
                    )}
                  </span>
                  <a
                    className="standing-wardrobe-url"
                    href={variant.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {variant.url}
                  </a>
                  <img
                    className="standing-wardrobe-thumbnail"
                    src={variant.url}
                    alt=""
                    loading="lazy"
                  />
                  <div className="standing-wardrobe-actions">
                    {!isActive && (
                      <button
                        type="button"
                        className="standing-wardrobe-default-button"
                        aria-label={defaultActionLabel}
                        onClick={() => {
                          if (typeof onApplyDefault === 'function') {
                            onApplyDefault(character.displayName, variant.id);
                          }
                        }}
                      >
                        {defaultActionLabel}
                      </button>
                    )}
                    <button
                      type="button"
                      className="standing-wardrobe-delete-button"
                      aria-label={deleteLabel}
                      onClick={() => handleDelete(variant.id)}
                    >
                      {translate(
                        t,
                        'setting.standing_wardrobe_delete_action',
                        '삭제'
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="standing-wardrobe-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            handleAdd();
          }}
        >
          <div className="standing-wardrobe-field">
            <label htmlFor={nameInputId}>
              {translate(
                t,
                'setting.standing_wardrobe_variant_name',
                '이미지 이름'
              )}
            </label>
            <input
              id={nameInputId}
              type="text"
              value={variantName}
              aria-invalid={validationError?.field === 'name'}
              aria-describedby={
                validationError?.field === 'name' ? errorId : undefined
              }
              onChange={(event) => {
                setVariantName(event.target.value);
                if (validationError?.field === 'name') {
                  setValidationError(null);
                }
              }}
            />
          </div>
          <div className="standing-wardrobe-field">
            <label htmlFor={urlInputId}>
              {translate(
                t,
                'setting.standing_wardrobe_variant_url',
                '이미지 URL'
              )}
            </label>
            <input
              id={urlInputId}
              type="url"
              inputMode="url"
              value={variantUrl}
              aria-invalid={validationError?.field === 'url'}
              aria-describedby={
                validationError?.field === 'url' ? errorId : undefined
              }
              onChange={(event) => {
                setVariantUrl(event.target.value);
                if (validationError?.field === 'url') {
                  setValidationError(null);
                }
              }}
            />
          </div>
          {validationError && (
            <p id={errorId} className="standing-wardrobe-validation" role="alert">
              {validationError.message}
            </p>
          )}
          <button
            type="button"
            className="standing-wardrobe-add-button"
            onClick={handleAdd}
          >
            {translate(
              t,
              'setting.standing_wardrobe_add',
              '이미지 추가'
            )}
          </button>
        </form>
      </div>
    </details>
  );
};

const StandingWardrobePanel = ({
  messages,
  wardrobe,
  onChange,
  onApplyDefault,
  storageError,
  t,
}) => {
  const headingId = useId();
  const characters = useMemo(() => collectCharacters(messages), [messages]);

  return (
    <section
      className="standing-wardrobe-panel"
      aria-labelledby={headingId}
      data-export-ignore="true"
    >
      <h4 id={headingId}>
        04.{' '}
        {translate(
          t,
          'setting.standing_wardrobe_title',
          '캐릭터 스탠딩 이미지 변경'
        )}
      </h4>
      <p className="standing-wardrobe-storage-note">
        {translate(
          t,
          'setting.standing_wardrobe_storage_note',
          'URL 기준으로 작업 동안 임시 저장됩니다.'
        )}
      </p>
      {storageError && (
        <p className="standing-wardrobe-storage-warning" role="status">
          {translate(
            t,
            'setting.standing_wardrobe_storage_error',
            '임시 저장을 사용할 수 없습니다. 현재 편집은 계속할 수 있습니다.'
          )}
        </p>
      )}

      <div className="standing-wardrobe-cards">
        {characters.map((character, index) => (
          <CharacterWardrobeCard
            key={character.key}
            character={character}
            wardrobe={wardrobe}
            onChange={onChange}
            onApplyDefault={onApplyDefault}
            initiallyOpen={index === 0}
            t={t}
          />
        ))}
      </div>
    </section>
  );
};

export default StandingWardrobePanel;
