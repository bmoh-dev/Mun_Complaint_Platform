# Municipality Complaint Platform — Architecture Audit

This document is a scholarship-quality audit of the codebase as it exists on disk. Every claim is
tied to a file reference. Sections marked **Planned / Absent** describe capabilities that are
referenced in copy or partially scaffolded but not implemented — they are called out explicitly so
they are not mistaken for shipped behavior.

## 1. Stack & Runtime

- **Framework**: TanStack Start (React, file-based routing via TanStack Router) — `src/router.tsx`,
  `src/routeTree.gen.ts`, `src/routes/**`.
- **Backend**: TanStack Start server functions (`createServerFn`) colocated in `src/lib/*.functions.ts`,
  running against **Supabase** (Postgres + Auth + Storage + Realtime).
- **Database migrations**: raw SQL under `supabase/migrations/` (39 files), the source of truth for
  schema, RLS policies, enums, and SECURITY DEFINER RPCs.
- **UI**: Tailwind + shadcn/radix component library (`src/components/ui/*`).
- **Locale**: the entire UI is Arabic, RTL (`<html lang="ar" dir="rtl">` in `src/routes/__root.tsx`),
  including all user-facing error/success strings and rate-limit messaging (formatted in the
  `Africa/Algiers` timezone — see `src/lib/rate-limit.server.ts`).

## 2. Route Inventory

| Route | File | Access |
|---|---|---|
| `/` | `src/routes/index.tsx` | Public landing page; header switches between `PublicHeader`/`AuthenticatedHeader` based on client-side session check. |
| `/login` | `src/routes/login.tsx` | Public. Google OAuth only, via `lovable.auth.signInWithOAuth("google", …)`. Post-login redirect resolved by role (see §4). |
| `/feed` | `src/routes/feed.tsx` | Public. Anonymous-safe transparency feed of complaints, scoped to one **verified** municipality at a time (wilaya → municipality drill-down), list/map view, search with rate limiting. |
| `/_authenticated/*` | `src/routes/_authenticated.tsx` | Layout route; `beforeLoad` requires a live Supabase session, else redirects to `/login?redirect=…`. Wraps all authenticated pages with `AuthenticatedHeader` + `FeedbackButton`. |
| `/submit` | `_authenticated/submit.tsx` | Any authenticated, onboarded citizen. Complaint submission form. |
| `/my-complaints` | `_authenticated/my-complaints.tsx` | Citizen's own complaint list/detail. |
| `/onboarding` | `_authenticated/onboarding.tsx` | Authenticated users with **zero** municipality memberships. Join an existing verified municipality or request a new one (pending platform approval). |
| `/admin` | `_authenticated/admin.tsx` | Municipality Admin / Super Admin dashboard (guarded by `requireAdminRoute`). |
| `/admin/departments` | `_authenticated/admin.departments.tsx` | Same guard; department CRUD, admin assignment (super-admin-only writes enforced server-side). |
| `/admin/users` | `_authenticated/admin.users.tsx` | Same guard; municipality member search & promotion/demotion. |
| `/department` | `_authenticated/department.tsx` | Department Admin (or municipality admin) dashboard — guarded inline by `beforeLoad` checking `role.isDepartmentAdmin || role.isAdmin`. |
| `/platform-admin` | `_authenticated/platform-admin.tsx` | Global (platform) Admin only; also reachable pre-bootstrap to claim the first global-admin seat. |
| `/platform-feedback` | `_authenticated/platform-feedback.tsx` | Global Admin only; feedback/bug-report triage. |
| `/platform-municipalities` | `_authenticated/platform-municipalities.tsx` | Global Admin only; municipality registration approval/rejection queue. |

Not-found and error boundaries are centrally defined in `src/routes/__root.tsx`
(`notFoundComponent`, `errorComponent`) — no route-specific 404/500 handling.

## 3. Roles & Authorization Model

The platform has **two independent role dimensions** that the code explicitly refuses to conflate
(see comments in `src/lib/authz.server.ts` and `src/lib/departments.functions.ts`):

1. **Platform role** — `global_admin`, stored in `user_roles`. Grants access to `/platform-admin`,
   `/platform-municipalities`, `/platform-feedback` only. **Global admin does NOT grant access to
   any municipality's complaint data** — enforced by `getAdminMunicipalityIds()` explicitly excluding
   platform role, and by `setDepartmentAdmin` refusing to let a global admin also become a
   department admin.
