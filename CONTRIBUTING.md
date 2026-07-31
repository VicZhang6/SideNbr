# Contributing to SideNbr

Thanks for your interest in SideNbr.

## Setup

```bash
npm install
npm run typecheck
npm run build
npm run check-build
```

Load `dist/` as an unpacked extension in Chrome (`chrome://extensions` → Developer mode).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Production package → `dist/` |
| `npm run check-build` | Validate `dist/` |
| `npm run pack` | Build + zip → `artifacts/SideNbr-<version>.zip` |
| `npm run typecheck` | TypeScript only |

## Guidelines

1. Prefer small PRs with a clear motivation.
2. Keep privacy defaults: no chat scraping, no remote executable code, no analytics SDKs.
3. There is **one open-source package** only — no store-safe / private split.
4. SideNbr is open-source and **not** submitted to the Chrome Web Store.

## Reporting issues

Please do **not** paste cookies, tokens, or full chat transcripts into issues.

## License

By contributing, you agree that your contributions are licensed under the MIT License.
