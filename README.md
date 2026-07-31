# SideNbr

<p align="center">
  <img src="docs/assets/sidenbr-icon.png" alt="SideNbr icon" width="128" height="128" />
</p>

<p align="center">
  <strong>SideNbr</strong> is a lightweight Chrome Manifest V3 side panel extension that embeds the native web UIs of <strong>Perplexity</strong>, <strong>ChatGPT</strong>, <strong>DeepSeek</strong>, and <strong>Grok</strong> via iframe — while you browse any page.
</p>

<p align="center">Local shell only. <strong>No AI API keys. No chat proxy.</strong></p>

<p align="center">
  <a href="#中文">中文说明</a> ·
  <a href="https://github.com/VicZhang6/SideNbr">GitHub</a> ·
  <a href="https://github.com/VicZhang6/SideNbr/releases">Releases / Download</a> ·
  License: MIT
</p>

---

## Download prebuilt packages

You do **not** need to compile from source for daily use.

1. Open **[Releases](https://github.com/VicZhang6/SideNbr/releases)**
2. Download either:
   - `SideNbr-store-safe-x.y.z.zip` — default / safer for evaluation
   - `SideNbr-private-x.y.z.zip` — local only (frame-header compatibility; **not** for Chrome Web Store)
3. Unzip → Chrome → Developer mode → **Load unpacked** → select the unzipped folder

Full install steps: [docs/DOWNLOAD.md](./docs/DOWNLOAD.md).

---

## Features

- **Keyboard shortcut** — open / close the side panel in one keystroke (customizable in Chrome)
- **Provider switch** — Perplexity / ChatGPT / DeepSeek / Grok with brand icons
- **Enable 1–4 providers** — choose which services appear in the toolbar (settings)
- **Keep-alive on switch** — already opened providers stay mounted; no full reload on every switch
- **Refresh** — reload the current iframe
- **Open official site** — open the provider’s official site in a new tab
- **Settings panel** — shortcut status, jump to `chrome://extensions/shortcuts`, provider toggles
- **i18n EN / ZH** — UI language follows the browser language (can override)
- **Light / dark theme** — follows system by default; force light or dark in settings
- **Two builds** — store-safe (default) vs private (local / internal, with DNR frame-header bypass)

---

## Screenshots

> Screenshot placeholders. Replace with real side-panel captures before release.

| Side panel | Provider switch | Settings |
|------------|-----------------|----------|
| *TODO*     | *TODO*          | *TODO*   |

---

## Quick start

Requires **Node 20+** and **Chrome 114+**.

```bash
git clone https://github.com/VicZhang6/SideNbr.git
cd SideNbr
npm install
npm run build          # Store-safe → dist/
```

Load the extension:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the project’s **`dist/`** folder
4. Pin the toolbar icon; confirm the shortcut at `chrome://extensions/shortcuts`

### Default shortcuts

| Platform          | Suggested default       |
|-------------------|-------------------------|
| macOS             | `Option + A`            |
| Windows / Linux   | `Alt + A`               |

The effective binding is whatever Chrome shows at `chrome://extensions/shortcuts` (it may be empty if another extension claimed the combo). You can also click the extension icon to open or close the panel.

---

## Architecture

```
┌─────────────────────────────────────┐
│  Chrome Side Panel (local shell)    │
│  React UI · provider switch · etc.  │
│  ┌───────────────────────────────┐  │
│  │  iframe → official HTTPS UI   │  │
│  │  Perplexity / ChatGPT /       │  │
│  │  DeepSeek / Grok              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

- The side panel must be a **local page** inside the extension package (Chrome does not allow `side_panel.default_path` to point at a remote URL).
- The local shell loads allowlisted official HTTPS URLs in an **iframe**.
- Extension scripts **cannot and should not** read the cross-origin iframe DOM or chat content.
- Accounts and subscriptions stay with each provider’s own site login; SideNbr does not proxy AI traffic.

**Privacy-first:** no backend of our own, no chat logging, no third-party analytics SDK.

---

## Two builds

| | Store-safe | Private (compatibility) |
|--|------------|-------------------------|
| Command | `npm run build` | `npm run build:private` |
| Manifest | `public/manifest.json` (no DNR) | Post-build private manifest overlay |
| Headers | Unmodified responses | Strip XFO / CSP on **sub_frame** (see `private/`) |
| Chrome Web Store | Suitable to evaluate for listing | **Do not** ship as the public / store default |
| Check | `npm run check-build` | `node scripts/check-build.mjs --private` |

```bash
# Store-safe (default, recommended)
npm run build
npm run check-build

# Private — local / internal only
npm run build:private
node scripts/check-build.mjs --private
```

### Private build warning

The private build uses `declarativeNetRequestWithHostAccess` to remove target sites’ `X-Frame-Options` and related CSP headers on **sub_frame** loads for compatibility testing. That weakens page security constraints and may violate store policies.

Details: [private/README.md](./private/README.md). **Never submit a private build to the Chrome Web Store.**

---

## Tech stack

| Layer | Stack |
|-------|--------|
| UI | React 18, TypeScript, Vite |
| Extension | Chrome Manifest V3, Side Panel API |
| Icons | lucide-react; brand paths from LobeHub icons |

---

## Privacy summary

- Does **not** read, store, or transmit ChatGPT / Perplexity / DeepSeek / Grok conversation content
- AI traffic stays between your browser and each provider
- Only lightweight prefs (e.g. active provider, enabled list) in `chrome.storage.local`
- No first-party backend, no ad IDs, no third-party analytics SDK

Full draft: [PRIVACY.md](./PRIVACY.md).

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | TypeScript + Vite → `dist/` (store-safe) |
| `npm run build:private` | Same, then apply private manifest + DNR rules |
| `npm run check-build` | Verify `dist/` files and store-safe permissions |
| `node scripts/check-build.mjs --private` | Verify a private build |
| `node scripts/generate-icons.mjs` | Generate PNG icons |

---

## Project layout

```
SideNbr/
├─ public/                 # Store-safe manifest + icons
├─ private/                # Private manifest, DNR rules, risk notes
├─ scripts/                # build check, private apply, icons
├─ src/                    # React side panel + background
├─ sidepanel.html
├─ PRIVACY.md
├─ CONTRIBUTING.md
├─ LICENSE
└─ README.md
```

---

## Disclaimer

SideNbr is **not** an official product of OpenAI, Perplexity, DeepSeek, xAI, or any other provider, and is **not affiliated with or endorsed by** them. Third-party names and marks are used only to describe the embedded services. Use of those services is subject to their own terms and privacy policies.

---

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

Brief norms:

- Contribute toward the **store-safe** path by default; do not merge `private/` rules into the public manifest
- Stay privacy-first: no chat proxy, no conversation harvesting
- Keep PRs small and clear; state motivation and how you tested

---

## License

[MIT](./LICENSE) © 2026 VicZhang6

Repository: [https://github.com/VicZhang6/SideNbr](https://github.com/VicZhang6/SideNbr)

---

## 中文

<p align="center">
  <img src="docs/assets/sidenbr-icon.png" alt="SideNbr 图标" width="96" height="96" />
</p>

**SideNbr** 是一款轻量 **Chrome Manifest V3** 侧边栏扩展：浏览任意网页时，用快捷键打开 Side Panel，通过 iframe 嵌入 **Perplexity**、**ChatGPT**、**DeepSeek**、**Grok** 的官方网页。

仅本地外壳。**无需 AI API Key，不代理聊天流量。**

[GitHub](https://github.com/VicZhang6/SideNbr) · License: MIT

### 功能

- **键盘快捷键** — 一键打开 / 关闭侧栏（可在 Chrome 中自定义）
- **服务商切换** — Perplexity / ChatGPT / DeepSeek / Grok，带品牌图标
- **启用 1–4 个服务** — 在设置中选择工具栏显示的服务商
- **切换保活** — 已打开的服务在切换时不销毁 iframe，避免反复加载
- **刷新** — 重新加载当前 iframe
- **打开官网** — 在新标签页打开对应官方站点
- **设置面板** — 查看快捷键状态，一键跳转 `chrome://extensions/shortcuts`，管理服务启用
- **中英文界面** — 跟随浏览器语言（EN / ZH）
- **两种构建** — Store-safe（默认可评估上架）与 Private（本地/内测，含 DNR 帧头绕过）

### 截图

> 截图占位。发布前请替换为实际侧栏界面截图。

| 侧栏 | 服务切换 | 设置 |
|------|----------|------|
| *TODO* | *TODO* | *TODO* |

### 快速开始

需要 **Node 20+** 与 **Chrome 114+**。

```bash
git clone https://github.com/VicZhang6/SideNbr.git
cd SideNbr
npm install
npm run build          # Store-safe → dist/
```

加载扩展：

1. 打开 `chrome://extensions`
2. 开启「开发者模式」
3. 「加载已解压的扩展程序」→ 选择项目下的 **`dist/`**
4. 固定工具栏图标；在 `chrome://extensions/shortcuts` 确认快捷键

#### 默认快捷键

| 平台 | 建议默认 |
|------|----------|
| macOS | `Option + A` |
| Windows / Linux | `Alt + A` |

实际绑定以 `chrome://extensions/shortcuts` 为准（可能因冲突未生效）。也可点击扩展图标打开/关闭侧栏。

### 架构

```
┌─────────────────────────────────────┐
│  Chrome Side Panel（本地外壳）       │
│  React UI · 服务切换 · 设置等         │
│  ┌───────────────────────────────┐  │
│  │  iframe → 官方 HTTPS 页面      │  │
│  │  Perplexity / ChatGPT /       │  │
│  │  DeepSeek / Grok              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

- 侧栏必须是扩展包内的**本地页面**（Chrome 不允许 `side_panel.default_path` 指向远程 URL）。
- 本地外壳用 **iframe** 加载白名单内的官方 HTTPS 地址。
- 扩展脚本**无法也不应**读取跨域 iframe 的 DOM / 对话内容。
- 账号与订阅使用你在各官网自己的登录状态；扩展不代理 AI 请求。

**隐私优先：** 无自有后端、无聊天日志、无第三方分析 SDK。

### 两种构建

| | Store-safe | Private（兼容） |
|--|------------|-----------------|
| 命令 | `npm run build` | `npm run build:private` |
| Manifest | `public/manifest.json`（无 DNR） | 构建后覆盖为私有 Manifest |
| 响应头 | 不修改 | 对 **sub_frame** 移除 XFO / CSP（见 `private/`） |
| Chrome Web Store | 可评估上架 | **禁止**作为公开默认分发 |
| 检查 | `npm run check-build` | `node scripts/check-build.mjs --private` |

```bash
# Store-safe（默认、推荐）
npm run build
npm run check-build

# Private — 仅本地 / 内测
npm run build:private
node scripts/check-build.mjs --private
```

#### Private 构建警告

私有构建通过 `declarativeNetRequestWithHostAccess` 在 **sub_frame** 上移除目标站的 `X-Frame-Options` 与 CSP 相关头，用于兼容性验证。这会削弱页面安全约束，且可能触犯商店政策。

详情见 [private/README.md](./private/README.md)。**切勿将 private 构建提交 Chrome Web Store。**

### 技术栈

| 层级 | 技术 |
|------|------|
| UI | React 18, TypeScript, Vite |
| 扩展 | Chrome Manifest V3, Side Panel API |
| 图标 | lucide-react；品牌图标路径来自 LobeHub icons |

### 隐私摘要

- 不读取、不存储、不传输 ChatGPT / Perplexity / DeepSeek / Grok 对话内容
- AI 流量仅在浏览器与对应服务商之间发生
- 本地仅保存服务选择等轻量设置（`chrome.storage.local`）
- 无自有后端、无广告标识、无第三方分析 SDK

完整草案见 [PRIVACY.md](./PRIVACY.md)。

### 脚本

| 脚本 | 说明 |
|------|------|
| `npm run build` | TypeScript + Vite → `dist/`（Store-safe） |
| `npm run build:private` | 同上，并应用私有 Manifest + DNR 规则 |
| `npm run check-build` | 检查 `dist/` 文件与 Store-safe 权限 |
| `node scripts/check-build.mjs --private` | 检查私有构建 |
| `node scripts/generate-icons.mjs` | 生成 PNG 图标 |

### 项目结构

```
SideNbr/
├─ public/                 # Store-safe manifest + icons
├─ private/                # Private manifest, DNR rules, risk notes
├─ scripts/                # build check, private apply, icons
├─ src/                    # React side panel + background
├─ sidepanel.html
├─ PRIVACY.md
├─ CONTRIBUTING.md
├─ LICENSE
└─ README.md
```

### 免责声明

SideNbr **不是** OpenAI、Perplexity、DeepSeek、xAI 或其他服务商的官方产品，也**未获其附属或背书**。第三方名称与标识仅用于描述嵌入的目标服务。使用各服务时请遵守其服务条款与隐私政策。

### 贡献

欢迎 Issue 与 Pull Request。请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

简要约定：

- 默认向 **Store-safe** 路径贡献；勿把 `private/` 规则合并进公开 Manifest
- 保持隐私优先：不引入聊天代理、不采集对话内容
- PR 尽量小而清晰；说明动机与测试方式

### 许可证

[MIT](./LICENSE) © 2026 VicZhang6

仓库：[https://github.com/VicZhang6/SideNbr](https://github.com/VicZhang6/SideNbr)