2. **Municipality role** — per-municipality, stored in `municipality_members.role`:
   `citizen | admin | super_admin`. Determined per membership row, scoped to one municipality at a
   time, and only effective while `municipalities.status = 'verified'`.
3. **Department role** — `department_admins` table binds one user to exactly one department
   (`getMyDepartmentInfo`); department admins can update complaint `status` for complaints assigned
   to their department but **cannot** write `internal_notes` (municipality-admin-only field —
   enforced in `departmentUpdateComplaint`).

Bootstrapping the very first global admin is handled by a dedicated RPC
(`bootstrap_global_admin`, called from `platform.functions.ts`) rather than a hardcoded seed —
`getPlatformBootstrapState` exposes whether any global admin exists yet, surfaced in
`AuthenticatedHeader` as a "claim platform admin" prompt when unclaimed.

### Authorization enforcement pattern
- All privileged server functions call one of the `authz.server.ts` helpers
  (`requireMunicipalityAdmin`, `requireMunicipalityAdminFor`, `getMyDepartmentInfo`,
  `getAdminMunicipalityIds`) or an inline `assertGlobalAdmin`/`assertSuperAdminOf` check — **never**
  trusting client-supplied role claims.
- Every admin-scoped list/update query additionally filters `.in("municipality_id", muniIds)` or
  `.eq("assigned_department_id", departmentId)` server-side (defense in depth beyond the guard
  check) — see `adminListComplaints`, `listDepartmentComplaints`.
- `sanitizeSearchTerm()` strips PostgREST filter-injection characters (`, ( ) * \ % " '`) before any
  user search string is interpolated into a `.or()` filter string — mitigates a documented
  PostgREST `.or()` injection vector (`src/lib/authz.server.ts`).
- Route-level guards (`beforeLoad`) are a **UX convenience only**; actual authorization is
  re-verified independently inside every server function. This is a sound defense-in-depth pattern
  — client-side route guards alone would be bypassable.
- Client-side page guards are inconsistent in one respect: `/my-complaints`, `/submit`, and
  `/onboarding` (see the routes list) do not define their own `beforeLoad`; they rely solely on the
  parent `_authenticated` layout's session check, with authorization narrowing (e.g. "must not
  already belong to a municipality" for onboarding) done client-side via a query result and a
  `navigate()` redirect rather than a route guard — this is authorization-by-UI, not a security
  boundary, but the underlying server functions (`joinMunicipality`, `createMunicipality`, etc.)
  independently re-validate state server-side, so no privilege escalation is actually possible.

## 4. Authentication

- **Provider**: Google OAuth exclusively, via `@lovable.dev/cloud-auth-js` (`lovable.auth.signInWithOAuth`)
  — no password/email-link login path exists (`src/routes/login.tsx`).
- **Session**: standard Supabase client session (`src/integrations/supabase/client.ts`), propagated
  to server functions as a `Bearer` JWT validated in `requireSupabaseAuth`
  (`src/integrations/supabase/auth-middleware.ts`), which:
  - Rejects missing/non-Bearer/malformed (non-3-segment JWT) tokens outright.
  - Calls `supabase.auth.getClaims(token)` server-side (not merely decoding the JWT) to verify
    validity, and requires a `sub` claim.
  - Constructs a **request-scoped Supabase client** authenticated as the caller (RLS-respecting),
    exposed to handlers as `context.supabase`, alongside a separate always-privileged
    `supabaseAdmin` (service-role) client (`client.server.ts`) used deliberately in most handlers to
    perform explicit, code-level authorization instead of relying purely on RLS.
- **Auto-provisioning**: `handle_new_user()` Postgres trigger on `auth.users` INSERT auto-creates a
  `profiles` row and a default `citizen` role (`user_roles`) on first login
  (migration `20260601141252`).
- **Post-login routing** (`resolveLandingPath()` in `login.tsx`): pending owned municipality
  request → onboarding; else global admin → `/platform-admin`; else municipality super admin →
  `/admin`; else department admin → `/department`; else `/feed`. New users with no memberships are
  routed to `/onboarding` (via the memberships-length check, not shown in this priority list but
  enforced in `onboarding.tsx`'s own redirect-away-if-already-a-member logic and
  `getMyOnboardingState().needsOnboarding`).
