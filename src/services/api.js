const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '').replace(/\/api$/, '')
const TOKEN_KEY = 'venus_token'

export const apiConfig = {
  baseUrl: apiUrl,
  isConfigured: Boolean(apiUrl),
}

function getErrorMessage(error) {
  if (error instanceof TypeError) {
    return 'No se pudo contactar al servidor. Comprueba que el backend esté disponible.'
  }
  return error.message || 'Ocurrió un error inesperado.'
}

async function request(path, options = {}) {
  if (!apiUrl) {
    throw new Error('VITE_API_URL no está configurada.')
  }

  try {
    const response = await fetch(`${apiUrl}${path}`, options)
    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error(body.error || 'La solicitud no pudo completarse.')
      error.status = response.status
      throw error
    }

    return body
  } catch (error) {
    if (error.status) throw error
    throw new Error(getErrorMessage(error))
  }
}

export async function login(identifier, password) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
}

export async function getCurrentUser(token) {
  return request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

async function adminMutation(path, token, body) {
  return request(`/api/admin${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
}

async function adminRequest(path, token) {
  return request(`/api/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

function queryString(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export function getAdminSummary(token) {
  return adminRequest('/summary', token)
}

export function getAdminUsers(token, params) {
  return adminRequest(`/users${queryString(params)}`, token)
}

export function getAdminUser(token, userId) {
  return adminRequest(`/users/${encodeURIComponent(userId)}`, token)
}

export function updateAdminUserRole(token, userId, role) {
  return adminMutation(`/users/${encodeURIComponent(userId)}/role`, token, { role })
}

export function requestAdminPasswordReset(token, userId) {
  return request(`/api/admin/users/${encodeURIComponent(userId)}/password-reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function completePasswordReset(token, newPassword, confirmation) {
  return request('/api/auth/password-reset/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, confirmation }),
  })
}

export function getAdminCatalog(token, params) {
  return adminRequest(`/catalog${queryString(params)}`, token)
}

export function getAdminMedia(token, params) {
  return adminRequest(`/media${queryString(params)}`, token)
}

export function updateMediaTitle(token, mediaId, displayTitle) {
  return request(`/api/admin/media/${encodeURIComponent(mediaId)}/title`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ displayTitle }),
  })
}

export function deleteMedia(token, mediaId) {
  return request(`/api/admin/media/${encodeURIComponent(mediaId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getAdminActivity(token, params) {
  return adminRequest(`/activity${queryString(params)}`, token)
}

// User-facing media APIs
export function checkMediaAvailability(token, tmdbId) {
  return request(`/api/media/check/${encodeURIComponent(tmdbId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getMediaLibrary(token) {
  return request('/api/media/library', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function listMedia(token) {
  return request('/api/media', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getMediaInfo(token, mediaId) {
  return request(`/api/media/${encodeURIComponent(mediaId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getImportableFiles(token) {
  return request('/api/media/import/files', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function importServerMedia(token, items) {
  return request('/api/media/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(Array.isArray(items) ? { items } : items),
  })
}

export function getStreamUrl(mediaId, token) {
  if (!apiUrl) return ''
  let url = `${apiUrl}/api/media/${encodeURIComponent(mediaId)}/stream`
  if (token) {
    url += `?token=${encodeURIComponent(token)}`
  }
  return url
}

export function uploadMediaFile(token, { file, tmdbId, mediaType = 'movie', displayTitle }, onProgress) {
  return new Promise((resolve, reject) => {
    if (!apiUrl) {
      reject(new Error('VITE_API_URL no está configurada.'))
      return
    }

    const xhr = new XMLHttpRequest()
    const formData = new FormData()

    formData.append('file', file)
    if (tmdbId) formData.append('tmdbId', String(tmdbId))
    if (mediaType) formData.append('mediaType', String(mediaType))
    if (displayTitle) formData.append('displayTitle', String(displayTitle))

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText || '{}')
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(response)
        } else {
          const error = new Error(response.error || 'No se pudo completar la carga del archivo.')
          error.status = xhr.status
          reject(error)
        }
      } catch (e) {
        reject(new Error('Respuesta del servidor no válida.'))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Error de red al intentar subir el archivo.'))
    }

    xhr.open('POST', `${apiUrl}/api/media/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })
}

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function storeToken(token) {
  if (typeof token !== 'string' || !token) {
    throw new Error('El servidor no devolvió un token válido.')
  }
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}