# ComboDiet Playwright e2e coverage

files:
- e2e/combodiet.spec.js
- playwright.config.js
- app.js
- index.html
- server.js

## Checks
- [x] Playwright config starts the app via npm start on port 3000
- [x] E2e tests cover branding, diets, conditions, overview, nutrition, health, and data download
- [x] E2e tests do not call OpenAI or other paid external APIs
