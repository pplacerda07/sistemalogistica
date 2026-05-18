import { NextResponse } from 'next/server'
import { geocodeAddress, geocodeStructured } from '@/lib/geocode'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Structured mode: { logradouro, numero?, bairro?, cidade, estado }
    if (body.logradouro && body.cidade && body.estado) {
      const result = await geocodeStructured({
        logradouro: body.logradouro,
        numero: body.numero,
        bairro: body.bairro,
        cidade: body.cidade,
        estado: body.estado,
      })

      if (!result) {
        return NextResponse.json(
          { error: 'Endereço não encontrado' },
          { status: 404 }
        )
      }
      return NextResponse.json(result)
    }

    // Free-text mode: { endereco }
    if (typeof body.endereco === 'string' && body.endereco.trim()) {
      const result = await geocodeAddress(body.endereco)
      if (!result) {
        return NextResponse.json(
          { error: 'Endereço não encontrado' },
          { status: 404 }
        )
      }
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Forneça { logradouro, cidade, estado } ou { endereco }' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Geocode error:', error)
    return NextResponse.json(
      { error: 'Erro ao geocodificar endereço' },
      { status: 500 }
    )
  }
}
