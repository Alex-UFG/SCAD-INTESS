"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

// Roles: 1 Admin, 2 Director, 3 Coordinador, 4 Secretaria, 5 Docente.
// TODO: cuando exista UI de rol_permiso, filtrar por permisos en vez de roles.
interface MenuItem {
  key: string;
  href: string;
  roles: number[];
  icon: ReactNode;
}

interface MenuSection {
  key: string;
  items: MenuItem[];
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" {...stroke}>
      {children}
    </svg>
  );
}

const SECTIONS: MenuSection[] = [
  {
    key: "inicio",
    items: [
      {
        key: "dashboard",
        href: "/dashboard",
        roles: [1, 2, 3, 4, 5],
        icon: (
          <Icon>
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
          </Icon>
        ),
      },
    ],
  },
  {
    key: "academico",
    items: [
      {
        // config.ciclos en el seed: Admin y Director
        key: "ciclos",
        href: "/dashboard/ciclos",
        roles: [1, 2],
        icon: (
          <Icon>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </Icon>
        ),
      },
      {
        // config.catalogos en el seed: Admin y Secretaria
        key: "materias",
        href: "/dashboard/materias",
        roles: [1, 4],
        icon: (
          <Icon>
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </Icon>
        ),
      },
      {
        // config.catalogos en el seed: Admin y Secretaria
        key: "secciones",
        href: "/dashboard/secciones",
        roles: [1, 4],
        icon: (
          <Icon>
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5z" />
            <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
          </Icon>
        ),
      },
      {
        // Listado de docentes para quienes asignan carga o gestionan usuarios
        key: "docentes",
        href: "/dashboard/docentes",
        roles: [1, 2, 4],
        icon: (
          <Icon>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </Icon>
        ),
      },
      {
        // Solo rol 5 (Docente): la accion liga el perfil al id_usuario de la sesion
        key: "miPerfilDocente",
        href: "/dashboard/docentes/completar-perfil",
        roles: [5],
        icon: (
          <Icon>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </Icon>
        ),
      },
      {
        // config.carga en el seed: Admin, Director y Secretaria
        key: "cargas",
        href: "/dashboard/cargas",
        roles: [1, 2, 4],
        icon: (
          <Icon>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <path d="m9 14 2 2 4-4" />
          </Icon>
        ),
      },
      {
        key: "estudiantes",
        href: "/dashboard/estudiantes",
        roles: [1, 2, 3, 4],
        icon: (
          <Icon>
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
            <path d="M16 4a3.5 3.5 0 0 1 0 7M18.5 15.5c1.6.7 2.7 2.2 3 4.5" />
          </Icon>
        ),
      },
      {
        key: "matriculas",
        href: "/dashboard/matriculas",
        roles: [1, 2, 3, 4],
        icon: (
          <Icon>
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h4" />
          </Icon>
        ),
      },
    ],
  },
  {
    key: "evaluacion",
    items: [
      {
        key: "notas",
        href: "/dashboard/notas",
        roles: [1, 2, 3, 5],
        icon: (
          <Icon>
            <path d="M17 3.5 20.5 7 9 18.5 4.5 20l1.5-4.5L17 3.5z" />
          </Icon>
        ),
      },
      {
        // config.ciclos en el seed: Admin y Director
        key: "periodos",
        href: "/dashboard/periodos",
        roles: [1, 2],
        icon: (
          <Icon>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </Icon>
        ),
      },
      {
        key: "boletas",
        href: "/dashboard/boletas",
        roles: [1, 2, 3, 4, 5],
        icon: (
          <Icon>
            <path d="M6 3h9l4 4v14H6V3z" />
            <path d="M15 3v4h4M10 13l1.8 1.8L15.5 11" />
          </Icon>
        ),
      },
    ],
  },
  {
    key: "asistencia",
    items: [
      {
        key: "paseLista",
        href: "/dashboard/pase-lista",
        roles: [1, 2, 3, 5],
        icon: (
          <Icon>
            <path d="M4 6h2M4 12h2M4 18h2M10 6h10M10 12h10M10 18h6" />
          </Icon>
        ),
      },
      {
        key: "resumenAsistencia",
        href: "/dashboard/asistencia",
        roles: [1, 2, 3, 5],
        icon: (
          <Icon>
            <path d="M4 20V10M10 20V4M16 20v-8M21 20H3" />
          </Icon>
        ),
      },
    ],
  },
  {
    key: "disciplina",
    items: [
      {
        key: "incidencias",
        href: "/dashboard/incidencias",
        roles: [1, 2, 3, 5],
        icon: (
          <Icon>
            <path d="M12 3 2.5 20h19L12 3z" />
            <path d="M12 10v4M12 17.5v.5" />
          </Icon>
        ),
      },
      {
        key: "citaciones",
        href: "/dashboard/citaciones",
        roles: [1, 2, 3],
        icon: (
          <Icon>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </Icon>
        ),
      },
    ],
  },
  {
    key: "comunicacion",
    items: [
      {
        key: "notificaciones",
        href: "/dashboard/notificaciones",
        roles: [1, 3, 4],
        icon: (
          <Icon>
            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
            <path d="M10 19a2 2 0 0 0 4 0" />
          </Icon>
        ),
      },
      {
        key: "tutores",
        href: "/dashboard/tutores",
        roles: [1, 3, 4],
        icon: (
          <Icon>
            <circle cx="12" cy="7.5" r="3.5" />
            <path d="M5 20c.9-3.5 3.7-5.5 7-5.5s6.1 2 7 5.5" />
          </Icon>
        ),
      },
    ],
  },
  {
    key: "reportes",
    items: [
      {
        key: "reportes",
        href: "/dashboard/reportes",
        roles: [1, 2, 3, 4],
        icon: (
          <Icon>
            <path d="M12 3v10l4-3" />
            <path d="M20 8v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8" />
          </Icon>
        ),
      },
    ],
  },
  {
    key: "administracion",
    items: [
      {
        key: "usuarios",
        href: "/dashboard/usuarios",
        roles: [1],
        icon: (
          <Icon>
            <circle cx="10" cy="8" r="3.5" />
            <path d="M3.5 20c.8-3.2 3.4-5 6.5-5 1.5 0 2.9.4 4 1.2" />
            <path d="M17 15v6M14 18h6" />
          </Icon>
        ),
      },
      {
        key: "rolesPermisos",
        href: "/dashboard/roles",
        roles: [1],
        icon: (
          <Icon>
            <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
            <circle cx="12" cy="11" r="2" />
            <path d="M12 13v3" />
          </Icon>
        ),
      },
      {
        // auditoria.ver en el seed: Admin y Director
        key: "auditoria",
        href: "/dashboard/auditoria",
        roles: [1, 2],
        icon: (
          <Icon>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" />
          </Icon>
        ),
      },
    ],
  },
];

