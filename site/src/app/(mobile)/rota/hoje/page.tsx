import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Navigation, Route } from 'lucide-react'
import Link from 'next/link'

export default async function RotaHojePage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // Find today's route(s) - planejada or em_andamento
  const { data: rotas } = await supabase
    .from('rotas')
    .select('*')
    .eq('data', today)
    .in('status', ['planejada', 'em_andamento'])
    .order('created_at', { ascending: false })

  const rota = rotas && rotas.length > 0 ? rotas[0] : null

  if (!rota) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Route className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Sem rota para hoje</h2>
        <p className="text-gray-400 text-sm max-w-xs">
          Nenhuma rota foi planejada para hoje. Peça ao admin para criar uma
          nova rota.
        </p>
      </div>
    )
  }

  // Load stops for this route
  const { data: paradas } = await supabase
    .from('paradas')
    .select('*, clientes(*)')
    .eq('rota_id', rota.id)
    .order('ordem', { ascending: true })

  const totalParadas = paradas?.length ?? 0
  const concluidas = paradas?.filter((p) => p.status === 'concluida').length ?? 0
  const progress = totalParadas > 0 ? (concluidas / totalParadas) * 100 : 0

  function formatDuration(seconds: number | null) {
    if (!seconds) return '-'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Rota de Hoje</h2>
            <Badge
              variant="outline"
              className={
                rota.status === 'em_andamento'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }
            >
              {rota.status === 'em_andamento' ? 'Em andamento' : 'Planejada'}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progresso</span>
              <span>
                {concluidas}/{totalParadas} paradas
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(rota.duracao_total_s)}
            </span>
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5" />
              {rota.distancia_total_m
                ? `${(rota.distancia_total_m / 1000).toFixed(1)} km`
                : '-'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stops */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
          Paradas
        </h3>
        {paradas?.map((parada, idx) => {
          const cliente = parada.clientes
          const isDone = parada.status === 'concluida'
          const isSkipped = parada.status === 'pulada'
          let lat = 0,
            lng = 0
          if (cliente?.location && typeof cliente.location === 'object') {
            const loc = cliente.location as { coordinates?: number[] }
            if (loc.coordinates) {
              lng = loc.coordinates[0]
              lat = loc.coordinates[1]
            }
          }

          return (
            <Link key={parada.id} href={`/rota/${rota.id}?parada=${parada.id}`}>
              <Card
                className={`border transition-all duration-200 mb-3 ${
                  isDone
                    ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
                    : isSkipped
                    ? 'bg-amber-500/5 border-amber-500/20 opacity-60'
                    : 'bg-white/5 border-white/10 hover:bg-white/[0.07] active:scale-[0.98]'
                }`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                      isDone
                        ? 'bg-emerald-500'
                        : isSkipped
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                    }`}
                  >
                    {isDone ? '✓' : isSkipped ? '—' : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold text-base ${
                        isDone || isSkipped
                          ? 'text-gray-400 line-through'
                          : 'text-white'
                      }`}
                    >
                      {cliente?.nome}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {cliente?.endereco_texto}
                    </p>
                    {cliente?.telefone && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        📞 {cliente.telefone}
                      </p>
                    )}
                  </div>
                  {!isDone && !isSkipped && lat !== 0 && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors shrink-0"
                    >
                      <Navigation className="w-5 h-5" />
                    </a>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
