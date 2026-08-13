# 口袋AI · 个人 AI 助手（手机网页版）

> 轻量化的手机网页版个人 AI 助手 —— 个人随身知识库 + 事务管家 + 智能问答助手。
> 基于方案文件（`AInote.txt`）开发的纯前端应用，部署在 GitHub Pages，AI 模型使用 **DeepSeek API**。

![技术栈](https://img.shields.io/badge/前端-纯HTML%2FCSS%2FJS-lightgrey)
![AI](https://img.shields.io/badge/AI-DeepSeek%20API-blueviolet)
![部署](https://img.shields.io/badge/部署-GitHub%20Pages-brightgreen)

---

## ✨ 功能总览

| 模块 | 能力 |
| --- | --- |
| **首页（总控制台）** | AI 快捷提问、拍照/相册入口、快捷功能、今日待办 & 日程概览、最近笔记/对话 |
| **AI 对话** | 多轮上下文对话（流式输出）、OCR 图片作为上下文、语音输入、快捷指令（提炼重点/大纲/纪要/行动清单/总结对话） |
| **笔记管理** | 富文本记录、标签分类、搜索、收藏/归档、AI 操作（总结/提炼/扩写/精简/行动清单/翻译/结构化）、多选批量 AI 汇总 |
| **图片 OCR** | 拍照 / 相册 → 浏览器本地识别（Tesseract.js 中英文）→ 手动修正 → 保存笔记 / AI 总结 / AI 提取日程待办 |
| **日程 & 待办** | 月历视图、日程增删改、待办优先级（高/中/低）+ 逾期筛选、**AI 一键提取事务**、AI 本周安排分析 |
| **我的** | 数据统计、标签管理、JSON 备份导出/导入、清除数据、AI 设置（API Key / 模型 / 接口地址） |

**差异化亮点**
- 🧠 数据互通：笔记、OCR、日程、对话全部打通，信息不割裂
- ⚡ 自动化：AI 自动从一段话里抓取日程和待办，不用手动逐条新建
- 🔒 隐私：数据全部保存在浏览器本地，OCR 图片不上传任何服务器
- 📦 轻量化：无需安装 App，浏览器打开即用

---

## 🔧 快速开始

### 1. 获取 DeepSeek API Key

1. 打开 [platform.deepseek.com](https://platform.deepseek.com) 注册并登录
2. 进入「API Keys」→ 创建新密钥，复制保存（如 `sk-...`）
3. 确保账户有余额（DeepSeek 价格极低，几元可用很久）

### 2. 本地预览

```bash
# 方式一：直接双击 index.html 打开（推荐用方式二，部分浏览器 file:// 有安全限制）
# 方式二：本地静态服务器
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

### 3. 配置 AI

打开应用 → 底部「我的」→「AI 设置」：
- 填入 DeepSeek API Key
- 模型推荐 `deepseek-v4-flash`（快而便宜）；`deepseek-v4-pro` 更强更贵
- 点击「测试连接」验证

> **关于 CORS**：DeepSeek 官方接口已确认支持浏览器跨域直连（`Access-Control-Allow-Origin` 会回显请求来源），
> 因此无需后端服务器，API Key 仅保存在你自己的浏览器 localStorage 中，不会写入代码或上传。
> 若你希望进一步隐藏 Key，可参考下文「可选：Cloudflare Worker 代理」。

---

## 🚀 部署到 GitHub Pages

### 方式 A：GitHub Actions（推荐，自动构建）

1. 在 GitHub 新建一个仓库（如 `ai-assistant`），把本项目文件推上去：

```bash
git init
git add .
git commit -m "init: 口袋AI 个人助手"
git branch -M main
git remote add origin https://github.com/<你的用户名>/ai-assistant.git
git push -u origin main
```

2. 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**（仓库已自带工作流 `.github/workflows/deploy.yml`）
3. 等待 1-2 分钟，访问 `https://<你的用户名>.github.io/ai-assistant/`

### 方式 B：手动上传（无需 Git）

1. GitHub 新建仓库
2. 网页端 **Add file → Upload files** 上传本项目全部文件
3. **Settings → Pages → Branch** 选 `main`，路径 `/ (root)`，Save
4. 稍等片刻即可访问

> 手机访问时建议把网址「添加到主屏幕」（iOS Safari / Android Chrome），体验更像原生 App。

---

## 📁 项目结构

```
ai-assistant/
├── index.html            # 应用外壳（页面骨架 + 底部导航）
├── css/app.css           # 移动端优先样式
├── js/
│   ├── store.js          # 本地数据层（localStorage）
│   ├── ai.js             # DeepSeek API 客户端（流式/工具函数）
│   ├── ocr.js            # Tesseract.js 浏览器端 OCR
│   ├── app.js            # 路由 / UI 组件 / Markdown 渲染 / 图标库
│   └── views/            # 六大页面视图
│       ├── home.js       # 首页仪表盘
│       ├── chat.js       # AI 对话
│       ├── notes.js      # 笔记管理
│       ├── ocrview.js    # OCR 识别
│       ├── schedule.js   # 日程日历 + 待办
│       └── settings.js   # 个人中心
├── worker.js             # 可选：Cloudflare Worker 代理
├── test/                 # 冒烟测试（node test/smoke.js、node test/browser-test.js）
└── .github/workflows/    # GitHub Pages 自动部署
```

---

## 🧪 本地测试

```bash
node test/smoke.js          # 数据层 + 渲染函数冒烟测试
node test/browser-test.js   # jsdom 浏览器级测试（需先启动本地服务器）
```

---

## 💡 使用技巧

- **AI 提取事务**：在「日程」页粘贴一段文字（如 *"周三下午3点开项目会议，周五前交周报，记得买菜"*），AI 自动拆出日程和待办，确认后一键加入
- **OCR 场景**：收据、会议白板、课件、文档截图 → 拍照自动转文字 → 直接让 AI 总结或提取事项
- **对话妙用**：把一段长文粘贴进对话，点「提炼重点 / 生成行动清单 / 生成会议纪要」快捷指令
- **数据安全**：在「我的 → 备份导出」定期导出 JSON，换手机/清缓存后导入即可恢复

---

## 🔍 常见问题

| 问题 | 说明 |
| --- | --- |
| 对话报错「API Key 无效」 | 检查 Key 是否复制完整、有无多余空格；在「我的 → AI 设置」重新填写 |
| 报错「余额不足」 | DeepSeek 账户余额不足，到平台充值 |
| OCR 首次很慢/报错 | OCR 首次需联网下载约 10MB 语言模型（之后有缓存）；需确保能访问 jsdelivr CDN |
| 换个浏览器/设备数据没了 | 数据存在浏览器本地，请用「备份导出 + 导入」迁移 |
| 手机上无法访问 GitHub Pages | 部分网络下需要代理或更换网络环境 |

---

## 🔒 隐私说明

- 笔记、待办、日程、对话全部保存在**本机浏览器 localStorage**
- OCR 识别在浏览器本地完成，图片**不会上传**
- AI 对话时消息会发送至 DeepSeek API 处理；API Key 仅存在本机浏览器
- 本项目为个人工具，请勿将含敏感信息的 Key/内容分享给他人

---

## 可选：Cloudflare Worker 代理（隐藏 API Key）

若不想把 Key 存在浏览器里，可部署 `worker.js` 到 Cloudflare Workers：

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → 创建 Worker
2. 粘贴 `worker.js` 内容，在设置中添加变量 `DEEPSEEK_API_KEY`
3. 部署后把 Worker 地址（`https://xxx.workers.dev`）填到应用的「AI 设置 → 接口地址」

> 注意：Worker 直连 `api.deepseek.com` 时需额外配置 CORS 头（`worker.js` 已内置）。

---

*Made with ❤️ · 口袋AI v1.0.0*
