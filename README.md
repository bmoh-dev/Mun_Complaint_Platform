# Municipality Complaint Platform

> A civic technology platform for submitting, tracking, routing, and managing public complaints through a structured digital workflow.

**Live Demo:** https://public-concern-feed.lovable.app

**Status:** V1 prototype — live for demonstration and testing

---

## Overview

The Municipality Complaint Platform is a full-stack civic technology project designed to improve how citizens submit public complaints and how municipal teams organize and process them.

The platform provides a structured workflow connecting:

**Citizen → Complaint → Municipality → Department → Status Updates**

Instead of relying on unstructured communication channels, the system gives citizens a dedicated place to submit complaints, attach supporting information, track their requests, and receive in-app updates.

The project was developed independently as part of the **DZ Young Leaders Program under the Ministry of Youth, Algeria**.

I served as the main developer and built the platform independently, from the application interface and database structure to authentication, authorization, complaint workflows, and administrative dashboards.

> **Important:** This repository represents a V1 prototype. It is not presented as an officially deployed municipal system. The current version is available online for demonstration and testing. A formal presentation and potential future pilot are planned.

---

## Why I Built It

Public complaints often contain useful information about problems in roads, lighting, sanitation, infrastructure, and other local services.

A digital platform can make this process more structured by allowing citizens to:

* Submit complaints from one place
* Categorize and describe the problem
* Attach supporting images
* Provide a location
* Track the complaint using a unique reference
* Receive status updates

At the administrative level, municipalities can organize incoming complaints, route them to relevant departments, and monitor their status.

The project therefore explores how software can be used to improve **civic participation, information flow, and local service management**.

---

## Core Workflow

```text
Citizen
   │
   ▼
Submit Complaint
   │
   ├── Category
   ├── Description
   ├── Location
   └── Attachments
   │
   ▼
Complaint Reference
   │
   ▼
Municipality Dashboard
   │
   ▼
Department Assignment
   │
   ▼
Status Updates
   │
   ▼
Citizen Tracking
```

---

## Key Features

### Citizen Features

* Submit public complaints through a structured form
* Select a complaint category
* Add descriptions and location information
* Attach supporting images
* Receive a unique complaint reference such as `CMP-000123`
* Track submitted complaints
* View complaint status
* Receive in-app notifications

### Municipality Features

* Municipality administration dashboard
* View and manage incoming complaints
* Organize complaints by category and status
* Route complaints to departments
* Monitor complaint processing
* Manage municipality membership and administrative roles

### Department Features

* Department-specific complaint queues
* Receive complaints routed to the department
* Process assigned complaints
* Update complaint status
* Maintain routing history

### Platform Administration

* Platform-level administration
* Municipality verification workflow
* Role management
* Audit logging for administrative role changes
* Protection against removing the final administrator

---

## Demo

The complete workflow can be demonstrated from submission to administrative processing:

1. Open the platform
2. Submit a sample complaint
3. Add a description, location, and attachment
4. Receive a complaint reference
5. Open the citizen tracking interface
6. Open the municipality dashboard
7. Process the complaint
8. Change its status
9. Show the resulting update to the citizen

**Live Demo:**
https://public-concern-feed.lovable.app

**Demo Video:**
See the repository's demo video or the linked YouTube demonstration.

---

## Screenshots

### Landing Page

<img width="1366" height="768" alt="landing page" src="https://github.com/user-attachments/assets/d58eef1c-92dd-473c-8b6e-0df82b82940b" />



### Public Feed & Map

<img width="1366" height="645" alt="feed" src="https://github.com/user-attachments/assets/af1a4e15-b805-4167-8c70-d1d159464181" />
<img width="1366" height="645" alt="Feed-Map" src="https://github.com/user-attachments/assets/10f422a4-c3d4-4710-88d8-22dfa53c8069" />


### Complaint Submission

