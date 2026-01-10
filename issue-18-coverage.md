# Issue 18 MVP Checklist (trimmed)

Focus: admin basics needed to operate the game.

## Scope
- Admin access inside the app (sidebar panel is OK for MVP).
- Minimal user/character control for support.
- Basic content management.
- Essential security hardening only.

## Checklist

### Access and roles
- [x] Admin role + session auth. (`supabase-schema.sql`, `js/api/auth-service.js`)
- [x] Admin entry point in the app. (`js/sidebar.js`, `js/panels/admin-panel.js`)
- [ ] Dedicated `/admin` route (post-MVP).

### Admin actions (MVP)
- [x] Switch active character in admin panel. (`js/panels/admin-panel.js`)
- [x] Edit kaels for active character. (`js/panels/admin-panel.js`)
- [ ] Reset user password (UI flow). (`js/api/auth-service.js` exists, no UI)
- [ ] Disable/activate user account.

### Users overview
- [x] User list + search (username). (`js/panels/admin-panel.js`)
- [x] Basic counts: users + characters. (`js/panels/admin-panel.js`)

### Content (MVP)
- [x] Codex items CRUD. (`js/codex-admin.js`)
- [ ] Enable/disable items toggle in admin UI. (`js/api/items-service.js` exists, no UI)

### Security
- [x] Session timeout. (`js/api/auth-service.js`)
- [ ] Rate limiting on login.

## Out of MVP (later)
- Audit trail, multi-role permissions, advanced stats, exports, and config settings.