- **Sign-out**: clears in-progress complaint drafts from local storage, cancels/clears the React
  Query cache, then calls `supabase.auth.signOut()` (`AuthenticatedHeader.tsx`).

## 5. Municipalities

- **Lifecycle**: `pending → verified | rejected` (`municipality_status` enum,
  migration `20260608212847`).
- Any authenticated user may **create** a municipality request (`createMunicipality`,
  `municipalities.functions.ts`), rate-limited to 3/24h, blocked if the user already has a pending
  request, and blocked on case-insensitive name+wilaya duplicates.
- Only a **global admin** can approve (`platformAdminApprove`) or reject
  (`platformAdminReject`) a pending municipality. Approval atomically: marks it verified, creates a
  `super_admin` membership for the requester, and grants them the `super_admin` platform-visible
  role row.
- Citizens **join** verified municipalities (`joinMunicipality`, rate-limited 20/24h) as `citizen`
  role members; duplicate joins are silently absorbed.
- All municipality-scoped reads/writes re-check `status = 'verified'` server-side even after
  approval (e.g. `submitComplaint`, `listPublicComplaints`) — a municipality that is later
  hypothetically de-verified would stop accepting/serving complaints (there is, however, **no UI
  path to revoke verification** once granted — Planned/Absent).
- **Municipality Super Admin management** (`users.functions.ts`): promote/demote/transfer
  super-admin status by email, with an explicit floor of ≥1 super admin per municipality at all
  times (`countSuperAdmins` guard in `muniDemoteToCitizen`/`muniTransferSuperAdminByEmail`).

## 6. Departments

- Each department belongs to exactly one municipality (`departments.municipality_id`) and has a
  `slug` (matched against complaint `category` for auto-routing) and `is_active` flag.
- **Auto-assignment**: on submission, if the target municipality has an active department whose
  `slug` equals the chosen complaint `category`, the complaint is auto-assigned
  (`submitComplaint` in `complaints.functions.ts`); otherwise it is left unassigned and remains
  visible to the Municipality (General) Admin — submission is never blocked by absence of a
  matching department.
- **Department Admin assignment**: exactly one user per department (`department_admins`), settable
  only by a municipality **super_admin** of that department's own municipality
  (`setDepartmentAdmin`); a platform global admin is explicitly barred from also being made a
  department admin.
- **Department CRUD & deletion**: `listDepartmentsWithStats`, `deleteDepartment` — deletion is an
  atomic SECURITY DEFINER RPC (`delete_department_atomic`) that unassigns affected complaints
  (`assigned_department_id = NULL`, preserving the original `category`), removes the department-admin
  binding, then deletes the department row — restricted to the department's municipality's
  super_admin, enforced inside the DB function itself (not just the calling server function).
- **Routing / transfer**: `redirectComplaint` allows a department admin (of the complaint's current
  department) or a municipality admin to reassign a complaint to another department in the *same*
  municipality only, or back to unassigned/"General Admin". Every transfer is recorded in
  `complaint_routing_history` (actor, from/to department, optional reason, timestamp) and triggers
  notifications to the citizen and to all admins of the receiving department. `listRoutingHistory`
  exposes this audit trail to authorized viewers with department names and actor names resolved.
- Bulk transfer for municipality admins is available via `bulkTransferComplaints`, delegated to the
  `bulk_transfer_complaints` SECURITY DEFINER RPC for atomicity across many complaints at once.

## 7. Complaint Lifecycle

1. **Submission** (`submitComplaint`, citizen, `/submit`):
   - Validated with Zod: title (3–200 chars), fixed category enum (12 categories), address
     (3–500), description (5–5000), optional lat/lng, up to 6 attachments.
   - Rate-limited: 5/hour and 20/day per user (`RATE_LIMITS.complaintSubmitHour/Day`).
   - Attachment shape re-validated server-side (`validateAttachmentSet`) regardless of client
     checks: MIME allow-list (JPEG/PNG/WEBP/HEIC images ≤5 MB, PDF ≤10 MB), max 5 images + 1 PDF
     per complaint, 6 attachments total.
   - **Spam/quality filtering** (`detectSpam`, `src/lib/spam-detection.ts`) rejects: too-short text,
     excessive character repetition, keyboard-mash patterns (QWERTY/AZERTY/Arabic-layout smash
     sequences, in both directions), and (for descriptions) fewer than 3 distinct real words —
     returned as a normal validation error, not a thrown exception, to avoid tripping the client
     error boundary.
   - Requires the submitter to already be a member of a **verified** target municipality; rejects
     otherwise.
   - Attachment bytes successfully persisted count against a 100 MB/hour/user upload-bandwidth
     budget (`enforceUploadBandwidth`), tracked via the same generic rate-limit RPC with a byte
     "amount" instead of a request count.
