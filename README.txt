ELP 2026 Reference V1.4.5
Netlify-ready static site with shared-password protection.

CONTENTS
- index.html — the ELP reference
- assets/ — infographic assets
- netlify/edge-functions/password-gate.js — server-side shared-password gate
- netlify.toml — applies the gate to all paths
- SETUP_PASSWORD.txt — deployment instructions
- _redirects — site routing

SECURITY MODEL
- Shared password is stored in Netlify environment variable PROTECTED_PAGE_PASSWORD.
- Password is not embedded in the site files.
- Edge Function uses Web Crypto SHA-256 for comparison.
- Successful access receives an HttpOnly, Secure, SameSite=Strict cookie for 24 hours.
- If the environment variable is missing, access fails closed.
- A logout control clears the session cookie.

Deploy the complete folder/package to the existing Netlify project.
