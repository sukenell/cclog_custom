import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

jest.mock(
  'react-router-dom',
  () => ({
    BrowserRouter: ({ children }) => <>{children}</>,
    Routes: ({ children }) => <>{children}</>,
    Route: ({ element }) => element,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  }),
  { virtual: true }
);

jest.mock('./v1/AppV1', () => () => <div>Mock V1</div>);
jest.mock('./v2/AppV2', () => () => <div>Mock V2</div>);

import App from './App';

test('renders v2 by default without the version selection screen', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rootApi = createRoot(container);

  flushSync(() => {
    rootApi.render(<App />);
  });

  expect(container.textContent).toContain('Mock V2');
  expect(container.textContent).not.toContain('Mock V1');
  expect(container.textContent).not.toContain('Version 1');
  expect(container.textContent).not.toContain('Version 2');

  rootApi.unmount();
  container.remove();
});
