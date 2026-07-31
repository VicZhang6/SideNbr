# Contributing to SideNbr

Thanks for your interest in SideNbr. This guide keeps contributions focused and privacy-safe.

## Ways to help

- Bug reports and feature ideas via [GitHub Issues](https://github.com/VicZhang6/SideNbr/issues)
- Pull requests for docs, UI polish, accessibility, and Store-safe fixes
- Translations or clearer onboarding copy

## Development setup

```bash
git clone https://github.com/VicZhang6/SideNbr.git
cd SideNbr
npm install
npm run build
```

Load the unpacked extension from `dist/` in `chrome://extensions` (Developer mode).

Useful commands:

| Command | Purpose |
|---------|---------|
| `npm run build` | Store-safe production build |
| `npm run typecheck` | TypeScript check |
| `npm run check-build` | Validate `dist/` for store-safe packaging |
| `npm run build:private` | Private/local build only — **not** for PRs targeting store distribution |

## Ground rules

1. **Privacy first** — Do not add chat proxies, API key collection, analytics SDKs, or code that reads cross-origin iframe chat content.
2. **Store-safe by default** — Prefer changes that work without DNR frame-header bypass. Do not merge `private/` rules into `public/manifest.json`.
3. **Private build is optional** — Use `build:private` only for local/internal embed testing. Never market or submit that package to the Chrome Web Store.
4. **Small PRs** — One concern per PR when possible; include a short description of *why* and how you tested (Chrome version, OS, which provider).
5. **No secrets** — Do not commit API keys, personal cookies, or real account data.

## Pull request checklist

- [ ] Built with `npm run build` (and `npm run check-build` if you touch packaging/manifest)
- [ ] Manual smoke test: open side panel, switch providers, refresh, open official site, settings
- [ ] No unrelated refactors or generated noise in `dist/` unless the PR is packaging-related
- [ ] Docs updated if behavior or scripts change

## Code style

- TypeScript + React; match existing patterns in `src/`
- Prefer clear names over clever abstractions
- Keep the extension shell thin — official AI UIs live in the iframe

## Reporting security / privacy issues

If you find a way the extension could leak chat content or escalate permissions unexpectedly, please open a private report or an Issue labeled security (without publishing exploit details if severe). Prefer responsible disclosure.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

Repository: [https://github.com/VicZhang6/SideNbr](https://github.com/VicZhang6/SideNbr)
