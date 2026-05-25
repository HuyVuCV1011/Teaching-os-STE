# Teaching-os-STE

Teaching-os-STE is a modern, high-impact educational platform and knowledge system, originally evolved from a professional Data Advisor portfolio and admin CMS. It combines a public marketing/showcase presence with structured learning spaces, syllabus tracking, rubric-based grading, and administrative management workflows.

---

## 🌟 Vision & Key Capabilities

- **Public Marketing & Portfolio**: An elegant showcase of data advisory projects, process flowcharts (built with React Flow), and before/after report comparison sliders.
- **Student Learning Zone**: Gated by class-code JWT authorization, giving students access to course schedules, roadmaps, interactive syllabi, embedded PDF lectures, and assignments.
- **Admin CMS & Grading Panel**: Empowering teachers/admins to publish educational materials, manage class cohorts, track homework submissions, score using rubrics, and publish grades.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Database & Storage**: Supabase (`@supabase/supabase-js`)
- **UI Components & Visualizations**:
  - `reactflow` & `dagre` (Interactive process pipelines)
  - `@img-comparison-slider/react` (Visual before/after comparisons)
  - `react-pdf` (High-performance PDF report rendering)
  - `@tiptap/react` (WYSIWYG Rich Text content editor)
- **Styling & Motion**: Tailwind CSS v3 & Framer Motion (`motion/react`)

---

## 📁 Repository Structure

```
├── docs/                      # Documentation and specifications
├── public/                    # Static assets
└── src/
    ├── app/                   # Next.js App Router (Layouts, pages, routes)
    ├── components/            # Reusable UI components
    ├── data/                  # Mock data and local data schemas
    ├── lib/                   # Supabase clients and helper utilities
    └── types/                 # Shared TypeScript interfaces
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.x or later)
- npm, yarn, pnpm, or bun
- A Supabase project with storage buckets configured (`thumbnails` and `files`)

### 1. Environment Setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Open `.env.local` and specify your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

### 4. Build for Production

To create an optimized production build:

```bash
npm run build
npm run start
```

---

## 🔒 Security & Contribution Notes

- **Secrets Management**: Never commit `.env` or `.env.local` files to public git. Standard templates are provided in `.env.example`.
- **Private Documentation**: Deep architectural specifications, schema layouts, RLS configuration scripts, and webhook payload contracts are excluded from the public git repository via `.gitignore` to prevent unnecessary security exposure. Refer to internal/offline specification documents for context.
