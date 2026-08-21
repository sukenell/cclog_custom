import React, { useEffect, useId, useRef, useState } from 'react';
import {
  isSupportedStandingUrl,
  STANDING_SCOPE,
} from '../utils/standingWardrobe';

const DEFAULT_SCOPES = [
  STANDING_SCOPE.SINGLE,
  STANDING_SCOPE.FROM_HERE,
  STANDING_SCOPE.ALL,
];

export default function StandingImageEditor({
  id,
  variants = [],
  activeVariantId = null,
  currentUrl = '',
  characterName = '',
  allowedScopes = DEFAULT_SCOPES,
  onApplyVariant,
  onApplyUrl,
  onClear,
  onCancel,
  t,
}) {
  const generatedId = useId().replace(/:/g, '');
  const editorId = id || `standing-image-editor-${generatedId}`;
  const variantId = `${editorId}-variant`;
  const urlId = `${editorId}-url`;
  const errorId = `${editorId}-url-error`;
  const scopeName = `${editorId}-scope`;
  const firstControlRef = useRef(null);
  const supportedScopes = allowedScopes.filter((scope) =>
    DEFAULT_SCOPES.includes(scope)
  );
  const [scope, setScope] = useState(
    supportedScopes.includes(STANDING_SCOPE.SINGLE)
      ? STANDING_SCOPE.SINGLE
      : supportedScopes[0] || STANDING_SCOPE.SINGLE
  );
  const [selectedVariantId, setSelectedVariantId] = useState(() => {
    if (variants.some((variant) => variant.id === activeVariantId)) {
      return activeVariantId;
    }
    return variants[0]?.id || '';
  });
  const [urlDraft, setUrlDraft] = useState(currentUrl || '');
  const [urlError, setUrlError] = useState('');

  const label = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  useEffect(() => {
    firstControlRef.current?.focus();
  }, []);

  const applyVariant = () => {
    const selected = variants.find(
      (variant) => variant.id === selectedVariantId
    );
    if (!selected || typeof onApplyVariant !== 'function') return;
    onApplyVariant({
      variantId: selected.id,
      url: selected.url,
      scope,
    });
  };

  const applyUrl = () => {
    if (!isSupportedStandingUrl(urlDraft)) {
      setUrlError(
        label(
          'standing_editor.url_error',
          'http 또는 https로 시작하는 절대 URL을 입력해주세요.'
        )
      );
      return;
    }

    setUrlError('');
    if (typeof onApplyUrl === 'function') {
      onApplyUrl({ url: urlDraft.trim(), scope });
    }
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (typeof onCancel === 'function') onCancel();
  };

  return (
    <form
      id={editorId}
      className="standing-image-editor"
      data-export-ignore="true"
      onSubmit={(event) => event.preventDefault()}
      onKeyDown={handleKeyDown}
    >
      <div className="standing-image-editor-field">
        <label htmlFor={variantId}>
          {label('standing_editor.variant_label', '의상 이미지')}
        </label>
        <select
          ref={firstControlRef}
          id={variantId}
          value={selectedVariantId}
          onChange={(event) => setSelectedVariantId(event.target.value)}
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              @{variant.label}
              {variant.id === activeVariantId ? ' [기본]' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={applyVariant}
          disabled={!selectedVariantId}
        >
          {label('standing_editor.apply_variant', '선택 이미지 적용')}
        </button>
      </div>

      <fieldset>
        <legend>{label('standing_editor.scope', '적용 범위')}</legend>
        <div className="standing-image-editor-scopes">
          {supportedScopes.includes(STANDING_SCOPE.SINGLE) && (
            <label>
              <input
                id={`${editorId}-scope-${STANDING_SCOPE.SINGLE}`}
                type="radio"
                name={scopeName}
                value={STANDING_SCOPE.SINGLE}
                checked={scope === STANDING_SCOPE.SINGLE}
                onChange={(event) => setScope(event.target.value)}
              />
              {label('standing_editor.scope_single', '이 대사만')}
            </label>
          )}
          {supportedScopes.includes(STANDING_SCOPE.FROM_HERE) && (
            <label>
              <input
                id={`${editorId}-scope-${STANDING_SCOPE.FROM_HERE}`}
                type="radio"
                name={scopeName}
                value={STANDING_SCOPE.FROM_HERE}
                checked={scope === STANDING_SCOPE.FROM_HERE}
                onChange={(event) => setScope(event.target.value)}
              />
              {label(
                'standing_editor.scope_from_here',
                '이 대사부터 이후'
              )}
            </label>
          )}
          {supportedScopes.includes(STANDING_SCOPE.ALL) && (
            <label>
              <input
                id={`${editorId}-scope-${STANDING_SCOPE.ALL}`}
                type="radio"
                name={scopeName}
                value={STANDING_SCOPE.ALL}
                checked={scope === STANDING_SCOPE.ALL}
                onChange={(event) => setScope(event.target.value)}
              />
              {label(
                'standing_editor.scope_all',
                `${characterName || '캐릭터'} 전체`
              )}
            </label>
          )}
        </div>
      </fieldset>

      <div className="standing-image-editor-field">
        <label htmlFor={urlId}>
          {label('standing_editor.url_label', '직접 이미지 URL')}
        </label>
        <input
          id={urlId}
          type="url"
          inputMode="url"
          value={urlDraft}
          placeholder="https://example.com/image.png"
          aria-invalid={urlError ? 'true' : 'false'}
          aria-describedby={urlError ? errorId : undefined}
          onChange={(event) => {
            setUrlDraft(event.target.value);
            setUrlError('');
          }}
        />
        {urlError && (
          <p id={errorId} className="standing-image-editor-error" role="alert">
            {urlError}
          </p>
        )}
        <button type="button" onClick={applyUrl}>
          {label('standing_editor.apply_url', 'URL 적용')}
        </button>
      </div>

      <div className="standing-image-editor-actions">
        <button
          type="button"
          onClick={() => {
            if (typeof onClear === 'function') onClear({ scope });
          }}
        >
          {label('standing_editor.clear', '이미지 비우기')}
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof onCancel === 'function') onCancel();
          }}
        >
          {label('standing_editor.cancel', '취소')}
        </button>
      </div>
    </form>
  );
}
