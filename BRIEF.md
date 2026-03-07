# Plan App — Project Brief

## What Is This
An infinite canvas tool for creative planning — our own Miro/AFFiNE alternative. Open-source, self-hosted, fully owned by us.
Deployed to `plan.aditor.ai`. Must feel premium, smooth, and polished from day one.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Canvas Engine:** tldraw SDK (`@tldraw/tldraw`)
- **Styling:** Tailwind CSS + CSS modules for canvas components
- **Storage:** Local filesystem + Cloudflare R2 (images)
- **Backend API:** Next.js API routes (same app)
- **AI Tools:** Calls to `https://gen.aditor.ai/api/*`
- **Deploy:** GitHub Actions → SSH deploy to VPS `46.224.96.47`

## Core Features (V1)

### 1. Multi-Board System
- Sidebar with board list (folders/boards hierarchy)
- Create/rename/delete boards
- Boards stored as JSON files on disk (or sqlite later)
- Clean sidebar — collapsible, minimal, boards have color-coded icons

### 2. Infinite Canvas (via tldraw)
- Smooth pan/zoom (trackpad + mouse wheel)
- Drag-and-drop images onto canvas
- Paste images from clipboard
- Sticky notes (colored, editable text)
- Freeform drawing/pen tool
- Text blocks
- Shapes (rectangle, circle, arrow, line)
- Connectors between elements
- Selection, multi-select, group
- Undo/redo
- Zoom indicator (bottom-right, like Miro: "144%")

### 3. AI Image Tools (on image selection toolbar)
- **Remove Background** — calls `POST /api/remove-bg` with image URL → replaces image on canvas
- **AI Edit** — prompt + selected image as reference → calls `POST /api/generate` with `referenceImageUrl` → replaces image

### 4. AI Generation Tools (right-click context menu on empty canvas)
- **Generate Image** — prompt + aspect ratio → calls `POST /api/generate` → places new image on canvas
- **Image Search** — search query → calls `GET /api/image-search` → shows grid, click to place on canvas

### 5. Image Storage
- Images uploaded to R2 bucket via `POST /api/upload`
- Served from `cdn.gen.aditor.ai` or local `/uploads/`
- tldraw assets stored with board data

## API Endpoints (proxy to gen.aditor.ai)
These are API routes in the Next.js app that proxy to the existing gen backend:

```
POST /api/ai/remove-bg     → proxies to https://gen.aditor.ai/api/remove-bg
POST /api/ai/generate      → proxies to https://gen.aditor.ai/api/generate  
GET  /api/ai/image-search  → proxies to https://gen.aditor.ai/api/image-search
POST /api/boards           → CRUD for boards (local JSON/sqlite)
GET  /api/boards           → list boards
GET  /api/boards/:id       → get board data (tldraw snapshot)
PUT  /api/boards/:id       → save board data
DELETE /api/boards/:id     → delete board
```

## UI Design Direction

### Vibe
Premium, editorial, Vox-style. Clean whites with bold accent colors. 
Not corporate. Not cutesy. Sophisticated but accessible.

### Color System
```css
:root {
  /* Canvas */
  --canvas-bg: #F5F5F3;
  --canvas-grid: rgba(0,0,0,0.03);
  
  /* Surfaces */
  --surface: #FFFFFF;
  --surface-elevated: #FFFFFF;
  --surface-hover: #F7F7F5;
  
  /* Text */
  --text-primary: #1A1A1A;
  --text-secondary: #71717A;
  --text-muted: #A1A1AA;
  
  /* Accents */
  --accent-blue: #2563EB;
  --accent-yellow: #F5D547;
  --accent-pink: #EC4899;
  --accent-red: #EF4444;
  --accent-teal: #14B8A6;
  
  /* Borders */
  --border: #E4E4E7;
  --border-subtle: #F0F0EE;
  
  /* Sticky note colors */
  --sticky-yellow: #FEF9C3;
  --sticky-pink: #FCE7F3;
  --sticky-blue: #DBEAFE;
  --sticky-green: #DCFCE7;
  --sticky-purple: #F3E8FF;
}
```