<img width="1191" height="726" alt="Complaint Form" src="https://github.com/user-attachments/assets/b9c68fde-c701-4a73-8ccb-fbd830302459" />
<img width="1189" height="727" alt="Complaint_Submitted" src="https://github.com/user-attachments/assets/cf0d7c59-862b-4d8c-8ef5-aa1c4a1d9002" />


### Municipality Dashboard

<img width="1366" height="641" alt="Admin Dashboard" src="https://github.com/user-attachments/assets/045926c0-7a6e-4040-b2c6-f6b4881ed2c5" />


### Department Queue

<img width="1366" height="644" alt="Departement Dashboard" src="https://github.com/user-attachments/assets/b5bfdf85-28de-40c3-ba6a-b67169ee97d7" />


### Platform Administration

<img width="1366" height="644" alt="Platform Admin Dashboard" src="https://github.com/user-attachments/assets/82633dd6-23b4-4b3b-976a-de3538b007e7" />


---

## Technical Architecture

The application is built as a full-stack web platform using:

| Layer                 | Technology                                               |
| --------------------- | -------------------------------------------------------- |
| Frontend              | React 19                                                 |
| Application Framework | TanStack Start                                           |
| Styling               | Tailwind CSS v4                                          |
| UI Components         | shadcn/ui                                                |
| Backend / Database    | Supabase                                                 |
| Database              | PostgreSQL                                               |
| Authentication        | Supabase Auth                                            |
| Authorization         | Server-side role and scope verification + PostgreSQL RLS |
| Validation            | Zod                                                      |
| Realtime              | Supabase Realtime                                        |
| Deployment            | Lovable Cloud / Edge-compatible runtime                  |

---

## Database Design

The application uses a relational PostgreSQL data model.

Simplified structure:

```text
auth.users
    │
    └── profiles
          │
          ├── user_roles
          │
          └── municipality_members
                  │
                  └── municipalities
                         │
                         ├── departments
                         │      └── department_admins
                         │
                         └── complaints
                                │
                                ├── complaint_attachments
                                ├── complaint_routing_history
                                └── notifications

feedback
role_audit_log
rate_limit_counters
```

Complaints use:

* A UUID as the database identifier
* A human-readable sequential reference such as `CMP-000123`

The repository contains the database schema and migrations under:

```text
supabase/migrations/
```

---

## Security & Authorization

Security was treated as part of the application architecture rather than only as a frontend concern.

The current implementation includes:

* PostgreSQL Row-Level Security policies
* Server-side verification of authentication claims
* Server-side verification of roles and municipality scope
* Separation between platform, municipality, and department roles
* Server-side validation of uploaded files
* Rate limiting backed by the database
* Anti-spam validation for complaint and feedback text
* Signed, time-limited URLs for private attachments
* Audit trails for selected administrative operations
* Atomic database functions for selected privileged operations
* Protection against accidentally removing the final administrator

The authorization model is designed so that sensitive permissions are not determined solely by client-side UI state.

---

## Validation, Rate Limiting & Abuse Protection

The application validates server-function inputs using Zod schemas.

Additional protections include:

* Rejection of low-quality or keyboard-mash complaint text
* Server-side MIME and file-size validation
* Upload count and bandwidth controls
* Database-backed rate limiting
* Search rate limiting
* Complaint submission rate limiting
* Protection against unauthorized access to municipality-scoped resources

These mechanisms are intended to provide a stronger baseline for a real multi-user deployment.

---

## Notifications

Complaint status changes can generate in-app notifications for the relevant user.

The current implementation uses:

* Supabase Realtime
* Database-triggered notification creation
* A polling fallback in the notification interface

The current V1 does **not** provide email, SMS, or push notifications.

---

## Current Status

### Implemented in V1

* Citizen complaint submission
* Complaint categorization
* Attachments
* Location information
* Complaint references
* Citizen tracking
* Municipality dashboard
* Department workflow
* Complaint routing
* Status management
* In-app notifications
* Municipality and role management
* Database security policies
* Rate limiting
* Validation and anti-spam mechanisms
* Live deployment
* Demonstration workflow

