import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context.js';
import App from './App.js';

const root = createRoot(document.getElementById('root'));
root.render(
  createElement(AppProvider, null, createElement(App))
);
