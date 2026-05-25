# Spec 01: Platform Overview

## 1. System Mission
The primary objective of the evolved platform is to provide a multi-subject educational environment for teaching workflows while preserving a high-impact portfolio presence for a Data Advisor. It must act as a:
*   **Showcase Website**: Presenting projects, pipeline visualizers, and credentials.
*   **Structured Resource Hub**: Serving documents, guides, slides, code repositories, and homework materials to students.
*   **Evaluation Environment**: Tracking student submissions and grading metrics via rubric criteria.

## 2. Major Application Zones
The system is divided into three logical navigation and structural zones:

### 2.1. Public / Marketing Zone
*   **Location**: Root directory `/` and `/projects/*`
*   **Access**: Unrestricted anonymous public traffic.
*   **Role**: Showcase credentials, consulting offerings, public course syllabus outlines, and interactive process flowcharts (using `reactflow`).

### 2.2. Student Learning Zone
*   **Location**: Routed under `/learn/*`
*   **Access**: Restricted. Gatekept by lightweight class-code JWT authorization cookies.
*   **Role**: Display visual roadmaps of scheduled lessons, render embedded assignment files (using `react-pdf`), handle submissions, and render published grades.

### 2.3. Admin CMS & Operations Zone
*   **Location**: Routed under `/admin/*`
*   **Access**: Restricted. Requires authenticated admin user credentials.
*   **Role**: Catalog content library (courses, lessons, materials), manage class cohorts, monitor student uploads, score rubrics, and publish final evaluations.

---

## 3. Preserving the Portfolio Origin
The existing Next.js App Router codebase contains landing pages, project views, and project CMS interfaces. To preserve these elements:
*   The current database table `projects` and storage buckets `thumbnails` and `files` remain unchanged.
*   The routing file `src/app/page.tsx` serves as the landing page.
*   The admin projects CMS is moved from `/projects` to `/admin/projects` to prevent overlap with student directories.
*   Components like the React Flow editor and TipTap editor are shared between showcase projects and lesson content creation templates.
