# SideNbr

<p align="center">
  <img src="docs/assets/sidenbr-icon.png" alt="SideNbr icon" width="128" height="128" />
</p>

<p align="center">
  <strong>SideNbr</strong> is an open-source Chrome <strong>Manifest V3</strong> side panel that embeds the official web UIs of
  <strong>Perplexity</strong>, <strong>ChatGPT</strong>, <strong>DeepSeek</strong>, <strong>Grok</strong>, and your own sites —
  while you browse any page.
</p>

<p align="center">
  Local shell only · <strong>No AI API keys</strong> · <strong>No chat proxy</strong> · MIT
</p>

<p align="center">
  <a href="#中文">中文</a> ·
  <a href="https://github.com/VicZhang6/SideNbr">GitHub</a> ·
  <a href="https://github.com/VicZhang6/SideNbr/releases">Releases</a> ·
  <a href="./docs/DOWNLOAD.md">Install guide</a>
</p>

---

## Why SideNbr?

Keep researching or coding on the main page, and keep AI chats one shortcut away in Chrome’s side panel — without pasting API keys or routing traffic through a third-party backend.

| You get | SideNbr does **not** |
|---------|----------------------|
| Official web UIs in an iframe | Proxy or store your chats |
| 1–4 tabs (built-in + custom) | Require API keys |
| Toolbar order you control | Read cross-origin chat DOM |
| Settings as a full tab + live updates | Ship a Chrome Web Store binary |

---

## Download (no build required)

