import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import es from "../../../messages/es.json";
import en from "../../../messages/en.json";

type Arbol = { [k: string]: string | Arbol };

function claves(obj: Arbol, prefijo = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "string" ? [`${prefijo}${k}`] : claves(v, `${prefijo}${k}.`)
  );
}

function existe(obj: Arbol, ruta: string): boolean {
  let actual: string | Arbol | undefined = obj;
  for (const p of ruta.split(".")) {
    if (typeof actual !== "object" || !(p in actual)) return false;
    actual = actual[p];
  }
  return actual !== undefined;
}

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) return n === "__tests__" ? [] : archivos(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

/**
 * Claves estaticas usadas en paginas y componentes: t('clave') donde t viene de
 * getTranslations('ns') / useTranslations('ns'), incluido el patron
 * `const [t, tOtro, ...] = await Promise.all([getTranslations('a'), ...])`.
 * Las claves dinamicas (template literals) no se pueden verificar aqui.
 */
function clavesUsadas(archivo: string): { var: string; ns: string; clave: string }[] {
  const src = readFileSync(archivo, "utf8");
  const ligaduras = new Map<string, string>();

  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:getTranslations|useTranslations)\(\s*['"]([\w.]+)['"]\s*\)/g)) {
    ligaduras.set(m[1], m[2]);
  }
  for (const m of src.matchAll(/\[\s*([\w\s,]+?)\s*\]\s*=\s*await\s+Promise\.all\(\[([\s\S]*?)\]\)/g)) {
    const nombres = m[1].split(",").map((s) => s.trim());
    const items = m[2].split(/,(?![^()]*\))/).map((s) => s.trim()).filter(Boolean);
    nombres.forEach((n, i) => {
      const ns = items[i]?.match(/^getTranslations\(\s*['"]([\w.]+)['"]\s*\)$/)?.[1];
      if (ns) ligaduras.set(n, ns);
    });
  }

  const usos: { var: string; ns: string; clave: string }[] = [];
  for (const [v, ns] of ligaduras) {
    for (const m of src.matchAll(new RegExp(`\\b${v}\\(\\s*['"]([\\w.]+)['"]`, "g"))) {
      usos.push({ var: v, ns, clave: `${ns}.${m[1]}` });
    }
  }
  return usos;
}

describe("mensajes i18n", () => {
  it("es.json y en.json tienen exactamente las mismas claves", () => {
    const a = new Set(claves(es as Arbol));
    const b = new Set(claves(en as Arbol));
    expect([...a].filter((k) => !b.has(k))).toEqual([]);
    expect([...b].filter((k) => !a.has(k))).toEqual([]);
  });

  it("toda clave estatica usada en paginas y componentes existe en es.json", () => {
    const raiz = path.resolve(__dirname, "../..");
    const faltantes = [...archivos(path.join(raiz, "app")), ...archivos(path.join(raiz, "components"))]
      .flatMap((f) => clavesUsadas(f).map((u) => ({ ...u, archivo: path.relative(raiz, f) })))
      .filter((u) => !existe(es as Arbol, u.clave))
      .map((u) => `${u.archivo}: ${u.clave}`);
    expect(faltantes).toEqual([]);
  });
});
