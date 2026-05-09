/**
 * Extrae el mensaje de error de una respuesta del servidor
 * Maneja diferentes formatos de respuesta de error (FastAPI, Next.js, etc)
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();

    // FastAPI format: "detail"
    if (data.detail) {
      if (typeof data.detail === "string") {
        return data.detail;
      } else if (Array.isArray(data.detail) && data.detail.length > 0) {
        // Si es un array de errores de validación
        return data.detail[0].msg || "Error de validación";
      }
    }

    // Next.js format: "error"
    if (data.error) {
      return typeof data.error === "string" ? data.error : "Error desconocido";
    }

    // Formato genérico: "message"
    if (data.message) {
      return typeof data.message === "string" ? data.message : "Error desconocido";
    }

    // Si el status es 422, es probablemente un error de validación
    if (response.status === 422 && data.errors) {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        return data.errors.map((e: any) => e.msg || e.message).join(", ");
      }
    }

    // Fallback
    return "Error desconocido";
  } catch {
    return "Error al procesar la respuesta del servidor";
  }
}

/**
 * Maneja errores de fetch/red
 */
export function extractNetworkErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Error de conexión con el servidor. Verifica tu internet e inténtalo de nuevo.";
  }
  return "Error inesperado. Inténtalo de nuevo.";
}
