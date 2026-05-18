import type { GeocodeResponse } from './types'

const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'LogisticaApp/1.0 (contato@logistica.com)'

// Simple in-memory rate limiter (1 request per second)
let lastRequestTime = 0

async function waitForRateLimit() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

export async function geocodeAddress(endereco: string): Promise<GeocodeResponse | null> {
  await waitForRateLimit()

  const params = new URLSearchParams({
    q: endereco,
    format: 'json',
    limit: '1',
    countrycodes: 'br',
  })

  const res = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  })

  if (!res.ok) {
    console.error(`Nominatim error: ${res.status}`)
    return null
  }

  const data = await res.json()
  if (!data || data.length === 0) return null

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display_name: data[0].display_name,
  }
}
