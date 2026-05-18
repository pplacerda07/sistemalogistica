const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'

export interface OSRMRouteResult {
  distance: number      // meters
  duration: number      // seconds
  geometry: string      // encoded polyline
}

/**
 * Fetch NxN duration matrix from OSRM /table endpoint
 */
export async function fetchDurationMatrix(
  points: { lat: number; lng: number }[]
): Promise<number[][]> {
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';')
  const url = `${OSRM_BASE_URL}/table/v1/driving/${coords}?annotations=duration`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM table failed: ${res.status}`)

  const data = await res.json()
  if (data.code !== 'Ok') throw new Error(`OSRM table error: ${data.code}`)

  return data.durations
}

/**
 * Fetch route from OSRM /route endpoint (in given order)
 */
export async function fetchRoute(
  points: { lat: number; lng: number }[]
): Promise<OSRMRouteResult> {
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';')
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=polyline`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`)

  const data = await res.json()
  if (data.code !== 'Ok') throw new Error(`OSRM route error: ${data.code}`)

  const route = data.routes[0]
  return {
    distance: Math.round(route.distance),
    duration: Math.round(route.duration),
    geometry: route.geometry,
  }
}
