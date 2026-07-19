# Publishing Koti CLI to npm

How to cut and publish a new release of the `koti` CLI (installed globally as
`npm install -g koti`). This reflects the **current** repo setup (v3.x,
dual-framework templates, `version.json` as the source of truth).

> This file is excluded from the published package (see `.npmignore`). It is an
> internal maintainer guide.

## Prerequisites

1. **Node.js 16+ and npm**, plus **Bun** (generated projects target Bun).
2. An **npm account** with publish rights to the `koti` package
   (current owner: `codeninza`).
3. Logged in: `npm login` → verify with `npm whoami`.
4. 2FA: keep an authenticator handy — npm will require a one-time code (`--otp`).

## How the package is built & shipped

- **`bin`** maps the two executables:
  - `koti` → `dist/cli.js`
  - `koti-mcp` → `dist/mcp-server.js`
- **`build`** bundles TypeScript with esbuild:
  `src/cli.ts → dist/cli.js` and `src/mcp-server.ts → dist/mcp-server.js`.
- **`files`** (in `package.json`) is the publish whitelist — only these ship:
  `dist/`, `templates/`, `manifest.json`, `icon.png`, `version.json`,
  `README.md`, `LICENSE`.
- **Templates** are split into `templates/express/`, `templates/elysia/`, and a
  framework-agnostic `templates/shared/` — all three are published.
- **`prepublishOnly`** runs automatically on `npm publish`:
  `npm run update-version && npm run build`.

### Repo layout (relevant to publishing)

```
koti/
├── src/                  # CLI + MCP server source (TypeScript)
├── dist/                 # Bundled output (published; git-ignored)
├── templates/
│   ├── express/          # Express framework template
│   ├── elysia/           # Elysia framework template
│   └── shared/           # Framework-agnostic models/services/utils/…
├── tests/                # vitest suite (NOT published)
├── version.json          # ← source of truth for the version number
├── package.json          # npm metadata + "files" whitelist + scripts
├── npm-package.json      # mirror updated by `update-version` (legacy artifact)
├── manifest.json         # MCP bundle manifest (has its own version field)
├── README.md             # Published docs
└── LICENSE
```

## Versioning

`version.json` is the single source of truth. Bump the version there, then run
**`npm run update-version`** — it reads `version.json` and propagates that
version into `package.json`, `manifest.json`, and `npm-package.json`, and
updates the `npm install -g koti@X` line in `README.md`. No other file needs
to be edited by hand.

| File | Field | Updated by |
|------|-------|------------|
| `version.json` | `version` | manual (source of truth) |
| `package.json` | `version` | `npm run update-version` |
| `manifest.json` | `version` | `npm run update-version` |
| `npm-package.json` | `version` | `npm run update-version` |
| `README.md` | `npm install -g koti@X` | `npm run update-version` |

Follow semver: bug/security fixes → patch (`3.0.0 → 3.0.1`); new
backwards-compatible features → minor; breaking changes → major.

## Release steps

### 1. Bump the version

Edit `version.json` to the new version (e.g. `3.0.1`) — `npm run update-version`
(next step) propagates it to `package.json`, `manifest.json`, `npm-package.json`,
and the README install line. Add a matching **"What's New"** section at the top
of `README.md`.

### 2. Propagate, build, and test

```bash
npm run update-version     # writes npm-package.json + README install line
npm run build              # esbuild → dist/cli.js + dist/mcp-server.js
npm test                   # vitest — all green before publishing
```

### 3. Sanity-check the tarball

```bash
npm pack --dry-run
```

Confirm: correct `version:`, `dist/cli.js` present, and
`templates/express`, `templates/elysia`, `templates/shared` all included.

### 4. (Optional but recommended) smoke-test locally

```bash
npm pack                                  # creates koti-<version>.tgz
npm install -g ./koti-<version>.tgz
koti --version                            # should print the new version
koti new demo --framework elysia          # scaffolds an Elysia project
koti new demo2 --framework express        # scaffolds an Express project
npm uninstall -g koti && rm koti-<version>.tgz
```

### 5. Commit & tag

```bash
git add -A
git commit -m "release: vX.Y.Z — <summary>"
git tag vX.Y.Z
git push && git push --tags
```

### 6. Publish

```bash
npm whoami                 # confirm you're logged in as the owner
npm publish                # prepublishOnly re-runs update-version + build
# If 2FA prompts:
# npm publish --otp=123456
```

> A `404 Not Found` on publish almost always means **not authenticated** (npm
> masks "no permission" as 404). Run `npm login` and retry.

### 7. Verify it's live

```bash
npm view koti version --prefer-online      # bypasses local cache → new version
npm view koti dist-tags --json --prefer-online
```

The npm website and `npm install` may show the old version for a few minutes due
to CDN/local caching — `--prefer-online` shows the true registry state.

## Troubleshooting

- **`E404` / `E403` on publish** → not logged in or no publish rights:
  `npm login`, confirm `npm whoami`, check `npm owner ls koti`.
- **`EOTP` / 2FA required** → `npm publish --otp=<code>`.
- **Old version still shows after publish** → CDN/local cache; verify with
  `npm view koti version --prefer-online`.
- **Missing files in the package** → check the `files` whitelist in
  `package.json` and that `.npmignore` isn't excluding them. Note: npm strips
  nested `.gitignore` files from the tarball.
- **Version mismatch warnings** → ensure `version.json`, `package.json`, and
  `manifest.json` all match (step 1).

## Post-publish

- Confirm the README on npmjs.com renders the new "What's New" section.
- Push the git tag so the published version is traceable.
- Open the next milestone / update the roadmap as needed.
