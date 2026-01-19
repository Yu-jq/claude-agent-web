# Claude Agent Frontend

React (Vite) chat UI for the Claude Agent Backend. Supports multiple backend
connections, session creation, streaming chat, and admin console tools.

## Features

- Multi-backend connections stored in localStorage
- Session creation with Claude Agent options
- OpenAI-style streaming chat UI
- Process events (status/tool use/results) with full or status-only display
- Admin console at `/admin` for sessions and API keys
- UI language switcher (zh/en/ja/ko) with browser-language default

## Requirements

- Node.js 18+
- Backend running (see `backend/README.md`)

## Install

```bash
cd frontend
npm install
```

Or use pnpm if preferred.

## Run

```bash
npm run dev
```

## Configuration & Usage

1) Open Settings and add a backend connection:
   - Base URL (e.g. `http://localhost:8000`)
   - API key (created via admin API)

2) Verify the connection, then create a session.

3) Use the chat panel to stream responses. The Stop button interrupts the
   backend and keeps partial output.

4) Optional: set the UI language in Settings.

## Global Preferences

Preferences are stored in localStorage:

- Process display mode: `full` or `status`
- UI language: `zh`, `en`, `ja`, `ko`

## Admin Console

Visit `/admin` and enter the `X-Admin-Key` to manage sessions and API keys.
API keys support duration- or date-time-based expiry.

## Notes

- The UI expects streaming; non-streaming calls are treated as streaming.
- Tables in Markdown require `remark-gfm` (already listed in `package.json`).

## Production Deployment

### 1. Build for Production

```bash
npm run build:prod
```

This generates optimized static files in the `dist/` directory.

### 2. Deployment Options

#### Option 1: Static File Server

You can host the `dist/` directory using any static file server, for example:

**Using nginx:**

```nginx
server {
    listen 80;
    server_name example.com;
    
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Using serve (for testing):**

```bash
npm install -g serve
serve -s dist -p 3000
```

#### Option 2: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm run build:prod

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

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

Build and run the Docker container:

```bash
docker build -t claude-agent-web .
docker run -d -p 8080:80 claude-agent-web
```

#### Option 3: Cloud Platform Deployment

**Vercel:**

```bash
npm install -g vercel
vercel --prod
```

**Netlify:**

1. Push code to GitHub
2. Connect repository in Netlify
3. Set build command: `npm run build:prod`
4. Set publish directory: `dist`

**AWS S3 / Cloudflare Pages:**

1. Build the project: `npm run build:prod`
2. Upload the `dist/` directory to your storage service
3. Configure static website hosting and CDN

### 3. Environment Configuration

The frontend configures backend connections through the Settings UI, so no environment variables are needed. However, if you want to pre-configure a default backend URL, you can modify the configuration files in `src/`.

### 4. Production Considerations

- **HTTPS**: Always use HTTPS in production, especially when dealing with API keys
- **CORS**: Ensure the backend is properly configured to allow the frontend domain
- **API Key Security**: Remind users to keep their API keys secure
- **Caching Strategy**: Set long-term caching for static assets (JS/CSS), short-term for index.html
- **Compression**: Enable gzip or brotli compression on your server

### 5. Performance Optimization

```nginx
# nginx configuration example
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml application/font-woff application/font-woff2 font/woff font/woff2 application/vnd.ms-fontobject;

location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location = /index.html {
    expires 5m;
    add_header Cache-Control "no-cache";
}
```
