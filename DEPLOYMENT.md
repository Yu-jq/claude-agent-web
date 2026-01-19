# 部署指南 / Deployment Guide

[English](#english) | [中文](#中文)

---

## 中文

### 快速开始

这是一个基于 Vite + React 的前端应用，部署时需要：
1. 构建生产版本
2. 托管静态文件
3. 配置后端连接

### 详细部署步骤

#### 1. 准备工作

确保已安装：
- Node.js 18 或更高版本
- npm 或 pnpm 包管理器

```bash
node --version  # 应该 >= 18
npm --version
```

#### 2. 安装依赖

```bash
npm install
# 或者使用 pnpm
pnpm install
```

#### 3. 构建生产版本

```bash
npm run build:prod
```

构建完成后，会在项目根目录生成 `dist/` 文件夹，包含所有优化后的静态文件。

#### 4. 部署选项

##### 选项 A: 使用 Nginx（推荐用于自托管）

1. **安装 Nginx**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nginx
   
   # CentOS/RHEL
   sudo yum install nginx
   ```

2. **复制构建文件**
   ```bash
   sudo cp -r dist/* /var/www/claude-agent-web/
   ```

3. **配置 Nginx**
   
   创建配置文件 `/etc/nginx/sites-available/claude-agent-web`:
   
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       root /var/www/claude-agent-web;
       index index.html;
       
       # 支持 React Router
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # 静态资源缓存
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
       
       # index.html 不缓存
       location = /index.html {
           expires 5m;
           add_header Cache-Control "no-cache";
       }
       
       # 启用 gzip 压缩
       gzip on;
       gzip_vary on;
       gzip_min_length 1024;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
   }
   ```

4. **启用站点并重启 Nginx**
   ```bash
   sudo ln -s /etc/nginx/sites-available/claude-agent-web /etc/nginx/sites-enabled/
   sudo nginx -t  # 测试配置
   sudo systemctl restart nginx
   ```

5. **配置 HTTPS（强烈推荐）**
   ```bash
   # 使用 Let's Encrypt
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

##### 选项 B: 使用 Docker

1. **创建 Dockerfile**
   
   在项目根目录创建 `Dockerfile`:
   
   ```dockerfile
   # 构建阶段
   FROM node:18-alpine AS builder
   
   WORKDIR /app
   
   # 复制依赖文件
   COPY package*.json ./
   COPY pnpm-lock.yaml ./
   
   # 安装依赖
   RUN npm install -g pnpm && pnpm install
   
   # 复制源代码
   COPY . .
   
   # 构建生产版本
   RUN pnpm run build:prod
   
   # 运行阶段
   FROM nginx:alpine
   
   # 复制构建文件
   COPY --from=builder /app/dist /usr/share/nginx/html
   
   # 复制 nginx 配置
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   
   EXPOSE 80
   
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **创建 nginx.conf**
   
   ```nginx
   server {
       listen 80;
       server_name localhost;
       
       root /usr/share/nginx/html;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
       
       location = /index.html {
           expires 5m;
           add_header Cache-Control "no-cache";
       }
       
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
   }
   ```

3. **构建和运行**
   ```bash
   # 构建镜像
   docker build -t claude-agent-web .
   
   # 运行容器
   docker run -d -p 8080:80 --name claude-agent-web claude-agent-web
   ```

4. **使用 Docker Compose（可选）**
   
   创建 `docker-compose.yml`:
   
   ```yaml
   version: '3.8'
   
   services:
     web:
       build: .
       ports:
         - "8080:80"
       restart: unless-stopped
       container_name: claude-agent-web
   ```
   
   启动：
   ```bash
   docker-compose up -d
   ```

##### 选项 C: 云平台部署

**Vercel**

1. 安装 Vercel CLI
   ```bash
   npm install -g vercel
   ```

2. 登录并部署
   ```bash
   vercel login
   vercel --prod
   ```

3. 或者通过 Vercel 网站导入 GitHub 仓库

**Netlify**

1. 通过网站导入仓库，或使用 CLI：
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod
   ```

2. 配置：
   - Build command: `npm run build:prod`
   - Publish directory: `dist`

**阿里云 OSS 静态网站托管**

1. 构建项目
   ```bash
   npm run build:prod
   ```

2. 安装 ossutil
   ```bash
   wget http://gosspublic.alicdn.com/ossutil/1.7.15/ossutil64
   chmod 755 ossutil64
   ./ossutil64 config
   ```

3. 上传文件
   ```bash
   ./ossutil64 cp -r dist/ oss://your-bucket-name/ --update
   ```

4. 在 OSS 控制台配置：
   - 开启静态网站托管
   - 设置索引文档为 `index.html`
   - 设置错误文档为 `index.html`（支持前端路由）
   - 配置 CDN 加速

**AWS S3 + CloudFront**

1. 构建并上传
   ```bash
   npm run build:prod
   aws s3 sync dist/ s3://your-bucket-name/ --delete
   ```

2. 配置 S3 bucket 为静态网站
3. 配置 CloudFront 分发，设置错误页面重定向到 index.html

##### 选项 D: 传统虚拟主机

1. 构建项目
   ```bash
   npm run build:prod
   ```

2. 通过 FTP/SFTP 上传 `dist/` 目录内容到服务器

3. 确保服务器配置支持单页应用（SPA）路由

#### 5. 配置后端连接

部署完成后，用户需要在前端界面的 Settings 中配置：
- 后端地址（例如：`https://api.your-domain.com`）
- API Key（由管理员创建）

### 生产环境检查清单

- [ ] 使用 HTTPS
- [ ] 配置 CORS 允许前端域名
- [ ] 设置合理的缓存策略
- [ ] 启用 gzip/brotli 压缩
- [ ] 配置 CDN（可选，提升访问速度）
- [ ] 设置监控和日志
- [ ] 定期备份
- [ ] 测试所有功能正常工作

### 常见问题

**Q: 部署后页面刷新出现 404**

A: 需要配置服务器将所有请求都指向 `index.html`，以支持前端路由。参考上面的 Nginx 配置中的 `try_files` 指令。

**Q: 如何配置默认后端地址？**

A: 可以修改源代码中的配置文件，然后重新构建。但推荐让用户在 Settings 中自行配置。

**Q: 可以和后端部署在同一台服务器吗？**

A: 可以。可以使用 Nginx 反向代理，将前端和后端部署在不同端口，通过路径分发。

**Q: 如何更新部署的版本？**

A: 重新执行 `npm run build:prod`，然后替换服务器上的文件即可。使用 Docker 的话重新构建镜像并重启容器。

---

## English

### Quick Start

This is a Vite + React frontend application. Deployment requires:
1. Building the production version
2. Hosting static files
3. Configuring backend connection

### Detailed Deployment Steps

#### 1. Prerequisites

Ensure you have installed:
- Node.js 18 or higher
- npm or pnpm package manager

```bash
node --version  # Should be >= 18
npm --version
```

#### 2. Install Dependencies

```bash
npm install
# or use pnpm
pnpm install
```

#### 3. Build for Production

```bash
npm run build:prod
```

After building, a `dist/` folder will be generated in the project root, containing all optimized static files.

#### 4. Deployment Options

##### Option A: Using Nginx (Recommended for Self-Hosting)

1. **Install Nginx**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nginx
   
   # CentOS/RHEL
   sudo yum install nginx
   ```

2. **Copy Build Files**
   ```bash
   sudo cp -r dist/* /var/www/claude-agent-web/
   ```

3. **Configure Nginx**
   
   Create configuration file `/etc/nginx/sites-available/claude-agent-web`:
   
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       root /var/www/claude-agent-web;
       index index.html;
       
       # Support React Router
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Static asset caching
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
       
       # No cache for index.html
       location = /index.html {
           expires 5m;
           add_header Cache-Control "no-cache";
       }
       
       # Enable gzip compression
       gzip on;
       gzip_vary on;
       gzip_min_length 1024;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
   }
   ```

4. **Enable Site and Restart Nginx**
   ```bash
   sudo ln -s /etc/nginx/sites-available/claude-agent-web /etc/nginx/sites-enabled/
   sudo nginx -t  # Test configuration
   sudo systemctl restart nginx
   ```

5. **Configure HTTPS (Highly Recommended)**
   ```bash
   # Using Let's Encrypt
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

##### Option B: Using Docker

1. **Create Dockerfile**
   
   Create `Dockerfile` in project root:
   
   ```dockerfile
   # Build stage
   FROM node:18-alpine AS builder
   
   WORKDIR /app
   
   # Copy dependency files
   COPY package*.json ./
   COPY pnpm-lock.yaml ./
   
   # Install dependencies
   RUN npm install -g pnpm && pnpm install
   
   # Copy source code
   COPY . .
   
   # Build production version
   RUN pnpm run build:prod
   
   # Runtime stage
   FROM nginx:alpine
   
   # Copy build files
   COPY --from=builder /app/dist /usr/share/nginx/html
   
   # Copy nginx configuration
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   
   EXPOSE 80
   
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Create nginx.conf**
   
   ```nginx
   server {
       listen 80;
       server_name localhost;
       
       root /usr/share/nginx/html;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
       
       location = /index.html {
           expires 5m;
           add_header Cache-Control "no-cache";
       }
       
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
   }
   ```

3. **Build and Run**
   ```bash
   # Build image
   docker build -t claude-agent-web .
   
   # Run container
   docker run -d -p 8080:80 --name claude-agent-web claude-agent-web
   ```

4. **Using Docker Compose (Optional)**
   
   Create `docker-compose.yml`:
   
   ```yaml
   version: '3.8'
   
   services:
     web:
       build: .
       ports:
         - "8080:80"
       restart: unless-stopped
       container_name: claude-agent-web
   ```
   
   Start:
   ```bash
   docker-compose up -d
   ```

##### Option C: Cloud Platform Deployment

**Vercel**

1. Install Vercel CLI
   ```bash
   npm install -g vercel
   ```

2. Login and deploy
   ```bash
   vercel login
   vercel --prod
   ```

3. Or import GitHub repository through Vercel website

**Netlify**

1. Import repository through website, or use CLI:
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod
   ```

2. Configuration:
   - Build command: `npm run build:prod`
   - Publish directory: `dist`

**AWS S3 + CloudFront**

1. Build and upload
   ```bash
   npm run build:prod
   aws s3 sync dist/ s3://your-bucket-name/ --delete
   ```

2. Configure S3 bucket as static website
3. Configure CloudFront distribution, set error page redirect to index.html

##### Option D: Traditional Web Hosting

1. Build project
   ```bash
   npm run build:prod
   ```

2. Upload `dist/` directory contents to server via FTP/SFTP

3. Ensure server configuration supports Single Page Application (SPA) routing

#### 5. Configure Backend Connection

After deployment, users need to configure in the frontend Settings interface:
- Backend URL (e.g., `https://api.your-domain.com`)
- API Key (created by admin)

### Production Environment Checklist

- [ ] Use HTTPS
- [ ] Configure CORS to allow frontend domain
- [ ] Set appropriate caching strategy
- [ ] Enable gzip/brotli compression
- [ ] Configure CDN (optional, improves access speed)
- [ ] Set up monitoring and logging
- [ ] Regular backups
- [ ] Test all features work correctly

### FAQ

**Q: Getting 404 errors when refreshing pages after deployment**

A: You need to configure the server to redirect all requests to `index.html` to support frontend routing. See the `try_files` directive in the Nginx configuration above.

**Q: How to configure default backend URL?**

A: You can modify the configuration file in the source code and rebuild. However, it's recommended to let users configure it in Settings.

**Q: Can frontend and backend be deployed on the same server?**

A: Yes. You can use Nginx reverse proxy to deploy frontend and backend on different ports with path-based routing.

**Q: How to update the deployed version?**

A: Re-run `npm run build:prod` and replace the files on the server. For Docker, rebuild the image and restart the container.
