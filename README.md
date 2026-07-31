# SideNbr

轻量 Chrome 侧边栏扩展：在浏览任意网页时，用快捷键打开 Side Panel，在 **Perplexity** 与 **ChatGPT** 原生网页之间切换。

**SideNbr** is a lightweight Chrome Manifest V3 side panel extension that embeds the native Perplexity and ChatGPT web UIs via iframe. Local shell only — **no AI API keys, no chat proxy**.

[GitHub](https://github.com/VicZhang6/SideNbr) · License: MIT

---

## Features / 功能

- **键盘快捷键** — 一键打开 / 关闭侧栏（可在 Chrome 中自定义）
- **服务商切换** — Perplexity / ChatGPT，带品牌图标（LobeHub 路径）
- **刷新** — 重新加载当前 iframe
- **打开官网** — 在新标签页打开对应官方站点
- **设置面板** — 查看快捷键状态，一键跳转 `chrome://extensions/shortcuts`
- **两种构建** — Store-safe（可评估上架）与 Private（本地/内测兼容，含 DNR frame-header 绕过）

---

## Screenshots / 截图

> 截图占位。发布前请替换为实际侧栏界面截图。

| Side panel | Provider switch | Settings |
|------------|-----------------|----------|
| *TODO*     | *TODO*          | *TODO*   |

---

## Quick start / 快速开始

需要 **Node 20+** 与 Chrome 114+。

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

### Default shortcuts / 默认快捷键

| Platform       | Suggested default   |
|----------------|---------------------|
| macOS          | `Command + Shift + A` |
| Windows / Linux | `Alt + Shift + A`  |

实际绑定以 `chrome://extensions/shortcuts` 为准（可能因冲突未生效）。也可点击扩展图标打开/关闭侧栏。

---

## Architecture / 架构

```
┌─────────────────────────────────────┐
│  Chrome Side Panel (local shell)    │
│  React UI · provider switch · etc.  │
│  ┌───────────────────────────────┐  │
│  │  iframe → official HTTPS UI   │  │
│  │  Perplexity / ChatGPT         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

- 侧栏必须是扩展包内的**本地页面**（Chrome 不允许 `side_panel.default_path` 指向远程 URL）。
- 本地外壳用 **iframe** 加载白名单内的官方 HTTPS 地址。
- 扩展脚本**无法也不应**读取跨域 iframe 的 DOM / 对话内容。
- 账号与订阅使用你在各官网自己的登录状态；扩展不代理 AI 请求。

**Privacy-first:** no backend of our own, no chat logging, no third-party analytics SDK.

---

## Two builds / 两种构建

| | Store-safe | Private（兼容） |
|--|------------|-----------------|
| Command | `npm run build` | `npm run build:private` |
| Manifest | `public/manifest.json`（无 DNR） | 构建后覆盖为私有 Manifest |
| Headers | 不修改响应头 | 对 **sub_frame** 移除 XFO / CSP（见 `private/`） |
| Chrome Web Store | 可评估上架 | **禁止**上架 / 公开默认分发 |
| Check | `npm run check-build` | `node scripts/check-build.mjs --private` |

```bash
# Store-safe（默认、推荐）
npm run build
npm run check-build

# Private — 仅本地 / 内测
npm run build:private
node scripts/check-build.mjs --private
```

### Private build warning

私有构建通过 `declarativeNetRequestWithHostAccess` 在 **sub_frame** 上移除目标站的 `X-Frame-Options` 与 CSP 相关头，用于兼容性验证。这会削弱页面安全约束，且可能触犯商店政策。

详情见 [private/README.md](./private/README.md)。**切勿将 private 构建提交 Chrome Web Store。**

---

## Tech stack / 技术栈

| Layer | Stack |
|-------|--------|
| UI | React 18, TypeScript, Vite |
| Extension | Chrome Manifest V3, Side Panel API |
| Icons | lucide-react; brand paths from LobeHub (Perplexity / OpenAI) |

---

## Privacy summary / 隐私摘要

- 不读取、不存储、不传输 ChatGPT / Perplexity 对话内容  
- AI 流量仅在浏览器与对应服务商之间发生  
- 本地仅保存服务选择等轻量设置（`chrome.storage.local`）  
- 无自有后端、无广告标识、无第三方分析 SDK  

完整草案见 [PRIVACY.md](./PRIVACY.md)。

---

## Scripts / 脚本

| Script | Description |
|--------|-------------|
| `npm run build` | TypeScript + Vite → `dist/`（Store-safe） |
| `npm run build:private` | 同上，并应用私有 Manifest + DNR 规则 |
| `npm run check-build` | 检查 `dist/` 文件与 Store-safe 权限 |
| `node scripts/check-build.mjs --private` | 检查私有构建 |
| `node scripts/generate-icons.mjs` | 生成 PNG 图标 |

---

## Project layout / 结构

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

## Disclaimer / 免责声明

SideNbr **不是** OpenAI、Perplexity 或 Google 的官方产品，也**未获其附属或背书**。  
第三方名称与标识仅用于描述嵌入的目标服务。使用各服务时请遵守其服务条款与隐私政策。

---

## Contributing / 贡献

欢迎 Issue 与 Pull Request。请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

简要约定：

- 默认向 **Store-safe** 路径贡献；勿把 `private/` 规则合并进公开 Manifest
- 保持隐私优先：不引入聊天代理、不采集对话内容
- PR 尽量小而清晰；说明动机与测试方式

---

## License

[MIT](./LICENSE) © 2026 VicZhang6

Repository: [https://github.com/VicZhang6/SideNbr](https://github.com/VicZhang6/SideNbr)
