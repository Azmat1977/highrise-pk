/**
 * pages/projects/index.tsx
 *
 * Version switch — redeploy to toggle between legacy and new page.
 * To activate new page: change both exports to point at ./_new
 * To rollback:          change both exports back to ./_legacy
 *
 * There is no runtime flag — this is a deploy-time switch.
 * True zero-deploy toggling would require Vercel Edge Config
 * or a DB-backed flag, which is out of scope for this build.
 */

// ── ACTIVE VERSION ────────────────────────────────────────
// Switch these two lines to change which page is served:

// Pointing to _new directly — _legacy.tsx not yet created.
// To create _legacy: copy your Session 10 projects page there.
export { getServerSideProps } from './_new';
export { default }           from './_new';

// ── TO GO LIVE (when _new is ready):
// export { getServerSideProps } from './_new';
// export { default }           from './_new';