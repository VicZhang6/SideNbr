import type { Messages } from "../types";

export const zh: Messages = {
  "toolbar.aria": "AI 服务工具栏",
  "toolbar.refresh": "刷新当前服务",
  "toolbar.openOfficial": "在官网打开",
  "toolbar.settings": "设置",
  "toolbar.settingsOpen": "打开设置",
  loading: "正在加载…",
  "providerSelect.aria": "选择 AI 服务",
  "error.slowTitle": "加载较慢",
  "error.slowBody":
    "{label} 加载时间较长，可能是网络问题或网站限制了嵌入。你可以继续等待、刷新侧栏，或在官网打开。",
  "error.offlineTitle": "网络已断开",
  "error.offlineBody":
    "当前设备似乎处于离线状态。请检查网络连接，然后刷新侧栏，或在官网打开该服务。",
  "error.blockedTitle": "无法在侧栏中加载",
  "error.blockedBody":
    "{label} 可能禁止了嵌入，或加载失败。请尝试刷新侧栏；若仍无法使用，请在官网打开。",
  "error.reload": "刷新侧栏",
  "error.openOfficial": "在官网打开",
  "error.dismiss": "关闭提示",
  "onboarding.hint":
    "可在设置中，或通过 chrome://extensions/shortcuts 修改唤醒快捷键（macOS：Option+A，Windows/Linux：Alt+A）。",
  "onboarding.openShortcuts": "打开快捷键设置",
  "onboarding.dismiss": "知道了",
  "onboarding.aria": "快捷键提示",
  "settings.title": "{name} 设置",
  "settings.close": "关闭",
  "settings.providersTitle": "启用的 AI 服务",
  "settings.providersHelp":
    "仅启用的服务会显示在工具栏中。切换服务不会销毁已打开的页面（避免重新加载）。关闭服务可释放内存。最少 {min} 个，最多 {max} 个（当前 {count}/{max}）。",
  "settings.enable": "启用 {label}",
  "settings.disable": "关闭 {label}",
  "settings.shortcutTitle": "唤醒快捷键",
  "settings.toggleSidepanel": "打开 / 关闭侧栏",
  "settings.command": "命令",
  "settings.bound": "已绑定",
  "settings.unbound": "当前未绑定，请到 Chrome 中设置",
  "settings.configureShortcut": "配置快捷键",
  "settings.refreshStatus": "刷新状态",
  "settings.shortcutFootnote":
    "Chrome 不允许扩展直接改写系统快捷键；此处会打开 chrome://extensions/shortcuts。",
  "settings.allCommands": "全部命令",
  "settings.openSource": "开源",
  "settings.openSourceMit": "开源 · MIT",
  "settings.openRepo": "在新标签页打开仓库",
  "settings.openExtensionDetails": "打开扩展详情页",
  "settings.cannotReadShortcut": "无法读取快捷键绑定",
  "settings.openingShortcuts": "正在打开快捷键设置…",
  "settings.openedShortcuts":
    "已打开 Chrome 快捷键页，改完后回到侧栏会自动刷新。",
  "settings.cannotOpenShortcuts": "无法自动打开，请手动访问 {url}",
  "settings.minOne": "至少保留 {min} 个服务。",
  "settings.maxFour": "最多同时启用 {max} 个服务。",
  "settings.language": "语言",
  "settings.languageHelp":
    "默认跟随浏览器语言，也可强制使用英语或中文。",
  "settings.langAuto": "跟随系统",
  "settings.langEn": "English",
  "settings.langZh": "中文",
  "settings.appearance": "外观",
  "settings.appearanceHelp":
    "默认跟随系统深浅色，也可手动选择。",
  "settings.themeAuto": "跟随系统",
  "settings.themeLight": "浅色",
  "settings.themeDark": "深色",
  "settings.persistTitle": "后台保持会话",
  "settings.persistHelp":
    "开启后，SideNbr 会在后台窗口中保持 AI 页面，再次打开更快。实验性功能，会占用更多内存。",
  "settings.persistOn": "已开启",
  "settings.persistOff": "已关闭",
  "settings.persistWarning":
    "后台可能出现最小化窗口；若要保持会话请勿强行关闭该窗口。",
  "shortcut.unbound": "未绑定",
  "common.close": "关闭",
};
