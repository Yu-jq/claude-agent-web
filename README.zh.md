# Claude Agent 前端

基于 React（Vite）的聊天 UI，用于 Claude Agent 后端。支持多后端连接、
会话创建、流式聊天，以及管理员控制台功能。

## 功能

- 多后端连接（存储在 localStorage）
- 支持 Claude Agent 会话创建
- OpenAI 风格的流式聊天 UI
- 工具/状态事件显示（完整或仅状态）
- `/admin` 管理控制台（会话与 API Key）
- UI 多语言（中文/英文/日文/韩文），默认跟随浏览器

## 运行环境

- Node.js 18+
- 需要先运行后端（见 `backend/README.md`）

## 安装

```bash
cd frontend
npm install
```

也可以使用 pnpm。

## 启动

```bash
npm run dev
```

## 配置与使用

1) 打开 Settings 添加后端连接：
   - 后端地址（如 `http://localhost:8000`）
   - API Key（由管理员创建）

2) 验证连接后创建会话。

3) 在聊天面板发送消息并流式接收，Stop 按钮可中断并保留部分输出。

4) 可在 Settings 中切换界面语言。

## 全局偏好

偏好设置保存在 localStorage：

- 过程显示模式：`full` 或 `status`
- UI 语言：`zh`、`en`、`ja`、`ko`

## 管理员控制台

访问 `/admin`，输入 `X-Admin-Key` 管理会话和 API Key。
API Key 支持按时长或指定时间过期。

## 备注

- 前端默认按流式处理，非流式请求也会按流式显示。
- Markdown 表格渲染依赖 `remark-gfm`（已在 `package.json` 中）。
