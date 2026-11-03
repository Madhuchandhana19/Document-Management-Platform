const BASE_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : ''

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('accessToken')
  
  const headers = new Headers(options.headers || {})
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response | null = null
  const maxRetries = 3
  const delayMs = 200

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
      })
      if (response.status >= 502 && response.status <= 504 && attempt < maxRetries) {
        await new Promise(res => setTimeout(res, delayMs * attempt))
        continue
      }
      break
    } catch (fetchErr: any) {
      if (attempt < maxRetries) {
        await new Promise(res => setTimeout(res, delayMs * attempt))
      } else {
        throw new Error('Server temporarily unavailable. Please try again.')
      }
    }
  }

  if (!response) {
    throw new Error('Server temporarily unavailable. Please try again.')
  }

  if (response.status === 401) {
    // Session expired or invalid
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    sessionStorage.removeItem('currentPage')
    // Trigger redirect to login by dispatching event with expiration detail
    window.dispatchEvent(new CustomEvent('auth-expired', {
      detail: { message: 'Session expired. Please log in again.' }
    }))
  }

  if (response.status === 204) {
    return { success: true, message: 'No content', data: null as unknown as T, timestamp: '' }
  }

  const text = await response.text()
  let result: any = {}
  if (text) {
    try {
      result = JSON.parse(text)
    } catch (e) {
      result = { message: text }
    }
  }
  if (!response.ok) {
    throw new Error(result.message || 'Something went wrong')
  }

  // Wrap raw responses inside ApiResponse envelope to keep the frontend pages happy
  if (result && typeof result === 'object' && !('success' in result)) {
    return {
      success: true,
      message: 'Operation successful',
      data: result,
      timestamp: new Date().toISOString()
    } as unknown as ApiResponse<T>
  }

  return result
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postMultipart: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: 'POST',
      body: formData,
    }),
}
