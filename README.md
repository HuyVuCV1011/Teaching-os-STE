# 🎓 Teaching OS (STE)

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

Teaching-os-STE is a modern, high-impact educational platform and learning operating system. Evolved from a professional data advisory portfolio, it combines a public showcase presence with private classroom roadmaps, syllabus tracking, interactive document views, and grading workflows.

[Explore Codebase Specs](file:///Users/mac/Data/STE/vuth-portfolio-main/codebase_specification.md) • [View Docs Index](file:///Users/mac/Data/STE/vuth-portfolio-main/docs/README.md)

</div>

---

## 🌟 Key Application Surfaces

- **🌐 Public Showcase Layer**: An elegant portfolio displaying consulting projects, student case studies, process mapping diagrams, and visual before/after dashboard comparisons.
- **🔑 Student Learning Gateway**: A secure area gated by class-code authorization allowing students to access course roadmaps, view materials, and submit assignments.
- **🛠️ Admin CMS & Grading Terminal**: A centralized management workspace where administrators configure classes, assign syllabi, edit lesson content, and evaluate homework.

---

## 🔁 Core User Workflows

### 1. The Student Workspace Journey
```mermaid
graph LR
    Gateway[Student Gateway] -->|Verify Class Code & Email| Dashboard[Learning Roadmap]
    Dashboard -->|Select Course| Syllabus[Interactive Syllabus]
    Syllabus -->|Select Lesson| Viewer[PDF Lecture & Submissions]
```
1. **Verification**: The learner lands on `/learn` and enters their whitelisted email and active class access code (e.g. `DATA-2026`).
2. **Access**: Upon validation, a cookie-based session is created, routing them to `/learn/[classCode]/dashboard`.
3. **Consumption**: The student interacts with the custom `React Flow` roadmap and reads PDF course material in the secure viewer, tracking their progress.

### 2. The Administrator CMS & Grading Loop
```mermaid
graph LR
    CMS[CMS Library] -->|Create Course & Subject| Cohort[Assign to Class Cohort]
    Cohort -->|Student Submits Assignment| Grading[Evaluation Terminal]
    Grading -->|Input Scores & Rubrics| Publish[Publish Grades]
```
1. **Curriculum Design**: Admins create subjects, syllabus courses, modules, and lessons inside `/admin/library`.
2. **Class Operations**: Admins setup cohorts on `/admin/classes`, enabling whitelisting and generating custom access codes.
3. **Assessment**: Submissions land on `/admin/grading` where admins score homework using criteria-based rubrics.

---

## 🛠️ Integrated Technologies

| Tool | Purpose | Logo / Badge |
| :--- | :--- | :--- |
| **Next.js 15** | Application Framework & Router | ![Next.js](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js&logoColor=white) |
| **Supabase** | DB, Storage & Row-Level Security | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white) |
| **FastAPI / Ollama** | RubriCore AI Grading Engine | ![Python](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white) |
| **Tailwind CSS** | Styling System | ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwindcss&logoColor=white) |
| **Framer Motion** | Fluid UX Animations | ![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat&logo=framer&logoColor=white) |
| **React Flow** | Interactive Pipe Visuals | ![React Flow](https://img.shields.io/badge/React_Flow-FF007F?style=flat&logo=react&logoColor=white) |
| **Tiptap** | Rich Text Lesson Editing | ![Tiptap](https://img.shields.io/badge/Tiptap-black?style=flat&logo=tiptap&logoColor=white) |

---

## 🚀 Quick Start

### 1. Configure Secrets
Copy `.env.example` to `.env.local` inside the root directory, and copy `rubricore-engine/.env.example` to `rubricore-engine/.env`:
```bash
cp .env.example .env.local
cp rubricore-engine/.env.example rubricore-engine/.env
```

### 2. Install and Start Development
Run both services concurrently to enable AI grading:

**Terminal 1 (Next.js Application)**:
```bash
npm install
npm run dev
```

**Terminal 2 (RubriCore FastAPI Server)**:
```bash
cd rubricore-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install uvicorn
uvicorn app.pilot.fastapi_app:app --host 127.0.0.1 --port 8080
```

Open [http://localhost:3000](http://localhost:3000) to view the system.

### 3. Build & Test Production
```bash
npm run build
npm run start
```
