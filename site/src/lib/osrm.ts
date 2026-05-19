const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'

export interface OSRMRouteResult {
  distance: number      // meters
  duration: number      // seconds
  geometry: string      // encoded polyline
}

async function osrmFetch(url: string, label: string) {
  // 25s timeout so we stay under Vercel's 30s function limit.
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 25_000)

  let res: Response
  try {
    res = await fetch(url, { signal: ctrl.signal })
  } catch (err) {
    clearTimeout(t)
    const e = err as Error
    if (e.name === 'AbortError') {
      throw new Error(`OSRM ${label} timeout (>25s) — serviço público lento ou indisponível`)
    }
    throw new Error(`OSRM ${label} network error: ${e.message}`)
  }
  clearTimeout(t)

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`OSRM ${label} ${res.status}: ${text.slice(0, 200)}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`OSRM ${label} returned non-JSON: ${text.slice(0, 200)}`)
  }
}

function validatePoints(points: { lat: number; lng: number }[], label: string) {
  points.forEach((p, i) => {
    if (
      typeof p.lat !== 'number' ||
      typeof p.lng !== 'number' ||
      !Number.isFinite(p.lat) ||
      !Number.isFinite(p.lng) ||
      Math.abs(p.lat) > 90 ||
      Math.abs(p.lng) > 180
    ) {
      throw new Error(
        `${label}: ponto ${i} com coordenada inválida (lat=${p.lat}, lng=${p.lng}). ` +
          'Verifique se o cliente foi geocodificado corretamente.'
      )
    }
  })
}

/**
 * Fetch NxN duration matrix from OSRM /table endpoint
 */
export async function fetchDurationMatrix(
  points: { lat: number; lng: number }[]
): Promise<number[][]> {
  validatePoints(points, 'fetchDurationMatrix')
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const url = `${OSRM_BASE_URL}/table/v1/driving/${coords}?annotations=duration`
  console.log('[osrm] table url:', url)

  const data = await osrmFetch(url, 'table')
  if (data.code !== 'Ok') {
    throw new Error(`OSRM table error: ${data.code} ${data.message ?? ''}`.trim())
  }

  return data.durations
}

/**
 * Fetch route from OSRM /route endpoint (in given order)
 */
export async function fetchRoute(
  points: { lat: number; lng: number }[]
): Promise<OSRMRouteResult> {
  validatePoints(points, 'fetchRoute')
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=polyline`
  console.log('[osrm] route url:', url)

  const data = await osrmFetch(url, 'route')
  if (data.code !== 'Ok') {
    throw new Error(`OSRM route error: ${data.code} ${data.message ?? ''}`.trim())
  }

  const route = data.routes[0]
  return {
    distance: Math.round(route.distance),
    duration: Math.round(route.duration),
    geometry: route.geometry,
  }
}