1. Open **[Releases](https://github.com/VicZhang6/SideNbr/releases)**
2. Download **`SideNbr-x.y.z.zip`**
3. Unzip → `chrome://extensions` → **Developer mode** → **Load unpacked**

**Update:** remove the old SideNbr first, or overwrite the **same** folder and click **Reload**. Loading a new folder creates a second extension (does not replace). See [docs/DOWNLOAD.md](./docs/DOWNLOAD.md).

**Open-source only** — not submitted to the Chrome Web Store.

---

## Features

### Side panel
- **Wake shortcut** — open / close the panel (`Option+A` / `Alt+A` suggested; remappable in Chrome)
- **Provider switch** — Perplexity · ChatGPT · DeepSeek · Grok with brand icons (mono icons adapt to dark mode)
- **Keep-alive switch** — opened providers stay mounted so sessions warm across tab switches
- **Refresh** / **Open official site** toolbar actions
- **Update badge** — settings gear shows a red `1` when a newer GitHub Release exists

### Custom & order
- **1–4 enabled services** total (built-in and/or custom)
- **Custom services** — name, `https` URL, emoji or brand icon; auto-enable when under the limit
- **Drag-to-reorder** toolbar order (persisted)
- **Live sync** — toggles / customs apply without reloading the extension

### Settings (dedicated browser tab)
Sidebar navigation:

| Nav | Content |
|-----|---------|
| **Appearance & language** | Light / dark / system · EN / ZH / system |
| **AI services** | Toolbar order · built-in toggles · custom services |
| **Lab** | Keep sessions warm in a background host window |
| **Shortcuts** | View binding · open Chrome shortcut settings |
| **About** | Version · check GitHub Releases · repo link · extension details |

Toasts for update results and enable-limit hints; purple active controls in dark mode.

### Packaging
- **Single full open-source zip** with Declarative Net Request frame-compatibility rules for side-panel iframes
- GitHub Actions builds **`SideNbr-<version>.zip`** on each `v*` tag

---

## Quick start (from source)

Requires **Node 20+** and **Chrome 114+**.

```bash
git clone https://github.com/VicZhang6/SideNbr.git
cd SideNbr
npm install
npm run build          # → dist/
```

1. `chrome://extensions` → **Developer mode**
2. **Load unpacked** → select **`dist/`**
3. Pin the icon; check `chrome://extensions/shortcuts`

### Default shortcuts

| Platform        | Suggested default |
|-----------------|-------------------|
| macOS           | `Option + A`      |
| Windows / Linux | `Alt + A`         |

Effective binding is whatever Chrome shows (may be empty if another extension claimed the combo). The toolbar icon also toggles the panel.

---

## Architecture

```
┌──────────────────────────────────────────┐
│  Chrome Side Panel (extension-local)     │
│  React shell · switch · toolbar          │
│  ┌────────────────────────────────────┐  │
│  │  iframe → official HTTPS UI        │  │
│  │  + optional custom sites           │  │
│  └────────────────────────────────────┘  │
│  optional: session-host window (Lab)     │
└──────────────────────────────────────────┘
```

- `side_panel.default_path` must be a **local** extension page (Chrome rule).
- The shell loads allowlisted / user-granted HTTPS URLs in iframes.
- Scripts **cannot** read cross-origin iframe chat content — by design.
- Logins and subscriptions stay with each provider.

**Privacy-first:** no first-party backend, no chat logging, no analytics SDK.

---

## Build & scripts

```bash
npm install
npm run build         # TypeScript + Vite → dist/
npm run check-build   # verify package
npm run pack          # zip → artifacts/SideNbr-<version>.zip
npm run typecheck
```

| Script | Purpose |
|--------|---------|
| `npm run build` | Production `dist/` |
| `npm run check-build` | Validate `dist/` |
| `npm run pack` | Build + zip |
| `node scripts/generate-icons.mjs` | PNG icons from source |

### Tech stack

| Layer | Stack |
|-------|--------|
| UI | React 18, TypeScript, Vite |
| Extension | Chrome MV3, Side Panel, DNR, `chrome.storage` |
| Icons | lucide-react; brand marks adapted from LobeHub icons |

### Layout

```
SideNbr/
├─ public/              # manifest, icons, frame-bypass DNR rules
├─ scripts/             # check-build, package-dist, generate-icons
├─ src/                 # side panel, settings tab, session-host, background
├─ sidepanel.html
├─ settings.html
├─ session-host.html
├─ docs/DOWNLOAD.md
├─ PRIVACY.md
├─ CONTRIBUTING.md
└─ README.md
```

---

## Privacy summary

- Does **not** read, store, or transmit conversation content from embedded AIs
- AI traffic stays between your browser and each provider
- Only lightweight prefs in `chrome.storage.local` (enabled list, order, theme, locale, customs, …)
- No ad IDs, no third-party analytics SDK

Full draft: [PRIVACY.md](./PRIVACY.md).

---

## Disclaimer

SideNbr is **not** an official product of OpenAI, Perplexity, DeepSeek, xAI, or any other provider, and is **not affiliated with or endorsed by** them. Names and marks are used only to describe embedded services. Use of those services is subject to their own terms and privacy policies.

---

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

- One open-source package path (no store-safe / private split)
- Stay privacy-first: no chat proxy, no conversation harvesting
- Small PRs with motivation + how you tested

---

## Friendly Links

- [LINUX DO](https://linux.do/) — A new ideal community

---

## License

[MIT](./LICENSE) © 2026 VicZhang6

Repository: [https://github.com/VicZhang6/SideNbr](https://github.com/VicZhang6/SideNbr)

---

## 中文

<p align="center">
  <img src="docs/assets/sidenbr-icon.png" alt="SideNbr 图标" width="96" height="96" />
</p>

**SideNbr** 是开源的 Chrome **Manifest V3** 侧边栏扩展：浏览任意网页时，用快捷键打开 Side Panel，通过 iframe 嵌入 **Perplexity**、**ChatGPT**、**DeepSeek**、**Grok** 官方页面，以及你自己的站点。

仅本地外壳。**无需 API Key，不代理聊天流量。** MIT 许可。

[Releases 下载](https://github.com/VicZhang6/SideNbr/releases) · [安装说明](./docs/DOWNLOAD.md)

**更新：** 先移除旧版 SideNbr，或覆盖**同一目录**后点重新加载。解压到新文件夹再「加载已解压」会并存两个扩展，详见 [docs/DOWNLOAD.md](./docs/DOWNLOAD.md)。

### 为什么用 SideNbr？

主页面继续写代码 / 查资料，AI 对话一键在侧栏打开——不用填 Key、也不用把流量交给第三方后端。

### 功能概览

**侧栏**

- 唤醒快捷键（默认建议 Option+A / Alt+A，可在 Chrome 中改）
- 多服务切换 + 品牌图标（深色模式下 mono 图标自动反色）
- 切换保活：已打开的 iframe 不销毁
- 刷新 / 打开官网
- 有新 GitHub Release 时，设置按钮显示角标

**自定义与排序**

- 最多同时启用 **1–4** 个服务（内置 + 自定义）
- 自定义：名称、URL、emoji / 品牌图标
- **拖拽**调整工具栏顺序
- 设置更改后侧栏**热更新**，无需重载扩展

**设置页（独立标签 + 左侧导航）**

| 导航 | 内容 |
|------|------|
| 外观与语言 | 浅色 / 深色 / 跟随系统 · 中 / 英 / 跟随系统 |
| AI 服务 | 工具栏排序 · 预设开关 · 自定义服务 |
| 实验室 | 后台保持会话 |
| 快捷键 | 查看绑定 · 打开 Chrome 快捷键设置 |
| 关于 | 版本号 · 检查更新 · 开源仓库 · 扩展详情 |

Toast 提示更新结果与「最多 4 个」等限制；深色模式激活色为品牌紫。

**分发**

- 单一开源完整包（含侧栏嵌入用的 DNR 规则）
- 打 `v*` 标签后 Actions 自动上传 `SideNbr-<version>.zip`
- **不上架** Chrome 网上应用店

### 快速开始

```bash
git clone https://github.com/VicZhang6/SideNbr.git
cd SideNbr
npm install
npm run build    # → dist/
```

`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选择 **`dist/`**。

### 架构（简述）

侧栏必须是扩展包内的本地页；iframe 加载官方 / 自定义 HTTPS 页面。扩展脚本**无法**读取跨域对话内容。账号登录使用你在各官网自己的会话。

### 隐私

不读取、不存储、不传输各 AI 对话内容；仅 `chrome.storage.local` 保存轻量偏好。详见 [PRIVACY.md](./PRIVACY.md)。

### 免责声明

SideNbr **不是** OpenAI / Perplexity / DeepSeek / xAI 等官方产品，也未获其背书。第三方名称仅用于描述嵌入目标。

### 友情链接

- [LINUX DO](https://linux.do/) — A new ideal community

### 贡献与许可

欢迎 Issue / PR，见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

[MIT](./LICENSE) © 2026 VicZhang6 · [仓库](https://github.com/VicZhang6/SideNbr)
