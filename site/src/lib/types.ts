export type Role = 'admin' | 'vendedor'

export interface Profile {
  id: string
  nome: string
  role: Role
  created_at: string
}

export interface Cliente {
  id: string
  owner_id: string
  nome: string
  telefone: string | null
  endereco_texto: string
  location: { lat: number; lng: number } | null
  observacoes: string | null
  ativo: boolean
  created_at: string
}

export type RotaStatus = 'planejada' | 'em_andamento' | 'concluida'

export interface Rota {
  id: string
  vendedor_id: string
  data: string
  origem_location: { lat: number; lng: number }
  origem_texto: string
  status: RotaStatus
  distancia_total_m: number | null
  duracao_total_s: number | null
  polyline: string | null
  created_at: string
}

export type ParadaStatus = 'pendente' | 'concluida' | 'pulada'

export interface Parada {
  id: string
  rota_id: string
  cliente_id: string
  ordem: number
  status: ParadaStatus
  visitada_em: string | null
  cliente?: Cliente
}

export interface Point {
  lat: number
  lng: number
  id: string
}

export interface OptimizeRequest {
  origem: { lat: number; lng: number }
  clientes: Point[]
}

export interface OptimizeResponse {
  ordem: string[]
  duracaoTotalSegundos: number
  distanciaTotalMetros: number
  polyline: string
}

export interface GeocodeResponse {
  lat: number
  lng: number
  display_name: string
}
