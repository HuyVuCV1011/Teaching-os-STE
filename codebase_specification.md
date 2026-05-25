# Project Specification: Data Portfolio & Admin Dashboard

This document provides a concise overview of the architecture, data models, key components, and usage instructions of this portfolio application for use by downstream AI coding assistants.

---

## 1. Overview & Architecture

This is a Next.js (App Router) web portfolio built for a Data Advisor. It consists of:
1. **Public Portfolio Website**: Built with interactive cards, custom process charts (React Flow), and a PDF comparison slider (before/after dashboard views).
2. **Admin CMS Panel**: Located at `/projects` to perform CRUD operations on projects, uploading files and images directly to Supabase Storage and saving diagram state (nodes/edges) to Supabase Database.

---

## 2. Tech Stack

- **Framework**: Next.js 15.1.7 (React 19, TypeScript)
- **Database & Storage**: Supabase (`@supabase/supabase-js`)
- **Interactive UI**:
  - `reactflow` & `dagre` (Process Pipelines)
  - `@img-comparison-slider/react` (Visual before/after comparisons)
  - `react-pdf` (PDF report rendering)
  - `@tiptap/react` (Rich Text description editing)
- **Styles & Motion**: Tailwind CSS v3 & Framer Motion (`motion/react`)

---

## 3. Data Schema & Supabase

### Projects Table (`projects`)
- `id` (uuid / text, PK): Unique identifier
- `title` (text, Required): Title of the project
- `description` (text, HTML content from Tiptap): Detailed summary
- `product_option` (text): `'student'` or `'customer'`
- `thumbnails` (text[]): Supabase storage public URLs for preview images (supports up to 2 for comparison)
- `files` (text[]): Supabase storage public URLs for PDF documents
- `icons` (text[]): Selected tools (e.g. `['power-bi', 'excel', 'python']`)
- `iframe_link` (text, Nullable): URL for interactive dashboard embeds
- `youtube_link` (text, Nullable): YouTube embed URL (`https://www.youtube.com/embed/...`)
- `flow_diagram` (jsonb, Nullable): `{ nodes: FlowNode[], edges: FlowEdge[] }`

### Supabase Storage Buckets
- `thumbnails`: Stores project cover images.
- `files`: Stores uploaded PDF reports.

---

## 4. Key Components & Entry Points

- **Landing Page (`src/app/page.tsx`)**:
  - Integrates `Hero.tsx` (animations), `Experience.tsx` (using `MovingBorders.tsx`), and the project grid sections: `StudentsProject.tsx` and `ConsultingProject.tsx`.
- **Project Detail (`src/app/projects/[projectId]/page.tsx`)**:
  - Fetches the project record by ID.
  - Renders dashboard/video iframes, builds the interactive flowchart, and mounts the comparison slider for the PDF report.
- **Admin Panel (`src/app/projects/page.tsx` + `create/page.tsx` + `edit/[projectId]/page.tsx`)**:
  - Table-based project manager with delete functionality.
  - Interactive project creator/editor featuring form validation, file uploads, flowchart node/edge configuration, and rich text editor integration.

---

## 5. Setup & Usage Instructions

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Operations
1. **Run Development Server**:
   ```bash
   npm run dev
   ```
2. **Build Production Bundle**:
   ```bash
   npm run build
   ```
3. **Admin Actions**: Go to `/projects` to manage portfolio projects.
