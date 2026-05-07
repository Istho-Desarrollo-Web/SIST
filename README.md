# SIST — Sistema Integral de Solicitudes Tecnológicas

Sistema de gestión de tickets de soporte TI para **ISTHO S.A.S.**, desarrollado como reemplazo de Microsoft Forms + Excel. Incluye SLA automatizado, trazabilidad ISO 9001:2015, dashboard en tiempo real y portal público para empleados.

---

## Características principales

- **Portal público** — empleados registran solicitudes por cédula, sin necesidad de cuenta
- **Panel de gestión** — admins y técnicos gestionan tickets con flujo de estados configurable
- **SLA automático** — calcula fechas límite en tiempo natural (crítica) o hábil (alta/media/baja)
- **Dashboard** — métricas en tiempo real, cumplimiento SLA por técnico, tendencias semanales
- **Archivos adjuntos** — hasta 3 archivos, 10 MB c/u (imágenes, PDF, Office, video, audio)
- **Vista previa inline** — sin abrir nuevas pestañas ni descargar
- **Auditoría completa** — registro automático de todas las operaciones (ISO 9001:2015)
- **Dark / Light mode** — persistido por usuario en localStorage
- **Notificaciones por email** — destinatarios dinámicos desde la tabla de usuarios

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| UI / Gráficos | Lucide React + Recharts + Sonner |
| Formularios | react-hook-form + zod |
| Backend | Node.js 20 + Express 5 |
| ORM / DB | Sequelize 6 + MySQL 8 |
| Auth | JWT (24h) + bloqueo tras 5 intentos |
| Archivos | Multer (diskStorage) |
| Email | Nodemailer |
| Deploy | Vercel (frontend) + Railway (backend + MySQL) |

---

## Estructura del repositorio

```text
soporte-ti-istho/
├── client/          # React + Vite
│   ├── src/
│   │   ├── components/   # UI reutilizable y específico de dominio
│   │   ├── pages/        # Vistas principales
│   │   ├── context/      # AuthContext + ThemeContext
│   │   ├── services/     # Axios + servicios por dominio
│   │   └── utils/        # Formatters + constantes
│   └── vercel.json
└── server/          # Express + Sequelize
    ├── src/
    │   ├── config/       # DB, JWT, Multer
    │   ├── controllers/
    │   ├── middleware/   # Auth, authorize, validate, errorHandler
    │   ├── models/       # Usuario, Empleado, Solicitud, Auditoria
    │   ├── migrations/
    │   ├── seeders/
    │   ├── routes/
    │   ├── services/     # slaService, emailService, auditoriaService
    │   └── utils/
    ├── uploads/solicitudes/
    └── railway.toml
```

---

## Desarrollo local

### Requisitos

- Node.js ≥ 20
- MySQL 8 (XAMPP, Docker o Railway)

### 1 — Base de datos

```sql
CREATE DATABASE soporte_ti_istho CHARACTER SET utf8mb4;
```

### 2 — Backend

```bash
cd soporte-ti-istho/server
cp .env.example .env          # completar credenciales DB y JWT_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev                   # http://localhost:5000
```

### 3 — Frontend

```bash
cd soporte-ti-istho/client
cp .env.example .env.local    # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                   # http://localhost:5173
```

### Usuarios iniciales

| Email | Contraseña | Rol |
| --- | --- | --- |
| admin@istho.com.co | Admin2026* | admin |
| carlos.tecnico@istho.com.co | Tecnico2026* | tecnico |
| maria.tecnico@istho.com.co | Tecnico2026* | tecnico |

---

## Despliegue en producción

### Railway (backend + MySQL)

1. Nuevo proyecto → agregar servicio desde GitHub, raíz: `soporte-ti-istho/server/`
2. Agregar plugin **MySQL** — Railway inyecta `DATABASE_URL` automáticamente
3. Agregar **Volume** montado en `/data` para archivos persistentes
4. Configurar variables de entorno:

```env
NODE_ENV=production
JWT_SECRET=<string seguro, mín. 32 caracteres>
CORS_ORIGIN=https://<tu-app>.vercel.app
UPLOAD_PATH=/data/uploads/solicitudes
MAX_FILE_SIZE=10485760
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=correo@istho.com.co
EMAIL_PASS=<app_password>
EMAIL_FROM=Soporte TI ISTHO <soporte@istho.com.co>
```