### Current Testing

The current version has been used for local testing and demonstration.

A formal project presentation is planned as part of the DZ Young Leaders context.

The project is **not currently presented as an officially deployed municipal service**.

---

## Known Limitations

The V1 prototype also has limitations that would need to be addressed before production deployment.

### Authentication

Google OAuth is currently the primary authentication method. Additional authentication options are planned.

### Notification Channels

Notifications are currently delivered inside the application. Email, SMS, and push notifications are not implemented.

### Automated Testing

A comprehensive automated test suite for authorization boundaries, rate limiting, and the complaint lifecycle has not yet been implemented.

### Administrative Lifecycle

The current version does not yet provide a complete municipality suspension/de-verification workflow.

### Complaint State Management

Complaint status transitions are currently flexible rather than enforced through a strict state machine.

These limitations are intentionally documented because moving from a working prototype to a production civic system would require additional testing, security review, operational controls, and deployment infrastructure.

---

## Roadmap

### V2 — Planned

* [ ] Expand authentication options
* [ ] Improve security and production hardening
* [ ] Improve usability based on testing feedback
* [ ] Improve administrative workflows
* [ ] Introduce stricter complaint lifecycle rules
* [ ] Improve realtime administrative updates
* [ ] Add additional notification channels
* [ ] Add a more comprehensive automated test suite
* [ ] Prepare the system for a potential controlled pilot

The roadmap is intentionally separated from the implemented V1 so that planned functionality is not presented as existing functionality.

---

## Project Structure

A simplified view of the repository:

```text
src/
├── routes/
├── components/
├── functions/
└── ...

supabase/
└── migrations/

docs/
└── screenshots/

README.md
```

The exact structure may evolve as the project develops.

---

## Running Locally

### Requirements

* Node.js
* Bun or npm
* A Supabase project for local/non-Lovable deployment

### Install dependencies

```bash
bun install
```

or:

```bash
npm install
```

### Start the development server

```bash
bun run dev
```

The development server runs on the configured local development port.

### Available scripts

| Script      | Purpose                           |
| ----------- | --------------------------------- |
| `dev`       | Start development server          |
| `build`     | Create production build           |
| `build:dev` | Create development build          |
| `preview`   | Preview production build          |
| `lint`      | Run ESLint                        |
| `format`    | Format source files with Prettier |

---

## Deployment

The current V1 is deployed through Lovable Cloud.

The application is built into an edge-compatible deployment bundle and uses Supabase for backend services and database functionality.

**Live application:**

https://public-concern-feed.lovable.app

---

## Development Context

This project was developed independently as a technical project within the:

**DZ Young Leaders Program — Ministry of Youth, Algeria**

My role was primarily technical: I designed and implemented the platform as the main developer.

The project was created to explore how software engineering can be applied to a real civic problem rather than as a purely academic exercise.

---

## What I Learned

Developing this project expanded my experience beyond building user interfaces.

The project required working across:

* Full-stack application architecture
* Relational database design
* Authentication and authorization
* Multi-role access control
* PostgreSQL Row-Level Security
* API/server-function design
* Input validation
* File handling
* Rate limiting
* Realtime application behavior
* Administrative workflows
* Deployment
* Technical documentation

More importantly, it reinforced the importance of starting from a real problem and designing the software around the people and workflow involved.

---

## Future Direction

The long-term goal is not simply to add more features.

The project can serve as a foundation for exploring how software engineering, automation, data, and eventually AI can improve public-service workflows.

Future development will therefore focus on:

**reliable software → structured data → automation → intelligent systems → measurable civic impact**

---

## License

This project is currently maintained as a personal portfolio and educational project.

---

## Author

**Mohamed-Said Bouzitouna**

Algeria

This project represents independent technical work developed as part of the DZ Young Leaders Program.
