import { put, del } from '@vercel/blob';

/**Tipos y tamano aceptados para fotos (expediente) e imagenes de evidencia */
export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGEN_BYTES = 2 * 1024 * 1024;

export type ErrorImagen = 'tipoNoPermitido' | 'imagenMuyGrande' | 'archivoVacio';

/**
 * Valida un File antes de subirlo. Pura (sin red) para poder probarla; el
 * caller traduce la clave devuelta.
 */
export function validarImagen(file: { type: string; size: number } | null | undefined): ErrorImagen | null {
  if (!file || file.size === 0) return 'archivoVacio';
  if (!(TIPOS_IMAGEN as readonly string[]).includes(file.type)) return 'tipoNoPermitido';
  if (file.size > MAX_IMAGEN_BYTES) return 'imagenMuyGrande';
  return null;
}

export function almacenamientoConfigurado(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Gap 2: en Vercel no hay disco persistente, asi que fotos y evidencias van a
 * Vercel Blob y en la BD se guarda la URL. `carpeta` agrupa por modulo
 * (estudiantes/, evidencias/...). Lanza si BLOB_READ_WRITE_TOKEN no esta.
 */
export async function subirImagen(file: File, carpeta: string, nombreBase: string): Promise<string> {
  if (!almacenamientoConfigurado()) throw new Error('BLOB_NO_CONFIGURADO');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const { url } = await put(`${carpeta}/${nombreBase}.${ext}`, file, {
    access: 'public',
    addRandomSuffix: true,
    contentType: file.type,
  });
  return url;
}

/**Borra la imagen anterior; los fallos no bloquean (la nueva URL ya esta en BD) */
export async function borrarImagen(url: string | null | undefined): Promise<void> {
  if (!url || !almacenamientoConfigurado()) return;
  try {
    await del(url);
  } catch (error) {
    console.warn('No se pudo borrar la imagen anterior:', error);
  }
}
