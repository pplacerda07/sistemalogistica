import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Plus, Calendar, Clock, Route as RouteIcon } from 'lucide-react'
import Link from 'next/link'

export default async function RotasPage() {
  const supabase = await createClient()

  const { data: rotas } = await supabase
    .from('rotas')
    .select('*, paradas(count)')
    .order('data', { ascending: false })

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

  function formatDuration(seconds: number | null) {
    if (!seconds) return '-'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  function formatDistance(meters: number | null) {
    if (!meters) return '-'
    return meters >= 1000
      ? `${(meters / 1000).toFixed(1)} km`
      : `${meters} m`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rotas</h1>
          <p className="text-gray-400 text-sm mt-1">
            Histórico e gerenciamento de rotas
          </p>
        </div>
        <Link href="/rotas/nova">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25">
            <Plus className="w-4 h-4 mr-2" />
            Nova Rota
          </Button>
        </Link>
      </div>

      {rotas && rotas.length > 0 ? (
        <div className="space-y-3">
          {rotas.map((rota) => (
            <Link key={rota.id} href={`/rotas/${rota.id}`}>
              <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-white/15 transition-all duration-200 cursor-pointer mb-3">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
                        <RouteIcon className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold">
                            {rota.origem_texto}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(rota.data).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(rota.duracao_total_s)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {formatDistance(rota.distancia_total_m)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[rota.status]}
                    >
                      {statusLabels[rota.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <RouteIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Nenhuma rota criada ainda</p>
          <p className="text-gray-500 text-sm mt-1">
            Comece cadastrando clientes e criando sua primeira rota
          </p>
          <Link href="/rotas/nova" className="mt-4 inline-block">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500">
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira rota
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
