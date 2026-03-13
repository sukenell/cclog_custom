import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

jest.mock('jspdf', () => jest.fn());
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const mockParseFirebaseMessages = jest.fn();
let latestPreviewProps = null;

jest.mock('./utils/parseFirebase.js', () => ({
  parseFirebaseMessages: (...args) => mockParseFirebaseMessages(...args),
}));

jest.mock('./component/UploadSection.jsx', () => {
  const React = require('react');

  return function MockUploadSection({ setFileContent, setFileName }) {
    React.useEffect(() => {
      setFileContent([{ fields: { channelName: { stringValue: 'custom' } } }]);
      setFileName('room.html');
    }, [setFileContent, setFileName]);

    return <div data-testid="upload-section" />;
  };
});

jest.mock('./component/SettingsPanel.jsx', () => () => <div data-testid="settings-panel" />);

jest.mock('./component/PreviewPanel.jsx', () => {
  const React = require('react');

  return function MockPreviewPanel(props) {
    latestPreviewProps = props;
    const message = props.messages[0];

    return (
      <div
        id="preview-scroll-box"
        className="preview-scroll-box"
        style={{ '--font-scale': '1' }}
      >
        {message ? (
          <div
            className={`gap message-row ${message.backgroundColor ? 'message-row-has-bg' : ''}`}
            style={message.backgroundColor ? { '--row-bg-color': message.backgroundColor } : undefined}
          >
            <div className="message-body">
              <div className="message-meta">
                <strong
                  className="msg-name"
                  style={message.color ? { '--msg-name-color': message.color } : undefined}
                >
                  {message.charName}
                </strong>
                <span className="msg-category-tag">{message.category}</span>
              </div>
              <div className="msg-normal-text">{message.text}</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };
});

import App from './AppV2';

describe('AppV2 html export', () => {
  const OriginalBlob = global.Blob;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    latestPreviewProps = null;
    mockParseFirebaseMessages.mockReturnValue([
      {
        id: 'm1',
        category: 'custom',
        charName: 'Alice',
        text: 'hello',
        imgUrl: '',
        color: '#ff3366',
        backgroundColor: '#123456',
      },
    ]);

    global.Blob = jest.fn(function MockBlob(parts, options) {
      this.parts = parts;
      this.options = options;
    });
    URL.createObjectURL = jest.fn(() => 'blob:mock');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    global.Blob = OriginalBlob;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    jest.clearAllMocks();
  });

  function renderApp() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const rootApi = createRoot(container);

    flushSync(() => {
      rootApi.render(<App />);
    });

    return { container, rootApi };
  }

  async function flushEffects() {
    await Promise.resolve();
    await Promise.resolve();
  }

  test('includes the preview name color variable rule in exported html css', async () => {
    const { rootApi, container } = renderApp();

    await flushEffects();

    expect(latestPreviewProps).not.toBeNull();

    latestPreviewProps.onExportHTML();

    const html = global.Blob.mock.calls[0][0][0];

    expect(html).toContain('.msg-name');
    expect(html).toContain('var(--msg-name-color, #dddddd)');

    rootApi.unmount();
    container.remove();
  });

  test('includes the preview tab background variable rule in exported html css', async () => {
    const { rootApi, container } = renderApp();

    await flushEffects();

    expect(latestPreviewProps).not.toBeNull();

    latestPreviewProps.onExportHTML();

    const html = global.Blob.mock.calls[0][0][0];

    expect(html).toContain('.message-row-has-bg');
    expect(html).toContain('background-color: var(--row-bg-color)');

    rootApi.unmount();
    container.remove();
  });
});
