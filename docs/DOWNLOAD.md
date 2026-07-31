# Download SideNbr / 下载 SideNbr

## English

### Get a release build

1. Open the repo on GitHub: [VicZhang6/SideNbr](https://github.com/VicZhang6/SideNbr)
2. Go to **Releases** (right sidebar, or `/releases`)
3. Pick the version you want (e.g. `v0.1.4`)
4. Under **Assets**, download one of:
   - **`SideNbr-store-safe-<version>.zip`** — recommended default; suitable for evaluating Chrome Web Store listing
   - **`SideNbr-private-<version>.zip`** — local / personal use only (includes frame-header bypass). **Do not** submit this package to the Chrome Web Store

### Install in Chrome

1. Unzip the downloaded file (you should get a folder with `manifest.json`, `background.js`, `sidepanel.html`, `icons/`, …)
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the **unzipped folder** (the folder that contains `manifest.json`)
5. Pin the toolbar icon; set the shortcut at `chrome://extensions/shortcuts` if needed

### Notes

- Requires **Chrome 114+**
- CI also uploads the same zips as **workflow artifacts** on release runs (Actions → run → Artifacts). GitHub Releases are the preferred public download path.
- To cut a new release yourself: bump `version` in `package.json` / `public/manifest.json`, commit, then `git tag vX.Y.Z && git push origin vX.Y.Z`

---

## 中文

### 获取发布包

1. 打开 GitHub 仓库：[VicZhang6/SideNbr](https://github.com/VicZhang6/SideNbr)
2. 进入 **Releases**（右侧栏，或 `/releases`）
3. 选择版本（例如 `v0.1.4`）
4. 在 **Assets** 中下载其一：
   - **`SideNbr-store-safe-<version>.zip`** — 默认推荐；可作 Chrome 网上应用店评估用
   - **`SideNbr-private-<version>.zip`** — 仅本地 / 个人使用（含 frame 响应头绕过）。**请勿**将此包提交到 Chrome 网上应用店

### 在 Chrome 中安装

1. 解压下载的 zip（目录内应有 `manifest.json`、`background.js`、`sidepanel.html`、`icons/` 等）
2. 打开 `chrome://extensions`
3. 打开 **开发者模式**
4. 点击 **加载已解压的扩展程序**，选择**解压后的文件夹**（含 `manifest.json` 的那一层）
5. 固定工具栏图标；如需快捷键，到 `chrome://extensions/shortcuts` 设置

### 说明

- 需要 **Chrome 114+**
- Release 工作流也会把同样的 zip 作为 **Actions Artifacts** 上传；面向用户请优先从 **GitHub Releases** 下载
- 自行发版：更新 `package.json` / `public/manifest.json` 中的 `version`，提交后执行  
  `git tag vX.Y.Z && git push origin vX.Y.Z`
