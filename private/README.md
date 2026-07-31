# Private / Compatibility Build — 风险说明

> **警告：此目录仅用于本地、个人或明确授权的企业内部测试。生成的扩展包不得提交 Chrome Web Store，不得对外默认分发。**

## 这是什么？

私有构建在 Store-safe 版本基础上增加：

| 能力 | 说明 |
|------|------|
| `declarativeNetRequestWithHostAccess` | 允许对已声明主机修改响应头 |
| `frame-bypass-rules.json` | 对 **sub_frame** 请求移除 `X-Frame-Options`、`Content-Security-Policy`、`Content-Security-Policy-Report-Only` |
| 独立名称 | `SideNbr (Private)`，与商店包区分 |

规则仅作用于：

- `perplexity.ai`（规则 id `1001`）
- `chatgpt.com` / `openai.com`（规则 id `1002`）
- 资源类型：`sub_frame`（**不**处理 `main_frame`）

## 为什么有风险？

1. **粗粒度绕过**：移除整条 CSP 不只是放开 `frame-ancestors`，也会削弱目标页的其他安全约束。
2. **政策风险**：Chrome Web Store 禁止以绕过 AI 服务安全防护/使用限制为核心能力的扩展；相关政策趋严。
3. **不稳定**：目标站随时可改策略；私有规则不是长期产品承诺。
4. **合规边界**：仅在你有权测试的环境中使用；不要冒充官方扩展。

## 如何构建

```bash
# 在仓库根目录
npm ci
npm run build:private
# 或：node scripts/apply-private-manifest.mjs（需已有 dist/）
```

然后在 `chrome://extensions` 开发者模式中「加载已解压的扩展程序」→ 选择 `dist/`。

验证：

```bash
node scripts/check-build.mjs --private
```

## 与 Store-safe 的对比

| | Store-safe (`npm run build`) | Private (`npm run build:private`) |
|--|------------------------------|-----------------------------------|
| 名称 | SideNbr | SideNbr (Private) |
| DNR 权限 / 规则 | 无 | 有 |
| 上架商店 | 可评估 | **禁止** |
| 嵌入失败时 | 降级到「在官网打开」 | 尝试兼容后仍可能失败 |

## 文件清单

- `manifest.private.json` — 完整私有 Manifest（构建时覆盖 `dist/manifest.json`）
- `frame-bypass-rules.json` — DNR modifyHeaders 规则（复制到 `dist/`）
- `README.md` — 本风险说明

## 不要做的事

- 不要把 `private/` 规则合并进默认 `public/manifest.json`
- 不要对 `main_frame` 或 `<all_urls>` 启用同类规则
- 不要在商店截图、描述或隐私政策中把「绕过 frame 限制」写成卖点
- 不要把私有包与商店包混用同一版本号对外发布

**若 Store-safe 构建已足够可用，请优先使用 Store-safe，不要启用本目录能力。**
