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

## 生产环境部署

### 1. 构建生产版本

```bash
npm run build:prod
```

这将在 `dist/` 目录生成优化后的静态文件。

### 2. 部署方式

#### 方式一：静态文件服务器

可以使用任何静态文件服务器托管 `dist/` 目录，例如：

**使用 nginx:**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**使用 serve（用于测试）:**

```bash
npm install -g serve
serve -s dist -p 3000
```

#### 方式二：Docker 部署

创建 `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:prod

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

创建 `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

构建和运行 Docker 容器：

```bash
docker build -t claude-agent-web .
docker run -d -p 8080:80 claude-agent-web
```

#### 方式三：云平台部署

**Vercel:**

```bash
npm install -g vercel
vercel --prod
```

**Netlify:**

1. 将代码推送到 GitHub
2. 在 Netlify 中连接仓库
3. 设置构建命令：`npm run build:prod`
4. 设置发布目录：`dist`

**阿里云 OSS / 腾讯云 COS:**

1. 构建项目：`npm run build:prod`
2. 上传 `dist/` 目录到对象存储
3. 配置静态网站托管和 CDN 加速

### 3. 环境配置

前端应用通过 Settings 界面配置后端连接，无需环境变量。但如果需要预配置默认后端地址，可以修改 `src/` 中的配置文件。

### 4. 生产注意事项

- **HTTPS**: 生产环境务必使用 HTTPS，特别是涉及 API Key 的场景
- **CORS**: 确保后端正确配置 CORS 允许前端域名访问
- **API Key 安全**: 提醒用户妥善保管 API Key
- **缓存策略**: 建议为静态资源（JS/CSS）设置长期缓存，index.html 设置短期缓存
- **压缩**: 确保服务器启用 gzip 或 brotli 压缩

### 5. 性能优化建议

```nginx
# nginx 配置示例
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location = /index.html {
    expires 5m;
    add_header Cache-Control "no-cache";
}
```
