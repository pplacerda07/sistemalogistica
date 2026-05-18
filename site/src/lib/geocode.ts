import type { GeocodeResponse } from './types'

const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'LogisticaApp/1.0 (contato@logistica.com)'

// Simple in-memory rate limiter (1 request per second per Node instance)
let lastRequestTime = 0

async function waitForRateLimit() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

export interface StructuredAddress {
  logradouro: string
  numero?: string
  bairro?: string
  cidade: string
  estado: string
}

async function nominatimSearch(params: URLSearchParams): Promise<GeocodeResponse | null> {
  await waitForRateLimit()

  const res = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
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

/**
 * Structured geocoding — Nominatim's recommended path for accuracy.
 * Falls back to free-text query if the structured search returns nothing.
 */
export async function geocodeStructured(addr: StructuredAddress): Promise<GeocodeResponse | null> {
  const street = addr.numero ? `${addr.numero} ${addr.logradouro}` : addr.logradouro

  const params = new URLSearchParams({
    street,
    city: addr.cidade,
    state: addr.estado,
    country: 'Brazil',
    format: 'json',
    limit: '1',
    addressdetails: '1',
  })

  const result = await nominatimSearch(params)
  if (result) return result

  // Fallback: build a free-text query (covers cases where Nominatim's structured
  // matcher misses a street that exists in their free-form index).
  const freeText = [addr.logradouro, addr.numero, addr.bairro, addr.cidade, addr.estado, 'Brasil']
    .filter(Boolean)
    .join(', ')

  return geocodeAddress(freeText)
}

/**
 * Free-text geocoding — kept for backward compatibility and as fallback.
 */
export async function geocodeAddress(endereco: string): Promise<GeocodeResponse | null> {
  const params = new URLSearchParams({
    q: endereco,
    format: 'json',
    limit: '1',
    countrycodes: 'br',
  })

  return nominatimSearch(params)
}
