const STATUS_MESSAGES: Record<number, string> = {
  400: 'Solicitud inválida',
  401: 'No autorizado. Revisa tus credenciales.',
  403: 'Acceso denegado',
  404: 'Recurso no encontrado',
  409: 'Conflicto: el recurso ya existe',
  413: 'El archivo es demasiado grande',
  422: 'Error de validación',
  429: 'Demasiadas solicitudes. Espera un momento.',
  500: 'Error interno del servidor',
  502: 'El servidor no está disponible temporalmente',
  503: 'Servicio no disponible',
};

export async function extractErrorMessage(response: Response): Promise<string> {
  const statusText = STATUS_MESSAGES[response.status] || `Error ${response.status}`;

  try {
    const text = await response.text();
    if (!text) return statusText;

    const data = JSON.parse(text);

    if (data.detail) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail)) {
        const msgs = data.detail.map((e: any) => e?.msg || e?.message || JSON.stringify(e)).filter(Boolean);
        if (msgs.length > 0) return msgs.join('; ');
        return statusText;
      }
      if (typeof data.detail === 'object') return JSON.stringify(data.detail);
    }

    if (data.error) {
      if (typeof data.error === 'string') return data.error;
      if (Array.isArray(data.error)) return data.error.join('; ');
      if (typeof data.error === 'object' && data.error?.message) return data.error.message;
      return statusText;
    }

    if (data.message) {
      if (typeof data.message === 'string') return data.message;
      if (Array.isArray(data.message)) return data.message.join('; ');
    }

    if (data.errors) {
      if (Array.isArray(data.errors)) {
        return data.errors.map((e: any) => e?.msg || e?.message || JSON.stringify(e)).join('; ');
      }
      if (typeof data.errors === 'object') {
        return Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join('; ');
      }
    }

    return statusText;
  } catch {
    return statusText;
  }
}

export function extractNetworkErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Error de conexión con el servidor. Verifica tu internet e inténtalo de nuevo.';
    }
    return `Error de red: ${error.message}`;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'La solicitud tardó demasiado y fue cancelada. Inténtalo de nuevo.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Error inesperado. Inténtalo de nuevo.';
}