2. **Status values**: `pending → in_progress → resolved` (free-form transitions, not a strict state
   machine — any authorized actor can set any of the three values in any order).
3. **Visibility**:
   - Citizen sees only their own complaints (`listMyComplaints`, `getMyComplaint` — ownership
     checked explicitly, not just via RLS).
   - Department admin sees complaints assigned to their department only.
   - Municipality admin/super_admin sees all complaints across every municipality they administer,
     with cross-municipality isolation enforced by an explicit `.in("municipality_id", muniIds)`
     filter on every query.
   - Public feed (`listPublicComplaints`) shows all complaints of one verified municipality at a
     time (no cross-municipality browsing in one call), excluding `internal_notes` and citizen
     identity, with attachments exposed via short-lived (1 hour) signed URLs
     (`signAttachments`/`SIGNED_URL_TTL`).
4. **Editing/closing**: municipality admins can bulk-update `status` and/or `internal_notes`
   (`adminUpdate`); department admins can update `status` only, never `internal_notes`.
5. **Search**: admin/department list endpoints support free-text search across title/description/
   complaint_number and an exact ID match when the term looks like a UUID; public and
   user-search endpoints are rate-limited (60/min and 20/min respectively).
6. **Complaint numbering**: human-readable `CMP-000123`-style sequential identifiers assigned by a
   DB trigger (`assign_complaint_number`, backed by `complaint_number_seq`), independent of the
   internal UUID primary key.

## 8. Notifications

- **Storage**: `notifications` table (`user_id`, `complaint_id`, `title`, `body`, `read`,
  `created_at`), RLS-scoped so a user can only read/update their own rows (initial migration).
- **Triggers that create notifications**:
  - A DB trigger fires on complaint `status` change and notifies the complaint owner
    (`handle_complaint_status_change`, initial migration) — this predates and is independent of the
    department-routing feature.
  - Application-level inserts on department transfer (`redirectComplaint`): one notification to the
    citizen, one to each admin of the newly-assigned department.
- **Delivery**: **Supabase Realtime** is wired up client-side —
  `AuthenticatedHeader.tsx`'s `NotificationsMenu` opens a `postgres_changes` channel filtered to
  `user_id=eq.<uid>` on the `notifications` table and invalidates the notifications/my-complaints
  React Query caches on any change, layered on top of a 15-second `refetchInterval` poll as a
  fallback. `public.notifications` and `public.complaints` are both added to the
  `supabase_realtime` publication (initial migration). This is a genuinely implemented realtime
  feature, not merely aspirational copy — although it is the **only** realtime channel in the app;
  no other page (e.g. admin/department complaint lists) subscribes to live updates.
- **User actions**: mark one/all as read, delete one/all (`markNotificationsRead`,
  `deleteNotifications`), both ownership-scoped server-side.
- **Absent**: no email/SMS/push notification channel — in-app only. No user-configurable
  notification preferences.

## 9. Feedback (in-app bug/suggestion reporting)

- Any authenticated user can submit feedback (`submitFeedback`, `FeedbackButton.tsx`/
  `FeedbackDialog.tsx`): type `bug|suggestion`, title, description, optional page context, optional
  screenshot.
- Rate-limited to 10/hour/user; text run through the same spam-detection filter as complaints.
- Screenshot path ownership is verified server-side (`screenshot_path` must start with the caller's
  own `userId` folder segment) before being trusted, then served back only via a signed URL
  (`getFeedbackDetail`).
- Full CRUD/triage (`listAllFeedback`, `getFeedbackDetail`, `updateFeedbackStatus`,
  `updateFeedbackAdminNotes`, `deleteFeedback`) is **global-admin only**, at `/platform-feedback`.
  Statuses: `open | fixed`.

