# AthenaLite UI

React frontend for AthenaLite — a serverless SQL query engine. Provides file upload, table browsing, SQL editing, and query result visualization.

## Features

- **Authentication** — Sign up / sign in via AWS Cognito
- **File Upload** — Drag-and-drop CSV, JSON, Parquet files (up to 50MB)
- **Table Browser** — Sidebar showing all tables with expandable column details and types
- **SQL Editor** — CodeMirror with SQL syntax highlighting, multi-tab support
- **Async Query Execution** — Submit query, poll for status, display results when ready
- **Results Table** — Sortable results with copy-as-JSON and CSV download
- **Smart Routing** — Shows upload page for new users, query page for returning users

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- CodeMirror (SQL editor)
- Framer Motion (animations)
- react-resizable-panels (split panes)
- react-dropzone (file upload)
- AWS Amplify (Cognito auth)

## Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000`.

## Configuration

### API Backend

Update `src/api.ts` with your API Gateway URL:

```ts
export const API_BASE = 'https://<api-id>.execute-api.ap-south-1.amazonaws.com/dev';
```

### Cognito

Update `src/amplify-config.ts` with your User Pool details:

```ts
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: '<your-pool-id>',
      userPoolClientId: '<your-client-id>',
    }
  }
});
```

## App Flow

```
Login (Cognito) → Check tables exist?
  ├── No tables  → Landing Page (upload file)
  └── Has tables → Query Page (SQL editor + results)
```

## API Calls

| Action | Endpoint | Method |
|--------|----------|--------|
| Upload file | `/api/upload?userId=` | POST (FormData) |
| List tables | `/api/tables?userId=` | GET |
| Table columns | `/api/tables/{name}/metadata?userId=` | GET |
| Submit query | `/api/query` | POST |
| Poll status | `/api/query/status/{queryId}?userId=` | GET |
| Download CSV | `/api/query/results/{queryId}?userId=` | GET |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with mock API |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Type check |
