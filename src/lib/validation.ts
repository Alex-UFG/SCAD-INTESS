/**Formatos comunes de El Salvador y de columnas DATE, compartidos entre schemas */
export const DUI_REGEX = /^\d{8}-\d$/;
export const TELEFONO_REGEX = /^\d{4}-\d{4}$/;
// Lo que produce <input type="date"> y lo unico que acepta una columna DATE de MySQL
export const FECHA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
