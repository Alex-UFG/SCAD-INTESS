"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // React 19 avisa al renderizar <script> en el cliente. El script de next-themes
      // solo debe ejecutarse desde el HTML del servidor; en el cliente se marca como
      // no ejecutable para evitar la advertencia (next-themes ya suprime la hidratación).
      scriptProps={typeof window === "undefined" ? undefined : { type: "application/json" }}
    >
      {children}
    </ThemeProvider>
  );
}