5. Tras el primer deploy, ejecutar desde el shell de Railway:

```bash
npm run db:migrate
npm run db:seed
```

### Vercel (frontend)

1. Nuevo proyecto → importar repositorio, raíz: `soporte-ti-istho/client/`
2. Framework: **Vite** (auto-detectado)
3. Variable de entorno:

```env
VITE_API_URL=https://<backend>.up.railway.app/api
```

4. Copiar la URL de Vercel y actualizar `CORS_ORIGIN` en Railway

> El archivo `client/vercel.json` ya incluye las reglas de rewrite para SPA y cache de assets.

---

## Despliegue alternativo — Render + Aiven MySQL

Alternativa a Railway que combina **Render** (backend Node.js) con **Aiven** (MySQL gestionado).

### Por qué esta combinación

| Aspecto | Railway | Render + Aiven |
| --- | --- | --- |
| Free tier DB | Sí (MySQL plugin) | Aiven: 5 GB MySQL gratis |
| Disk persistente | Volume gratuito | Disk desde Plan Starter ($7/mes) |
| Detección automática | Nixpacks | Node.js auto-detectado |
| `DATABASE_URL` | Inyectada automáticamente | Definir manualmente en dashboard |

### 1 — Base de datos en Aiven

1. Crear cuenta en [aiven.io](https://aiven.io) → nuevo servicio **MySQL**
2. Seleccionar plan **Free** (5 GB, región más cercana)
3. En la vista del servicio → pestaña **Overview** → copiar **Service URI**

```text
mysql://avnadmin:<pass>@<host>.aivencloud.com:PORT/defaultdb?ssl-mode=REQUIRED
```

4. Guardar ese string — se usará como `DATABASE_URL` en Render

### 2 — Backend en Render

1. Crear cuenta en [render.com](https://render.com)
2. Nuevo proyecto → **Blueprint** → seleccionar repositorio y rama `main`
3. Render detecta `soporte-ti-istho/server/render.yaml` automáticamente
4. En el dashboard del servicio `sist-backend` → **Environment** → completar:

```env
DATABASE_URL=mysql://avnadmin:<pass>@<host>.aivencloud.com:PORT/defaultdb?ssl-mode=REQUIRED
JWT_SECRET=<string seguro, mín. 32 caracteres>
CORS_ORIGIN=https://<tu-app>.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=correo@istho.com.co
EMAIL_PASS=<app_password>
EMAIL_FROM=Soporte TI ISTHO <soporte@istho.com.co>
```

> `NODE_ENV`, `UPLOAD_PATH` y `MAX_FILE_SIZE` ya están definidos en `render.yaml`.

5. Tras el primer deploy exitoso, ejecutar desde **Render Shell** (dashboard → Shell):

```bash
npm run db:migrate
npm run db:seed
```

### 3 — Frontend en Vercel

Igual que con Railway, pero usar la URL de Render:

```env
VITE_API_URL=https://sist-backend.onrender.com/api
```

Luego actualizar `CORS_ORIGIN` en Render con la URL de Vercel.

### Nota sobre el Disk persistente

El archivo `render.yaml` configura un **Disk de 5 GB** montado en `/data` para los archivos adjuntos. Esto requiere el **Plan Starter** de Render ($7/mes). En el **Plan Free** eliminar la sección `disk` del `render.yaml` y dejar `UPLOAD_PATH` vacío — los archivos no serán persistentes entre deploys.

---

## Reglas de negocio — SLA

| Prioridad | Tiempo | Respuesta | Resolución |
| --- | --- | --- | --- |
| Crítica | Natural 24/7 | 30 min | 4 h |
| Alta | Hábil | 2 h | 8 h |
| Media | Hábil | 8 h | 24 h |
| Baja | Hábil | 24 h | 48 h |

Horario hábil ISTHO: lunes–viernes 08:00–17:00, sábados 08:00–12:00, sin festivos Colombia.

---

## Variables de entorno

Ver [`server/.env.example`](soporte-ti-istho/server/.env.example) y [`client/.env.example`](soporte-ti-istho/client/.env.example) para la lista completa con descripciones.
