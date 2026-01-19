# Claude Agent Frontend

React (Vite) chat UI for the Claude Agent Backend. Supports multiple backend
connections, session creation, streaming chat, and admin console tools.


 ** English | [中文](./README_zh.md) ** 


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
