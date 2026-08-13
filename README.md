# SCAD-INTESS

Sistema de Control Académico y Disciplinario para el Instituto Nacional Tecnológico de San Salvador (INTESS). Plataforma web para la gestión de matrículas, calificaciones, asistencia, registro disciplinario y reportes oficiales de una institución de educación media con ~950 estudiantes.

Proyecto de cátedra — Universidad Francisco Gavidia, Equipo N°

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Base de datos | MySQL 8.0+ |
| Acceso a datos | mysql2 (SQL directo, sin ORM ni migraciones) |
| Autenticación | Auth.js (NextAuth) + bcrypt, RBAC contra tablas `rol`/`permiso` |
| Validación | Zod + react-hook-form |
| UI | Tailwind CSS + shadcn/ui |
| PDFs | @react-pdf/renderer |

## Requisitos previos

- Node.js 20+
- MySQL corriendo localmente (XAMPP funciona: solo se usa su MySQL, no Apache)
- Git

## Setup (primera vez)

**1. Clonar e instalar dependencias**

```bash
git clone https://github.com/Alex-UFG/SCAD-INTESS.git
cd SCAD-INTESS
npm install
```

**2. Crear la base de datos**

Con MySQL corriendo, ejecutar los scripts en orden desde la carpeta `database/`:

```bash
cd database
mysql -u root -p < 001_schema.sql
mysql -u root -p < 002_seed.sql
```

Esto crea la base `scad_intess` con 24 tablas y los datos estructurales: 5 roles, 25 permisos, 4 especialidades, el ciclo escolar con sus trimestres y el usuario administrador inicial.

**3. Variables de entorno**

Copiar la plantilla y completar:

```bash
cp .env.example .env.local
```

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=scad_intess
AUTH_SECRET=        # generar con: npx auth secret
AUTH_URL=http://localhost:3000
```

`.env.local` no se versiona. Nunca commitear credenciales.

**4. Levantar el servidor de desarrollo**

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

**5. Verificar la conexión a la base de datos**

Abrir [http://localhost:3000/api/health](http://localhost:3000/api/health). Respuesta esperada:

```json
{ "status": "ok", "db": { "roles": 5, "permisos": 25, "especialidades": 4 } }
```

## Credenciales iniciales

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin@intess.edu.sv` | `Admin2026!` | Admin |

Cambiar la contraseña en el primer inicio de sesión.

## Base de datos: convención de scripts

**No se usan migraciones del framework.** El esquema vive en scripts SQL numerados dentro de `database/`, que se ejecutan en orden:

```
database/
├── 001_schema.sql   # 24 tablas, FKs e índices
├── 002_seed.sql     # roles, permisos, catálogos, admin inicial
└── run.bat          # ejecuta todo en orden (Windows)
```

Reglas:

- Los scripts ya mergeados son **inmutables**: un cambio de esquema se agrega como nuevo script (`003_alter_x.sql`), nunca editando los anteriores.
- Para recrear la base desde cero: `DROP DATABASE scad_intess;` y volver a correr los scripts en orden.

## Estructura del proyecto

```
├── database/          # Scripts SQL versionados (schema + seeds)
├── src/
│   ├── app/           # Rutas, layouts y API (App Router)
│   ├── components/    # Componentes UI compartidos
│   ├── lib/           # db.ts (pool mysql2), auth, validaciones Zod
│   └── types/         # Interfaces TypeScript por tabla
├── uploads/           # Evidencias disciplinarias (NO versionado)
└── PROYECTO.md        # Documentación de arquitectura y decisiones
```

## Módulos

- **Matrícula** — expedientes estudiantiles, tutores legales, asignación de sección
- **Control de Notas** — captura por trimestre (Act1 35% + Act2 35% + Examen 30%), detección de riesgo académico (< 6.00), bloqueo 72h tras cierre de periodo
- **Registro Disciplinario** — incidencias Leve/Grave/Muy Grave, escalamiento automático (3 leves → Grave), citaciones a tutores, evidencias
- **Reportes** — boleta de calificaciones (REP-01), certificado conductual (REP-02), constancia de matrícula (REP-03), consolidado gerencial
- **Auditoría** — bitácora inmutable de toda acción (usuario, datos antes/después, IP)
