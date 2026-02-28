# Music Lab — Internal Operations App

A secure internal school operations and progress tracking system for a single music school.  
Built with **HTML / CSS / Vanilla JS + Bootstrap 5 + Vite + Supabase**.

---

## Overview

Music Lab replaces chaotic group chats (Viber, etc.) with a structured operational system that:

- Tracks student progress — lessons, notes, recordings, repertoire
- Gives teachers controlled access only to their assigned students
- Enables admin to publish targeted announcements with scheduling
- Provides full operational oversight for the school administrator

This is **not an LMS**. It is an internal operational progress tracking system.

---

## User Roles

| Role    | Access                                                   |
|---------|----------------------------------------------------------|
| Admin   | Full access to all data and actions                      |
| Teacher | Access only to assigned students (primary or assistant)  |

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JS (ES6+)          |
| UI         | Bootstrap 5.3.3 + Bootstrap Icons 1.11  |
| Build      | Vite                                    |
| Backend    | Supabase (PostgreSQL, Auth, Storage, RLS)|
| Deployment | Netlify                                 |

---

## Project Structure

```
src/
  components/     # Shared UI components (navbar, toast, modal)
  pages/          # One folder per page (HTML + JS)
    auth/
    dashboard/
    students/
    teachers/
    announcements/
    profile/
  services/       # All Supabase calls (DB, Auth, Storage)
  styles/         # Global CSS
  utils/          # Guards, formatters, helpers
supabase/
  migrations/     # All schema changes as SQL files
DOCS/
  DATABASE_SCHEMA.md
  RLS.md
  SETUP.md
```

---

## Pages / Routes

| Route                     | Access         |
|---------------------------|----------------|
| `/`                       | Public         |
| `/src/pages/login/`       | Public         |
| `/src/pages/dashboard/`   | Auth required  |
| `/src/pages/students/`    | Auth required  |
| `/src/pages/teachers/`    | Auth required  |
| `/src/pages/announcements/` | Auth required |
| `/src/pages/profile/`     | Auth required  |

---

## Documentation

- [Product Requirements Document](Music_Lab_PRD)
- [Database Schema](DOCS/DATABASE_SCHEMA.md)
- [RLS Policies](DOCS/RLS.md)
- [Setup Guide](DOCS/SETUP.md)

---

## Quick Start

See [DOCS/SETUP.md](DOCS/SETUP.md) for full setup instructions.

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

---

## License

Internal use only — Music Lab.
