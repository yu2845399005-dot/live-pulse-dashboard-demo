# Live Pulse Dashboard Demo

独立的 TikTok LIVE 数据看板 Demo，基于同事分享的 [Live Pulse Dashboard](https://live-pulse-dashboard-kleven.dancingmidge1.chatgpt.site/) 的公开前端版本建立，后续在本仓库独立迭代。

## 预览

[GitHub Pages](https://yu2845399005-dot.github.io/live-pulse-dashboard-demo/)

## 本地运行

需要 Python 3，进入项目目录后运行：

```bash
python3 -m http.server 8081 --bind 127.0.0.1
```

浏览器打开 `http://127.0.0.1:8081/`。模块和地理数据需要通过 HTTP 加载，请勿直接双击 HTML。

## 代码入口

- `index.html`、`dashboard.js`、`dashboard.css`：看板入口。
- `analysis-view.js`、`data-view.js`、`data-model.mjs`：分析视图与模拟数据。
- `dashboard-dialogs.js`、`supply-config.js`：配置弹窗。
- `layout-editor.js`、`layout-model.js`：布局编辑。
- `earth-demo/js/presentation.js`、`region-morph.js`、`signal-particles.js`：粒子地球、地区聚合与漂浮信号。
- `assets/`、`vendor/`、`earth-demo/vendor/`：本地图片、图标、字体及运行库。

## 来源与范围

本项目保存浏览器可获取的 HTML、CSS、JavaScript 和静态资源，包含原站的地区与二级地区切换、指标分析、榜单和布局配置。数据为前端模拟数据，配置保存在浏览器本地。

这是公开前端的独立快照，不包含原站开发历史、服务端源码、账户配置或托管平台数据。原站托管平台注入的 Cloudflare 脚本不随本项目复制。共用地球资源来自原有 [TikTok LIVE Dashboard Demo](https://github.com/yu2845399005-dot/tiktok-live-dashboard-demo)，保留已有署名与资源说明。复制记录见 `source-provenance.json`。
