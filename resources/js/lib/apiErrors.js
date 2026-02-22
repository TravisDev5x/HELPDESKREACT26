/**
 * Helpers para manejo de errores de API.
 * Compatible con respuestas Laravel (message, errors.root, errors.campo).
 */

/**
 * Si el error es de autenticación (401) o sesión caducada (419),
 * redirige a login y devuelve true. El interceptor de axios también
 * dispara "navigate-to-login"; esta función unifica el fallback con
 * window.location para garantizar redirección.
 * @param {unknown} error - Error de axios (error.response?.status)
 * @returns {boolean} true si se manejó como auth error (redirigir), false si no
 */
export function handleAuthError(error) {
    const status = error?.response?.status;
    if (status === 401 || status === 419) {
        window.location.href = "/login";
        return true;
    }
    return false;
}

/**
 * Obtiene un mensaje de error amigable para mostrar al usuario.
 * Prioridad: message del servidor, errors.root, primer error de validación, fallback.
 * @param {unknown} error - Error de axios
 * @param {string} [fallback] - Mensaje por defecto si no hay detalle
 * @returns {string}
 */
export function getApiErrorMessage(error, fallback = "Ha ocurrido un error. Intenta de nuevo.") {
    if (!error || typeof error !== "object") return fallback;
    const data = error.response?.data;
    if (!data) return error.message || fallback;
    if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
    const root = data.errors?.root;
    if (Array.isArray(root) && root[0]) return String(root[0]);
    if (typeof root === "string" && root.trim()) return root.trim();
    const firstKey = data.errors && typeof data.errors === "object" && Object.keys(data.errors).find((k) => k !== "root");
    if (firstKey && Array.isArray(data.errors[firstKey]) && data.errors[firstKey][0]) return String(data.errors[firstKey][0]);
    return fallback;
}
