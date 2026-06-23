import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import ReactGA from 'react-ga4';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { initClarity } from './lib/analytics/clarity';
import { initPostHog } from './lib/analytics/posthog';
import { captureNativeFetch } from './lib/net/safeFetch';

// Capture a pristine fetch BEFORE any analytics tag (Clarity/GA/PostHog)
// can monkey-patch window.fetch. Must run before the init calls below.
captureNativeFetch();

ReactGA.initialize('G-2NCBR90DMK');
initClarity();
initPostHog();

const rootElement = document.getElementById('root');

if (rootElement.hasChildNodes()) {
  hydrateRoot(
    rootElement,
    <React.StrictMode>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </React.StrictMode>
  );
} else {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </React.StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
