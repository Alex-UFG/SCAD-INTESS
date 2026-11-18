import { describe, it, expect } from "vitest";
import { validarImagen, validarEvidencia, MAX_IMAGEN_BYTES, MAX_EVIDENCIA_BYTES } from "@/lib/blob";

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

describe("validarEvidencia", () => {
  it("acepta las imagenes y ademas PDF, hasta 2 MB", () => {
    expect(validarEvidencia({ type: "application/pdf", size: MAX_EVIDENCIA_BYTES })).toBeNull();
    expect(validarEvidencia({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validarEvidencia({ type: "image/webp", size: 10 })).toBeNull();
  });

  it("rechaza vacio, tipo no permitido y tamano excedido", () => {
    expect(validarEvidencia(undefined)).toBe("archivoVacio");
    expect(validarEvidencia({ type: "application/pdf", size: 0 })).toBe("archivoVacio");
    expect(validarEvidencia({ type: "application/msword", size: 10 })).toBe("tipoNoPermitido");
    expect(validarEvidencia({ type: "video/mp4", size: 10 })).toBe("tipoNoPermitido");
    expect(validarEvidencia({ type: "application/pdf", size: MAX_EVIDENCIA_BYTES + 1 })).toBe("archivoMuyGrande");
  });
});
