# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Sistema Integral de Solicitudes para Soporte Tecnológico — ISTHO S.A.S.**  
Full-stack web app that replaces Microsoft Forms + Excel for IT support ticket management with automated SLA, role-based access, and ISO 9001:2015 audit trail.

All application code lives under `soporte-ti-istho/`.

---

## Commands

### Backend (`soporte-ti-istho/server/`)
```bash
npm run dev           # Start with nodemon — http://localhost:5000
npm run start         # Production start
npm run db:migrate    # Apply all pending Sequelize migrations
npm run db:seed       # Load initial data (admin + técnicos + empleados)
npm run db:reset      # Undo all + migrate + seed (full reset)
npm run db:migrate:undo   # Revert last migration
npm run db:seed:undo      # Undo all seeders
```

### Frontend (`soporte-ti-istho/client/`)
```bash
npm run dev     # Vite dev server — http://localhost:5173
npm run build   # Production build (outputs to dist/)
npm run lint    # ESLint
npm run preview # Preview production build
```

### First-time setup
```sql
CREATE DATABASE soporte_ti_istho CHARACTER SET utf8mb4;
```
Then configure `server/.env` with DB credentials, run `db:migrate` and `db:seed`.

---

## Architecture

### Stack
- **Frontend**: React 19 + Vite + **Tailwind CSS v4** (via `@tailwindcss/vite`) + Recharts + Sonner + react-hook-form + zod
- **Backend**: Node.js + Express 5 + Sequelize 6 + MySQL 8
- **Auth**: JWT stored in `localStorage`, 24h expiry, account lockout after 5 failed attempts

### Backend structure (`server/src/`)

```
config/
  config.js       — Sequelize CLI config (reads env vars)
  database.js     — Sequelize instance
  jwt.js          — JWT sign/verify helpers
  multer.js       — File upload config (uploads/solicitudes/)
models/
  index.js        — Loads all models + defines associations
  Usuario.js      — bcrypt hooks, validarPassword(), toJSON strips hash
  Empleado.js
  Solicitud.js    — ticket number TKT-YYYYMMDD-XXXX
  Auditoria.js
migrations/       — 4 files in order: usuarios → empleados → solicitudes → auditoria
seeders/          — 2 files: usuarios (admin+técnicos) → empleados
services/
  slaService.js   — Core SLA: calcularFechasSLA(), agregarMinutosHabiles()
  auditoriaService.js — registrarAuditoria() called in all CRUD ops
controllers/      — authController, solicitudController, empleadoController,
                    usuarioController, dashboardController
routes/
  index.js        — Mounts all routes under /api; /api/health for ping
middleware/
  auth.js         — JWT verification
  authorize.js    — Role-based access (admin / tecnico / usuario)
  validate.js     — express-validator error handler
  errorHandler.js — Global error handler
utils/
  constants.js    — ROLES, ESTADOS, PRIORIDADES, SLA_CONFIG, FESTIVOS_COLOMBIA_2026, HORARIO_ISTHO
```

### Frontend structure (`client/src/`)

```
context/
  AuthContext.jsx   — Global auth state; login() stores JWT, auto-loads /auth/me on mount
  ThemeContext.jsx  — Dark/Light toggle via `dark` class on <html>, persisted in localStorage
services/
  api.js            — Axios instance with JWT interceptor; auto-redirects to /login on 401
  (+ per-domain service files)
components/
  common/           — Badge, Button, Card, Input, Modal, Skeleton, Pagination
  layout/           — Navbar, ProtectedRoute, ThemeToggle
  solicitudes/      — SolicitudForm, SolicitudModal, PrioridadBadge, EstadoBadge, SLAIndicator
  dashboard/        — MetricCard
pages/              — LoginPage, DashboardPage, SolicitudesPage, EmpleadosPage,
                      UsuariosPage, PerfilPage, HomePage, NotFoundPage
routes.jsx          — All routes with ProtectedRoute + role restrictions
utils/
  constants.js      — PRIORIDAD_COLORS, ESTADO_COLORS, label maps for enums
  formatters.js     — formatFecha, formatRelativo, slaColor, slaTextColor (date-fns/es)
```

---

## Key Business Rules

### SLA calculation (`slaService.js`)
- `critica`: natural time 24/7 — 30 min response / 4 h resolution
- `alta`: business hours — 2 h response / 8 h resolution
- `media`: business hours — 8 h response / 24 h resolution
- `baja`: business hours — 24 h response / 48 h resolution
- Business hours (HORARIO_ISTHO): Mon–Fri 08:00–17:00, Sat 08:00–12:00, no Sundays
- Colombian holidays 2026 defined in `FESTIVOS_COLOMBIA_2026` (must update yearly)

### Visibility rules
- `tecnico` role: only sees own tickets + unassigned tickets (`tecnicoAsignado = null`)
- `usuario` role: only sees their own tickets
- `admin`: sees all

### Audit trail
Every CRUD operation must call `registrarAuditoria()` from `auditoriaService.js`. This is a hard ISO 9001 requirement — never skip it.

---

## UI Component Rules

**Selects / dropdowns**: Always use `<Select>` from `components/common/Select.jsx` — never native `<select>`. For react-hook-form integration use `<Controller>` with `field.value` / `field.onChange`. This applies everywhere: forms, filter bars, bulk-action toolbars.

**Date pickers**: Always use the custom date input/picker component — never a raw `<input type="date">`. If none exists yet, create one under `components/common/DatePicker.jsx` before using it.

---

## Tailwind v4 Notes

This project uses **Tailwind CSS v4** — the configuration differs from v3:
- No `tailwind.config.js`. Custom colors/fonts are defined in `@theme {}` block inside `client/src/index.css`.
- Use `@import "tailwindcss"` (not `@tailwind base/components/utilities`).
- Plugin: `@tailwindcss/vite` (not postcss). Configured in `vite.config.js`.
- Centhrix custom colors: `navy-*`, `orange-*`, `cgreen-*` (note: `cgreen` not `green` to avoid conflict).

---

## Brand Colors (Centhrix)
- Navy `#1B2340` — primary/dominant (CSS: `--color-navy-500`)
- Orange `#E8531E` — accent/CTAs (CSS: `--color-orange-500`)
- Green `#4C8C2B` — success/SLA met (CSS: `--color-cgreen-500`)

---

## Initial Users (after seed)
| Email | Password | Role |
|-------|----------|------|
| admin@istho.com.co | Admin2026* | admin |
| carlos.tecnico@istho.com.co | Tecnico2026* | tecnico |
| maria.tecnico@istho.com.co | Tecnico2026* | tecnico |

---

## Environment Variables

**`server/.env`** (required):
```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=soporte_ti_istho
DB_USER=root
DB_PASSWORD=
JWT_SECRET=...
CORS_ORIGIN=http://localhost:5173
```

**`client/.env.local`** (required):
```
VITE_API_URL=http://localhost:5000/api
```

---

## Ruido conocido en consola

El error `InvalidNodeTypeError: Failed to execute 'selectNode' on 'Range': the given Node has no parent` y `Unchecked runtime.lastError` son generados por **extensiones del navegador** (ej. Grammarly, LastPass). No son bugs de la aplicación y no requieren acción.
