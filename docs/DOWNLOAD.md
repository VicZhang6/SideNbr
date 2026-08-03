# Download SideNbr / 下载 SideNbr

## English

### Get a release build

1. Open [VicZhang6/SideNbr](https://github.com/VicZhang6/SideNbr)
2. Go to **[Releases](https://github.com/VicZhang6/SideNbr/releases)**
3. Download **`SideNbr-<version>.zip`**

There is a **single full build** (open-source). No store-safe / private split.

### Install in Chrome

1. Unzip (you should see `manifest.json`, `background.js`, `sidepanel.html`, `icons/`, …)
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. **Load unpacked** → select the unzipped folder
5. Pin the icon; optional shortcut at `chrome://extensions/shortcuts` (default: **Option+A** / **Alt+A**)

### Update

Unpacked extensions are identified by **folder path**. Loading a new zip from another folder adds a **second** SideNbr (different ID) instead of replacing the old one.

**Recommended**

1. Download and unzip the new `SideNbr-<version>.zip`
2. At `chrome://extensions`, **Remove** the old SideNbr
3. **Load unpacked** → select the new folder  
   Or overwrite the **same** install folder with the new files, then click **Reload** on that card

Keep only one SideNbr enabled to avoid shortcut / side panel conflicts.

### Notes

- Chrome **114+**
- Open-source distribution only — **not** submitted to the Chrome Web Store
- Cut a release: bump `version` in `package.json` + `public/manifest.json`, then  
  `git tag vX.Y.Z && git push origin vX.Y.Z`

---

## 中文

### 获取发布包

1. 打开 [VicZhang6/SideNbr](https://github.com/VicZhang6/SideNbr)
2. 进入 **[Releases](https://github.com/VicZhang6/SideNbr/releases)**
3. 下载 **`SideNbr-<version>.zip`**

只有**一个完整开源包**，不再区分 safe / private。

### 在 Chrome 中安装

1. 解压
2. `chrome://extensions` → **开发者模式**
3. **加载已解压的扩展程序** → 选解压目录
4. 固定图标；快捷键默认 **Option+A**（Mac）/ **Alt+A**（Windows）

### 更新

「已解压」扩展按**目录路径**区分。若把新版 zip 解压到**另一个文件夹**再「加载已解压」，Chrome 会当成**第二个**扩展（ID 不同），不会覆盖旧版。

**推荐做法**

1. 下载并解压新的 `SideNbr-<version>.zip`
2. 在 `chrome://extensions` 中 **移除** 旧的 SideNbr
3. **加载已解压的扩展程序** → 选择新目录  
   或把新文件**覆盖到原来的安装目录**，再在该扩展卡片上点 **重新加载**

请只保留一个已启用的 SideNbr，避免快捷键或侧栏冲突。

### 说明

- 需要 Chrome 114+
- 仅开源分发，不上架 Chrome 网上应用店
- 自行发版：改版本号后 `git tag vX.Y.Z && git push origin vX.Y.Z`