### Dark Mode
```css
[data-theme="dark"] {
  --canvas-bg: #1A1A1A;
  --canvas-grid: rgba(255,255,255,0.04);
  --surface: #262626;
  --surface-elevated: #2D2D2D;
  --surface-hover: #333333;
  --text-primary: #F5F5F5;
  --text-secondary: #A1A1AA;
  --text-muted: #71717A;
  --border: #3F3F46;
  --border-subtle: #333333;
}
```

### Layout
- **Top bar:** Logo left, board name center (editable), theme toggle + user menu right
- **Left sidebar:** Collapsible board list with folder structure. Width: 260px collapsed to icon-only 48px
- **Left tool rail:** Miro-style vertical toolbar. Cursor, Text, Sticky Note, Shapes, Draw, Image, More
- **Canvas:** Full remaining viewport, subtle dot grid background
- **Bottom bar:** Zoom controls (fit, zoom %, zoom in/out) bottom-right
- **Floating toolbar:** Appears above selected elements (like tldraw default but styled to match)

### Toolbar Style
- Floating, white with subtle shadow, rounded-2xl (16px)
- backdrop-filter: blur(20px) for glass effect  
- Icons: 24px stroke-based (Lucide icons), 1.75px stroke width
- Hover: pill-shaped highlight with slight scale
- Active: blue accent color

### Typography
- UI: Inter (or system font stack)
- Board titles: Inter 600
- Sticky notes: Inter 500

### Animations
- Sidebar toggle: 200ms ease
- Toolbar appear: 150ms scale(0.95) → scale(1) with opacity
- Panel open: 200ms slide + fade
- Theme switch: 300ms cross-fade

## File Structure
```
plan-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, theme provider
│   │   ├── page.tsx            # Redirect to first board or onboarding
│   │   ├── board/[id]/
│   │   │   └── page.tsx        # Board view with canvas
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── remove-bg/route.ts
│   │       │   ├── generate/route.ts
│   │       │   └── image-search/route.ts
│   │       └── boards/
│   │           ├── route.ts           # GET list, POST create
│   │           └── [id]/route.ts      # GET, PUT, DELETE
│   ├── components/
│   │   ├── Canvas.tsx          # tldraw wrapper with custom tools
│   │   ├── Sidebar.tsx         # Board list sidebar
│   │   ├── TopBar.tsx          # Top navigation bar
│   │   ├── ToolRail.tsx        # Left vertical tool rail
│   │   ├── ZoomControls.tsx    # Bottom-right zoom widget
│   │   ├── AiToolbar.tsx       # Custom toolbar for image AI tools
│   │   ├── GeneratePanel.tsx   # Image generation panel
│   │   ├── SearchPanel.tsx     # Image search panel
│   │   └── ThemeToggle.tsx     # Light/dark mode switch
│   ├── lib/
│   │   ├── boards.ts           # Board CRUD logic
│   │   ├── ai.ts               # AI API client functions
│   │   └── theme.ts            # Theme management
│   └── styles/
│       └── globals.css         # Tailwind + custom properties
├── public/
│   └── favicon.ico
├── data/                       # Board JSON files (gitignored)
├── reference/                  # UI reference images
├── BRIEF.md                    # This file
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Deployment
- **VPS:** `46.224.96.47` (root access via SSH)
- **Port:** 3050 (replacing AFFiNE Docker)
- **Process manager:** PM2 as `plan-app`
- **Domain:** `plan.aditor.ai` (nginx reverse proxy already configured)
- **CI/CD:** GitHub Actions → build → scp → pm2 restart

## Important Notes
- tldraw handles all canvas rendering, selection, tools natively — don't reinvent
- Custom tools (AI) are added via tldraw's tool/component override system
- Board data is a tldraw `TLStoreSnapshot` serialized as JSON
- Start with localStorage for board storage, migrate to file-based API later
- The app must work WITHOUT authentication (open access, like current AFFiNE setup)
- Focus on making the canvas silky smooth — 60fps pan/zoom is non-negotiable
- The first render must look clean and premium — this determines project confidence
