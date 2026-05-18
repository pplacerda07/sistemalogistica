import { NextResponse } from 'next/server'
import { geocodeAddress } from '@/lib/geocode'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { endereco } = body

    if (!endereco || typeof endereco !== 'string') {
      return NextResponse.json(
        { error: 'Endereço é obrigatório' },
        { status: 400 }
      )
    }

    const result = await geocodeAddress(endereco)

    if (!result) {
      return NextResponse.json(
        { error: 'Endereço não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Geocode error:', error)
    return NextResponse.json(
      { error: 'Erro ao geocodificar endereço' },
      { status: 500 }
    )
  }
}
