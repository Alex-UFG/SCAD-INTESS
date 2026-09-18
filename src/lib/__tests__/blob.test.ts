import { describe, it, expect } from "vitest";
import { validarImagen, MAX_IMAGEN_BYTES } from "@/lib/blob";

describe("validarImagen", () => {
  it("acepta jpeg/png/webp hasta 2 MB", () => {
    expect(validarImagen({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validarImagen({ type: "image/png", size: MAX_IMAGEN_BYTES })).toBeNull();
    expect(validarImagen({ type: "image/webp", size: 10 })).toBeNull();
  });

  it("rechaza vacio, tipo no permitido y tamano excedido", () => {
    expect(validarImagen(null)).toBe("archivoVacio");
    expect(validarImagen({ type: "image/jpeg", size: 0 })).toBe("archivoVacio");
    expect(validarImagen({ type: "application/pdf", size: 10 })).toBe("tipoNoPermitido");
    expect(validarImagen({ type: "image/gif", size: 10 })).toBe("tipoNoPermitido");
    expect(validarImagen({ type: "image/jpeg", size: MAX_IMAGEN_BYTES + 1 })).toBe("imagenMuyGrande");
  });
});
