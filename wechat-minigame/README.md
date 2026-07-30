# 差一毫 · 微信小游戏（Canvas 版）

把网页版「差一毫」移植为微信小游戏 Canvas 渲染，玩法不变：在几乎相同的色块里找出细微不同的那一块。

## 目录

```
wechat-minigame/
├── game.js                 # 微信小游戏入口
├── game.json               # 小游戏配置
├── project.config.json     # 微信开发者工具项目配置
├── preview.html            # 浏览器本地预览（不依赖微信）
└── js/
    ├── main.js             # Canvas 渲染 + 游戏逻辑
    └── preview-adapter.js  # 浏览器模拟 wx API
```

## 本地浏览器预览（最快验证）

在仓库根目录启动静态服务后打开预览页：

```bash
python3 -m http.server 8765
```

浏览器访问：http://localhost:8765/wechat-minigame/preview.html

## 用微信开发者工具打开

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 选择 **小游戏** → 导入项目，目录选本文件夹 `wechat-minigame`
3. AppID：可先用测试号 / 游客模式；正式发布需在 [微信公众平台](https://mp.weixin.qq.com/) 注册小游戏并替换 `project.config.json` 里的 `appid`
4. 编译预览 → 真机调试 → 提交审核发布

## 相对网页版的改动

| 网页版 | 微信 Canvas 版 |
|--------|----------------|
| DOM / CSS | 全屏 Canvas 自绘 |
| `localStorage` | `wx.setStorageSync` |
| 鼠标 / 点击 | `wx.onTouchStart` |
| Google Fonts | 系统默认字体（serif / sans-serif） |

逻辑（关卡网格、色差、限时、生命、计分）与网页版一致。

## 发布给别人玩

1. 注册小游戏账号并完成主体认证  
2. 把 `project.config.json` 的 `appid` 改成你的  
3. 开发者工具上传代码 → 公众平台提交审核 → 发布  
4. 发布后可通过搜索、分享卡片、二维码让别人进入