## 10. Security Mechanisms — Summary

| Mechanism | Where |
|---|---|
| JWT verification via Supabase `getClaims` (not local decode) | `auth-middleware.ts` |
| Server-side re-verification of every role/scope claim (never trusts client) | `authz.server.ts`, every `*.functions.ts` |
| Postgres Row-Level Security on all tables (profiles, user_roles, complaints, attachments, notifications, and municipality/department tables added in later migrations) | `supabase/migrations/*` |
| PostgREST `.or()` filter-injection sanitization | `sanitizeSearchTerm()` |
| Generic, DB-backed atomic rate limiting (`rl_check_and_consume` RPC) applied per action/subject | `rate-limit.server.ts`, `rate-limits.ts` |
| Upload MIME/size/count allow-listing enforced server-side independent of client | `upload-validation.ts` |
| Spam/low-quality text heuristics on complaints and feedback | `spam-detection.ts` |
| Signed, time-limited (1h) URLs for all attachment/screenshot access — no public bucket listing of arbitrary files | `signAttachments`, `getFeedbackDetail` |
| Least-privilege separation: platform role vs. municipality role vs. department role, explicitly non-overlapping | `authz.server.ts` design comments, `setDepartmentAdmin` |
| "Last admin" protections preventing total lockout | `changeUserRole` (last global-scope admin), `muniDemoteToCitizen`/`muniTransferSuperAdminByEmail` (last super_admin per municipality) |
| Audit trail for role changes and complaint routing | `role_audit_log` table (`changeUserRole`), `complaint_routing_history` table |
| Atomic multi-step privileged mutations as SECURITY DEFINER SQL functions rather than app-level multi-query sequences | `bulk_transfer_complaints`, `delete_department_atomic`, `bootstrap_global_admin`, `promote_global_admin`, `transfer_global_admin`, `abandon_global_admin` |
| Fail-safe rate limiter (fails open on infra error, logged) | `enforceRateLimit()` — a deliberate availability/security tradeoff worth flagging: an outage of the rate-limit RPC silently disables abuse protection rather than blocking legitimate traffic |

## 11. Ambiguities & Gaps Worth Flagging

- **Legacy schema drift**: the very first migration defines `app_role` as only `admin|citizen` and
  `complaint_category` with only 4 values; later migrations (not individually enumerated here)
  clearly extend these (12 categories are validated in `complaints.functions.ts`, and
  `global_admin`/`super_admin` roles are used throughout the app code) — the true current enum
  definitions live in later migration files not reviewed line-by-line in this audit; readers
  extending the schema should diff current DB enum state directly rather than trust the first
  migration file alone.
- **RLS vs. app-layer authorization overlap**: many handlers use the service-role `supabaseAdmin`
  client and re-implement authorization checks in TypeScript rather than relying on RLS policies
  for those tables/queries. This is defensible (centralizes complex multi-tenant scoping logic that
  RLS alone struggles to express cleanly) but means RLS policies alone are **not** sufficient
  documentation of the true access-control surface — this audit is based on the TypeScript checks,
  which are the actual enforcement point for those endpoints.
- **No automated tests found** in the repository for authorization boundaries, rate limits, or
  complaint lifecycle — this audit is based on static code reading only, not test evidence.
- **No de-verification / suspension workflow** for municipalities once approved (§5).
- **No password-based or email/link login** — Google OAuth is a hard dependency; there is no
  fallback if a user has no Google account.
- **No push/email notifications** — despite the homepage marketing copy promising "إشعارات فورية"
  (instant notifications), delivery is limited to in-app Realtime + polling; there is no evidence of
  any email or SMS integration anywhere in the codebase (Planned/Absent, contradicts marketing copy
  in `src/routes/index.tsx`).
- **Realtime is single-purpose**: only the notification bell subscribes to `postgres_changes`;
  admin/department complaint dashboards do not live-update and require manual refresh or React
  Query cache invalidation triggers to see new/changed complaints from other actors.
- **Complaint status is not a strict state machine** — nothing in the code prevents moving a
  complaint from `resolved` back to `pending`, for example; this may be intentional flexibility or
  an oversight depending on product intent.
