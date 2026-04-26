# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Analytics

Three sinks fan out from a single helper: `logEvent(eventType, metadata?, options?)` in `src/lib/analytics/logEvent.js`.

- **Microsoft Clarity** — heatmaps + session replay (all users)
- **PostHog** — funnels + product analytics (all users)
- **Supabase `candidate_events`** — durable event log (authenticated users only — RLS blocks anon inserts)

Each sink has its own try/catch. Failure of one never blocks the others. All calls are fire-and-forget; `logEvent` returns synchronously.

### Setup

Required env vars (placeholders in `.env.example`):

```
REACT_APP_CLARITY_PROJECT_ID=...
REACT_APP_POSTHOG_KEY=...
REACT_APP_POSTHOG_HOST=https://eu.i.posthog.com
```

Production env vars are configured in the Vercel project dashboard (Production + Preview environments).

### Disabling in development

Both Clarity and PostHog are **disabled by default** in non-production builds — heatmaps and event streams stay clean during local development.

To force-enable them locally for QA, add to `.env.local`:

```
REACT_APP_ANALYTICS_FORCE=true
```

This flag should never be set in production (production runs analytics by default).

### Phase A — events shipped (8)

| Event | Fires when |
|---|---|
| `builder_loaded` | BuilderPage mounts (once per session, ref-guarded) |
| `preview_clicked` | CV preview opens (on `fabSheet` transition to `'preview'`) |
| `download_clicked` | First line of `handleDownload`, before any conditional logic |
| `save_attempted_unauthed` | Unauthenticated user hits Save — captures intent. PostHog + Clarity only (Supabase write skipped due to RLS) |
| `auth_page_loaded` | `/auth` or `/register` mounts. `route_origin` prop distinguishes |
| `homepage_cta_clicked` | Hero or Final-CTA "Try it free" clicked. `cta_section` prop distinguishes |
| `template_card_clicked` | Any template card picked. `source` prop: `'templates_page'` \| `'builder_tab'` |
| `template_applied` | "Use This Template" modal commit. `source` prop as above |

### Phase B — events deferred (4)

These are spec'd but not yet shipped, pending Clarity recording review and overnight data:

- `field_focused` — needs throttling logic across 38 input handlers
- `experience_added` — fires on Add-Experience commit
- `tab_switched` — couples with the ghost-row autosave fix
- `mobile_preview_opened` — couples with mobile UX investigation

The **exit-intent micro-survey** + `cv_exit_feedback` table migration is also Phase B.

### User identification

`useCvpAuth.applySession` calls `identifyClarity(userId, traits)` and `identifyPostHog(userId, traits)` once per identity transition, guarded by `lastIdentifiedIdRef` against tab-focus SIGNED_IN re-fires. After `fetchProStatus` resolves, both are re-identified with `{ plan: 'free' | 'pro' }`. Sign-out triggers `resetPostHog()`.

A synchronous `currentAuthUserId()` cache (`src/lib/analytics/authState.js`) lets `logEvent` attach `candidate_id` without going async.

### `cvp_returning_user` localStorage flag

Drives the `/auth` page default mode (signup for first-time visitors, signin for returners).

- **Set** by `useCvpAuth.applySession` on every authed-session observation. Wrapped in try/catch — Safari private-browsing throws on `setItem`.
- **Read** by the `useState` initializer for `authMode` and by the `auth_page_loaded` event for `is_first_time_visitor`.
- **Override** with `?mode=signin` URL param to force signin regardless of flag state.

For deeper detail (architecture, commit history, Phase B trigger criteria), see [`docs/analytics-day2-prep.md`](docs/analytics-day2-prep.md).

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
