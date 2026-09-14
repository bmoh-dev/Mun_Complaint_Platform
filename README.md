# منصة الشكاوى البلدية — Municipality Complaint Platform

A full-stack, Arabic-first (RTL) web platform that connects citizens with their local
municipalities. Citizens file geo-located complaints with photo/PDF evidence; municipality
administrators and department teams triage, route, and resolve them; a public transparency
feed keeps every verified municipality accountable.

> **Note on accuracy:** this document describes the codebase as it exists on disk. Sections
> marked **Planned / Absent** describe capabilities that are referenced in marketing copy or
> partially scaffolded but not implemented.

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Roles](#2-user-roles)
3. [Feature Walkthrough](#3-feature-walkthrough)
4. [Architecture](#4-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Project Structure](#6-project-structure)
7. [Database & Data Model](#7-database--data-model)
8. [Security Model](#8-security-model)
9. [Realtime & Notifications](#9-realtime--notifications)
10. [Validation, Anti-Spam & Rate Limiting](#10-validation-anti-spam--rate-limiting)
11. [Environment Variables](#11-environment-variables)
12. [Getting Started](#12-getting-started)
13. [Available Scripts](#13-available-scripts)
14. [Deployment](#14-deployment)
15. [Known Limitations & Roadmap](#15-known-limitations--roadmap)
16. [Screenshots](#16-screenshots)

---

## 1. Overview

The platform digitizes the municipal complaint lifecycle:

```
Citizen submits complaint
        │
        ▼
Server validates (Zod + anti-spam + rate limits)
        │
        ▼
Auto-routed to a department whose name matches the complaint category
(or left unassigned → visible to the Municipality General Admin)
        │
        ▼
Department Admin / Municipality Admin updates status,
optionally transfers to another department in the same municipality
        │
        ▼
Citizen is notified in-app on every status change and transfer
        │
        ▼
Complaint appears on the public transparency feed of its municipality
```

Key properties:

- **Arabic-first**: the entire UI is Arabic with full RTL layout (`<html lang="ar" dir="rtl">`),
  including server-side error and rate-limit messages (formatted in the `Africa/Algiers` timezone).
- **Multi-tenant**: every complaint, department, and membership is strictly scoped to one
  municipality, enforced server-side on every privileged query.
- **Transparency by default**: each verified municipality has a public, read-only feed of its
  complaints (list + map), searchable by anyone without an account.

## 2. User Roles

The platform deliberately separates **three non-overlapping role dimensions**:

| Role | Stored in | Scope | Capabilities |
|---|---|---|---|
| **Citizen** | `municipality_members.role = 'citizen'` | One municipality per membership row | Join verified municipalities, submit/track own complaints, submit feedback |
| **Department Admin** | `department_admins` (one user per department) | Exactly one department | View assigned complaints, update their **status**, transfer them within the same municipality. **Cannot** write `internal_notes` |
| **Municipality Admin / Super Admin** | `municipality_members.role = 'admin' \| 'super_admin'` | Their municipality only | Full complaint management, bulk status updates, bulk transfers, `internal_notes`, department CRUD, member management (super admin) |
| **Platform (Global) Admin** | `user_roles.role = 'global_admin'` | Platform-wide, **no** access to municipality complaint data | Approve/reject municipality registrations, manage global admins, triage the feedback center |

> The separation is enforced in code, not just by convention: `getAdminMunicipalityIds()`
> explicitly excludes the platform role, and `setDepartmentAdmin` refuses to make a global
> admin a department admin. A global admin **cannot** read any municipality's complaints.

## 3. Feature Walkthrough

### 3.1 Public Landing Page (`/`)
Marketing entry point. The header switches between public and authenticated variants based on
the client-side session.

### 3.2 Authentication (`/login`)
Google OAuth only (via Lovable's auth broker). On first login a Postgres trigger
(`handle_new_user`) auto-provisions a `profiles` row and a default `citizen` role.
Post-login routing (`resolveLandingPath`):

| User state | Lands on |
|---|---|
| Pending owned municipality request | `/onboarding` |
| Global admin | `/platform-admin` |
| Municipality super admin | `/admin` |
| Department admin | `/department` |
| No memberships | `/onboarding` |
| Otherwise | `/feed` |

### 3.3 Onboarding (`/onboarding`)
Users with zero municipality memberships either **join** an existing verified municipality
(as a citizen) or **request a new municipality** (rate-limited, enters a `pending` queue
reviewed by a global admin).

### 3.4 Complaint Submission (`/submit`)
- Validated with Zod: title 3–200 chars, one of the platform-wide categories, address 3–500,
  description 5–5000, optional map coordinates, up to 6 attachments
  (≤5 images + ≤1 PDF, MIME/size allow-listed **server-side**).
- Anti-spam heuristics reject repeated-character text, keyboard-mash patterns
  (QWERTY/AZERTY/Arabic layouts), and low-content descriptions.
- Rate-limited per user (5/hour, 20/day) plus a 100 MB/hour upload bandwidth budget.
- **Server-side routing**: the client sends only municipality + category; the server assigns
  the complaint to the active department whose name matches the category, or leaves it
  unassigned (never blocks submission).
- Each complaint receives a human-readable `CMP-000123`-style number via a DB trigger.

### 3.5 My Complaints (`/my-complaints`)
Citizens track only their own complaints (ownership enforced in the server functions, not
just RLS), with detail dialogs and signed-URL attachment previews.

### 3.6 Public Transparency Feed (`/feed`)
Anonymous-safe feed scoped to **one verified municipality at a time**
(wilaya → municipality drill-down), with list/map views and rate-limited search.
Exposes only intentionally public fields — never `internal_notes` or citizen identity.
Attachments are served via short-lived (1 hour) signed URLs.

### 3.7 Municipality Admin Dashboard (`/admin`)
- Complaint table with search, filters, date range, and pagination.
- Opens filtered to **General** (unassigned) complaints by default.
- Status updates, internal notes, **bulk status update** and **bulk transfer** actions.
- Cross-municipality isolation: every query is additionally filtered by the admin's own
  municipality IDs server-side.

### 3.8 Department Management (`/admin/departments`)
Municipality admins create, rename, activate/deactivate, and delete their own departments.
Deletion is an atomic SECURITY DEFINER RPC (`delete_department_atomic`): affected complaints
are unassigned (category preserved), the department-admin binding is removed, then the
department is deleted — all in one transaction. Creating a department whose name matches a
category automatically back-fills **unassigned, unsolved** historical complaints of that
category in the same municipality.

### 3.9 User Management (`/admin/users`)
Municipality super admins search members with debounced autocomplete (min 2 chars, max 10
results), promote/demote municipality roles, and assign department admins. A "last super
admin" guard prevents locking a municipality out of its own administration.

### 3.10 Department Dashboard (`/department`)
Department admins see only complaints assigned to their department. They can update status
and transfer to another department in the same municipality — or back to the **Municipality
General Admin** (always offered, even when no other department exists). Every transfer is
recorded in `complaint_routing_history` with actor, from/to department, reason, and timestamp.

### 3.11 Platform Administration
- `/platform-admin` — global admin dashboard; also hosts the one-time **bootstrap** that
  claims the first global-admin seat (`bootstrap_global_admin` RPC, exactly one
  initialization path — no hardcoded email bootstrap exists).
- `/platform-municipalities` — approve/reject pending municipality registrations. Approval
  atomically verifies the municipality and seats its requester as super admin.
- `/platform-feedback` — triage for the built-in feedback center (see below).

### 3.12 Feedback Center
Authenticated users report bugs/suggestions from a floating button on every authenticated
page. Submissions capture route, timestamp, and user automatically, accept one optional
screenshot, and pass the same anti-spam validation as complaints. Global admins review,
annotate (private `admin_notes`), update status (`open → fixed`), or delete items at
`/platform-feedback`.

## 4. Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React 19)                     │
│  TanStack Router (file routes) · TanStack Query · shadcn/ui   │
│  Supabase JS client (publishable key, RLS as the user)        │
└───────────────┬──────────────────────────────┬───────────────┘
                │ typed RPC                     │ realtime
                ▼                               ▼
┌──────────────────────────────┐   ┌────────────────────────────┐
│  TanStack Start server fns    │   │  Supabase Realtime          │
│  (createServerFn, edge        │   │  (notifications channel)    │
│   runtime / Cloudflare Worker)│   └────────────────────────────┘
│  • requireSupabaseAuth        │
│    middleware (JWT verified   │
│    via getClaims)             │
│  • explicit authz helpers     │
│  • service-role client used   │
│    deliberately, with code-   │
│    level authorization        │
└───────────────┬──────────────┘
                ▼
┌──────────────────────────────────────────────────────────────┐
│                    Supabase (Postgres)                        │
│  Tables + RLS + SECURITY DEFINER RPCs + triggers + Storage   │
│  39 SQL migrations = source of truth for schema & policies   │
└──────────────────────────────────────────────────────────────┘
```

Design decisions worth knowing:

- **Server functions, not edge functions**: all app-internal logic uses TanStack Start
  `createServerFn`; there are no Supabase Edge Functions.
- **Defense in depth**: route-level `beforeLoad` guards are a UX convenience; every server
  function independently re-verifies authentication, role, municipality membership, and
  resource ownership via centralized helpers in `src/lib/authz.server.ts` — never trusting
  client-supplied role claims.
- **Explicit authorization over pure RLS**: privileged handlers use the service-role client
  and enforce multi-tenant scoping in TypeScript (centralized, auditable), with RLS as a
  second layer. The public feed uses the publishable client behind narrow `TO anon` policies.

## 5. Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | React 19, TypeScript 5.8, TanStack Start v1 (SSR + server functions), Vite 7 |
| **Routing** | TanStack Router (file-based) |
| **Data fetching** | TanStack Query 5 |
| **Forms & validation** | React Hook Form, Zod, `@hookform/resolvers` |
| **Styling** | Tailwind CSS v4 (CSS-first config), `tw-animate-css`, OKLCH design tokens |
| **UI components** | shadcn/ui (New York style) on Radix UI primitives |
| **Icons** | Lucide React |
| **Maps** | Leaflet + React Leaflet (map picker, feed map view) |
| **Backend / BaaS** | Supabase via Lovable Cloud — Postgres, Auth (Google OAuth), Storage, Realtime, RLS |
| **Server runtime** | Nitro / Cloudflare Worker edge runtime |
| **Tooling** | ESLint 9, Prettier, `vite-tsconfig-paths` |

## 6. Project Structure

```text
src/
├── routes/                    # File-based routes
│   ├── __root.tsx             # App shell, RTL <html>, error/not-found boundaries
│   ├── index.tsx              # Public landing page
│   ├── login.tsx              # Google OAuth + role-based landing resolver
│   ├── feed.tsx               # Public transparency feed
│   ├── _authenticated.tsx     # Session gate layout (header + feedback button)
│   └── _authenticated/
│       ├── submit.tsx             # Complaint form
│       ├── my-complaints.tsx      # Citizen's complaints
│       ├── onboarding.tsx         # Join / request municipality
│       ├── admin.tsx              # Municipality admin dashboard
│       ├── admin.departments.tsx  # Department CRUD
│       ├── admin.users.tsx        # Member management
│       ├── department.tsx         # Department admin queue
│       ├── platform-admin.tsx     # Global admin + bootstrap
│       ├── platform-municipalities.tsx
│       └── platform-feedback.tsx  # Feedback triage
├── lib/
│   ├── *.functions.ts         # Server functions (complaints, departments, users,
│   │                          #   municipalities, platform, feedback, notifications)
│   ├── authz.server.ts        # Centralized authorization helpers
│   ├── rate-limit.server.ts   # DB-backed atomic rate limiting
│   ├── spam-detection.ts      # Anti-spam heuristics
│   └── upload-validation.ts   # Server-side attachment allow-listing
├── integrations/supabase/     # Generated clients, auth middleware/attacher
├── components/                # shadcn/ui library + app components
└── styles.css                 # Tailwind v4 theme tokens (OKLCH), RTL

supabase/migrations/           # 39 SQL migrations — schema, RLS, enums, RPCs
```

## 7. Database & Data Model

Core tables (simplified):

```text
auth.users ──1:1── profiles
     │
     ├── user_roles            (platform roles: global_admin)
     │
     └── municipality_members ──N:1── municipalities (pending → verified | rejected)
              │                         │
              │                         ├── departments ──0:1── department_admins
              │                         │
              │                         └── complaints ──*── complaint_attachments
              │                                   │
              │                                   ├── complaint_routing_history
              │                                   └── notifications (per user)

feedback                       (platform-wide bug reports / suggestions)
role_audit_log                 (role-change audit trail)
rate_limit_counters            (server-only rate limiting)
```

Conventions:

- Complaints carry both a UUID primary key and a sequential `CMP-000123` number
  (assigned by trigger).
- Municipality-scoped reads/writes re-check `municipalities.status = 'verified'` server-side.
- Storage buckets are private; all attachment/screenshot access goes through 1-hour signed URLs.
- Every public-schema table is created with explicit `GRANT`s, RLS enabled, and policies in
  the same migration.

## 8. Security Model

| Mechanism | Where |
|---|---|
| JWT verified server-side via `getClaims` (never just decoded) | `auth-middleware.ts` |
| Centralized re-verification of role, membership, and resource ownership | `authz.server.ts`, every `*.functions.ts` |
| Row-Level Security on all tables | `supabase/migrations/*` |
| PostgREST `.or()` filter-injection sanitization | `sanitizeSearchTerm()` |
| Atomic DB-backed rate limiting per action/subject | `rate-limit.server.ts` |
| Server-side MIME/size/count allow-listing for uploads | `upload-validation.ts` |
| Anti-spam text heuristics (complaints & feedback) | `spam-detection.ts` |
| Short-lived signed URLs for all media — no public bucket listing | `signAttachments` |
| Strict separation of platform vs. municipality vs. department roles | `authz.server.ts` |
| "Last admin" lockout protections | `changeUserRole`, `muniDemoteToCitizen`, `muniTransferSuperAdminByEmail` |
| Atomic privileged mutations as SECURITY DEFINER RPCs | `bulk_transfer_complaints`, `delete_department_atomic`, `bootstrap_global_admin`, `promote_global_admin`, `transfer_global_admin`, `abandon_global_admin` |
| Audit trails | `role_audit_log`, `complaint_routing_history` |

## 9. Realtime & Notifications

- Status changes fire a DB trigger (`handle_complaint_status_change`) that notifies the
  complaint owner; department transfers add application-level notifications to the citizen
  and the receiving department's admins.
- Delivery is **Supabase Realtime** (`postgres_changes` on the `notifications` table,
  filtered to the current user) plus a 15-second polling fallback in the notification menu.
- Per-notification actions: open the related complaint, mark as read, delete; global actions:
  mark all as read, delete all.
- **Planned / Absent:** no email/SMS/push channel — notifications are in-app only.

## 10. Validation, Anti-Spam & Rate Limiting

- **Zod schemas** on every server function input.
- **Anti-spam** (`spam-detection.ts`): rejects repetition-dominant text (e.g. `دسسسسسسس`,
  `aaaaaaaaa`), keyboard-mash sequences (`qwerty`, `asdfghjkl`, `azerty`, Arabic-layout
  smashes, both directions), and descriptions with fewer than 3 distinct real words —
  returned as ordinary validation errors (form stays open, Arabic message shown), never as
  unhandled exceptions.
- **Rate limits** (DB-backed, atomic): complaint submission 5/h + 20/day, municipality
  creation 3/24h, municipality join 20/24h, search 60/min (admin) / 20/min (public),
  feedback 10/h, uploads 100 MB/h bandwidth budget. The limiter fails open on infrastructure
  errors (deliberate availability tradeoff, logged).

## 11. Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Publishable (anon) key |
| `SUPABASE_URL` | server | Same URL for server functions |
| `SUPABASE_PUBLISHABLE_KEY` | server | Public read-only server queries |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Privileged operations via `client.server.ts` |

On Lovable Cloud all of these are injected automatically — no manual setup.

## 12. Getting Started

```bash
# install dependencies
bun install        # or: npm install

# start the dev server
bun run dev        # http://localhost:8080
```

Database schema is managed through SQL migrations (`supabase/migrations/`); on Lovable Cloud
they are applied automatically. The first global admin is claimed in-app via the bootstrap
prompt shown in the authenticated header when no global admin exists yet — there is no
seeded or hardcoded administrator.

## 13. Available Scripts

| Script | Command |
|---|---|
| `dev` | `vite dev` |
| `build` | `vite build` |
| `build:dev` | `vite build --mode development` |
| `preview` | `vite preview` |
| `lint` | `eslint .` |
| `format` | `prettier --write .` |

## 14. Deployment

The app builds to an edge (Cloudflare Worker-compatible) bundle via Nitro and deploys
through Lovable's publishing flow. All npm dependencies are fully bundled at build time;
server functions run in a stateless Worker runtime (no `child_process`, native binaries, or
arbitrary filesystem access).

## 15. Known Limitations & Roadmap

- **Google OAuth is a hard dependency** — no password or email-link fallback.
- **In-app notifications only** — no email/SMS/push delivery, despite landing-page copy.
- **Realtime is single-purpose** — only the notification bell subscribes live; admin and
  department dashboards refresh via React Query invalidation.
- **No municipality de-verification/suspension workflow** once approved.
- **Complaint status is not a strict state machine** — any authorized actor can set any of
  `pending | in_progress | resolved` in any order (intentional flexibility).
- **No automated test suite** for authorization boundaries, rate limits, or the complaint
  lifecycle — a clear next contribution area.

## 16. Screenshots

The repository does not currently bundle screenshots. Recommended captures, in order:

| # | Page | Suggested file |
|---|---|---|
| 1 | Public landing page (`/`) | `docs/screenshots/landing.png` |
| 2 | Public transparency feed, map view (`/feed`) | `docs/screenshots/feed-map.png` |
| 3 | Complaint submission form (`/submit`) | `docs/screenshots/submit.png` |
| 4 | Municipality admin dashboard (`/admin`) | `docs/screenshots/admin-dashboard.png` |
| 5 | Department admin queue (`/department`) | `docs/screenshots/department.png` |
| 6 | Platform administration (`/platform-admin`) | `docs/screenshots/platform-admin.png` |

Then embed them here, e.g.:

```markdown
![Public transparency feed](docs/screenshots/feed-map.png)
```

---

*Built with React 19, TanStack Start, Tailwind CSS v4, shadcn/ui, and Supabase (Lovable Cloud).*
