# Setup Guide — Music Lab

---

## Prerequisites

- Node.js v18+
- npm v9+
- A Supabase project (free tier is enough for MVP)
- A Netlify account (for deployment)
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/Music-Lab-v1.git
cd Music-Lab-v1
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in your Supabase Dashboard under **Project Settings → API**.

> ⚠️ Never commit the real `.env` file. It is already in `.gitignore`.

---

## 4. Apply Database Migrations

Migrations are in `/supabase/migrations/`. Apply them in order.

**Option A — via Supabase MCP (recommended during development):**
Use the MCP tool in VS Code (GitHub Copilot Chat) to run `apply_migration`.

**Option B — via Supabase Dashboard:**
Open **SQL Editor** in your Supabase project and paste + run each migration file in order.

**Option C — via Supabase CLI:**
```bash
supabase db push
```

Migration order:
1. `20260224225627_create_initial_schema.sql`
2. `20260224225757_add_rls_policies.sql`
3. `20260224225937_fix_indexes_and_rls_performance.sql`
4. `20260225180203_fix_sta_read_policy_show_all_assignments_for_assigned_students.sql`
5. `20260225180323_fix_sta_read_policy_no_recursion.sql`
6. `20260225214048_create_recordings_storage_bucket.sql`
7. `20260226015455_alter_profiles_social_links_to_text.sql`
8. `20260226113803_add_announcements_schema.sql`
9. `20260226114455_fix_function_search_paths.sql`
10. `20260227202408_add_is_active_to_profiles.sql`
11. `20260227233217_drop_photo_url_from_profiles_and_students.sql`
12. `20260227234750_rename_social_links_to_instagram_in_profiles.sql`

---

## 5. Configure Supabase Auth

In the Supabase Dashboard → **Authentication → URL Configuration**:

**Site URL:**
```
http://localhost:5173
```
(Change to your production URL after deploying)

**Redirect URLs (allow list):**
```
http://localhost:5173/src/pages/auth/set-password.html
https://your-site.netlify.app/src/pages/auth/set-password.html
```

---

## 6. Create the First Admin User

1. Go to Supabase Dashboard → **Authentication → Users**
2. Click **Invite user** and enter the admin email
3. After the user accepts the invite and sets a password, go to **Table Editor → profiles**
4. Find the row and set `role = 'admin'`

> All subsequent teachers are invited from within the app by the admin.

---

## 7. Deploy Edge Functions

Two Edge Functions are required:

### `invite-teacher`
Sends an invitation email to a new teacher.

### `deactivate-teacher`
Soft-deactivates a teacher (sets `is_active=false`, closes assignments, bans auth user).

Deploy via Supabase MCP or CLI:
```bash
supabase functions deploy invite-teacher
supabase functions deploy deactivate-teacher
```

Both functions use `verify_jwt: false` with internal auth checks.  
They require the `SUPABASE_SERVICE_ROLE_KEY` secret set in Supabase Dashboard → **Edge Functions → Secrets**.

---

## 8. Run Locally

```bash
npm run dev
```

App will be available at `http://localhost:5173`.

---

## 9. Build for Production

```bash
npm run build
```

Output goes to `/dist`.

---

## 10. Deploy to Netlify

**Option A — via Netlify UI:**
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

**Option B — via `netlify.toml`** (add to project root):
```toml
[build]
  command = "npm run build"
  publish = "dist"
```

After deploying, update the Supabase **Redirect URLs** with your production Netlify URL.

---

## Project Structure Reference

```
src/
  components/    navbar.js, toast.js
  pages/         auth/, dashboard/, students/, teachers/, announcements/, profile/
  services/      auth.js, students.js, teachers.js, lessons.js, announcements.js, ...
  styles/        main.css
  utils/         guards.js, formatters.js
supabase/
  migrations/
DOCS/
  DATABASE_SCHEMA.md
  RLS.md
  SETUP.md        ← you are here
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page after login | Check Supabase URL and anon key in `.env` |
| 401 on Edge Function | Verify `SUPABASE_SERVICE_ROLE_KEY` secret is set |
| Teacher can see wrong students | Check RLS policies — re-apply migrations |
| Invite email not received | Check Supabase Auth → Email Templates and SMTP settings |
| `photo_url` column error | Apply all migrations in order — column was removed |