function MenuEntry({ item, active }: { item: MenuItem; active: boolean }) {
  const t = useTranslations("menu.items");
  const base =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors";

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${base} ${
        active
          ? "bg-intess text-white"
          : "text-slate-600 hover:bg-intess-light hover:text-intess dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-intess-accent"
      }`}
    >
      {item.icon}
      <span className="flex-1 truncate text-left">{t(item.key)}</span>
    </Link>
  );
}

function MenuContent({ rol }: { rol: number }) {
  const t = useTranslations("menu");
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 p-4">
      {SECTIONS.map((section) => {
        const visible = section.items.filter((i) => i.roles.includes(rol));
        if (visible.length === 0) return null;
        return (
          <div key={section.key}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t(`sections.${section.key}`)}
            </p>
            <ul className="space-y-0.5">
              {visible.map((item) => (
                <li key={item.key}>
                  <MenuEntry
                    item={item}
                    active={
                      item.href === "/dashboard"
                        ? pathname === item.href
                        : pathname.startsWith(item.href)
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ rol }: { rol: number }) {
  const t = useTranslations("menu");
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:block">
        <MenuContent rol={rol} />
      </aside>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-intess text-white shadow-lg lg:hidden"
      >
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" {...stroke}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-end px-4 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" {...stroke}>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div onClick={() => setOpen(false)}>
              <MenuContent rol={rol} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
