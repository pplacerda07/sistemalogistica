import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Navigation, Phone, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import RotaDetailMap from './rota-map'

export default async function RotaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rota } = await supabase
    .from('rotas')
    .select('*')
    .eq('id', id)
    .single()

  if (!rota) notFound()

  const { data: paradas } = await supabase
    .from('paradas')
    .select('*, clientes(*)')
    .eq('rota_id', id)
    .order('ordem', { ascending: true })

  const statusColors: Record<string, string> = {
    planejada: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    em_andamento: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    concluida: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }

  const statusLabels: Record<string, string> = {
    planejada: 'Planejada',
    em_andamento: 'Em andamento',
    concluida: 'Concluída',
  }

  const paradaStatusColors: Record<string, string> = {
    pendente: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    concluida: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pulada: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return '-'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  // Build map points from paradas
  const mapPoints = paradas
    ? paradas
        .filter((p) => p.clientes?.location)
        .map((p, idx) => {
          const loc = p.clientes.location as { coordinates?: number[] }
          return {
            lat: loc.coordinates?.[1] ?? 0,
            lng: loc.coordinates?.[0] ?? 0,
            label: `${idx + 1}. ${p.clientes.nome}`,
          }
        })
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rotas">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Detalhes da Rota</h1>
            <Badge variant="outline" className={statusColors[rota.status]}>
              {statusLabels[rota.status]}
            </Badge>
          </div>
          <p className="text-gray-400 text-sm mt-1">{rota.origem_texto}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-gray-400">Duração</p>
              <p className="text-white font-semibold">
                {formatDuration(rota.duracao_total_s)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Navigation className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-gray-400">Distância</p>
              <p className="text-white font-semibold">
                {rota.distancia_total_m
                  ? `${(rota.distancia_total_m / 1000).toFixed(1)} km`
                  : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs text-gray-400">Paradas</p>
              <p className="text-white font-semibold">{paradas?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <RotaDetailMap points={mapPoints} polyline={rota.polyline} />

      {/* Stops list */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base">
            Paradas na ordem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {paradas?.map((parada, idx) => (
            <div
              key={parada.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {parada.clientes?.nome}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {parada.clientes?.endereco_texto}
                </p>
              </div>
              {parada.clientes?.telefone && (
                <a
                  href={`tel:${parada.clientes.telefone}`}
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              <Badge
                variant="outline"
                className={paradaStatusColors[parada.status]}
              >
                {parada.status === 'concluida'
                  ? 'Concluída'
                  : parada.status === 'pulada'
                  ? 'Pulada'
                  : 'Pendente'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
