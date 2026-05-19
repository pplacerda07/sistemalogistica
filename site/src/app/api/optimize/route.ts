import { NextResponse } from 'next/server'
import { optimizeRoute } from '@/lib/optimizer'
import type { OptimizeRequest } from '@/lib/types'

// Allow up to 30s on Vercel — OSRM público can take 5–10s on cold matrix calls.
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const body: OptimizeRequest = await request.json()

    if (!body.origem || !body.clientes || !Array.isArray(body.clientes)) {
      return NextResponse.json(
        { error: 'Origem e clientes são obrigatórios' },
        { status: 400 }
      )
    }

    if (body.clientes.length > 10) {
      return NextResponse.json(
        { error: 'Máximo de 10 clientes por rota' },
        { status: 400 }
      )
    }

    if (body.clientes.length < 1) {
      return NextResponse.json(
        { error: 'Selecione pelo menos 1 cliente' },
        { status: 400 }
      )
    }

    const origemPoint = {
      id: 'origem',
      lat: body.origem.lat,
      lng: body.origem.lng,
    }

    const result = await optimizeRoute(origemPoint, body.clientes)

    return NextResponse.json({
      ordem: result.clienteIdsOrdenados,
      duracaoTotalSegundos: result.duracaoTotalSegundos,
      distanciaTotalMetros: result.distanciaTotalMetros,
      polyline: result.polyline,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Optimize error:', msg, error)
    return NextResponse.json(
      { error: `Erro ao otimizar: ${msg}` },
      { status: 500 }
    )
  }
}
