'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  MapPin,
  Navigation,
  Phone,
  CheckCircle,
  SkipForward,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

interface ParadaData {
  id: string
  rota_id: string
  cliente_id: string
  ordem: number
  status: string
  visitada_em: string | null
  clientes: {
    id: string
    nome: string
    telefone: string | null
    endereco_texto: string
    location: { coordinates?: number[] } | null
    observacoes: string | null
  }
}

export default function RotaDetailMobilePage() {
  const params = useParams()
  const rotaId = params.id as string
  const [paradas, setParadas] = useState<ParadaData[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClient()

  const loadParadas = useCallback(async () => {
    const { data } = await supabase
      .from('paradas')
      .select('*, clientes(*)')
      .eq('rota_id', rotaId)
      .order('ordem', { ascending: true })

    if (data) setParadas(data as unknown as ParadaData[])
    setLoading(false)
  }, [supabase, rotaId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadParadas()
  }, [loadParadas])

  async function updateParadaStatus(
    paradaId: string,
    status: 'concluida' | 'pulada'
  ) {
    setActionLoading(paradaId)
    try {
      const { error } = await supabase
        .from('paradas')
        .update({
          status,
          visitada_em: status === 'concluida' ? new Date().toISOString() : null,
        })
        .eq('id', paradaId)

      if (error) throw error

      // Check if all stops are done
      const updatedParadas = paradas.map((p) =>
        p.id === paradaId ? { ...p, status, visitada_em: new Date().toISOString() } : p
      )
      setParadas(updatedParadas as ParadaData[])

      const allDone = updatedParadas.every(
        (p) => p.status === 'concluida' || p.status === 'pulada'
      )

      if (allDone) {
        // Mark route as completed
        await supabase
          .from('rotas')
          .update({ status: 'concluida' })
          .eq('id', rotaId)

        toast.success('🎉 Rota concluída!')
      } else {
        // Mark route as in progress
        await supabase
          .from('rotas')
          .update({ status: 'em_andamento' })
          .eq('id', rotaId)

        toast.success(
          status === 'concluida' ? 'Parada concluída!' : 'Parada pulada'
        )
      }
    } catch {
      toast.error('Erro ao atualizar parada')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  const totalParadas = paradas.length
  const concluidas = paradas.filter((p) => p.status === 'concluida').length
  const progress = totalParadas > 0 ? (concluidas / totalParadas) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Back + Progress */}
      <div className="flex items-center gap-3">
        <Link href="/rota/hoje">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progresso</span>
            <span>
              {concluidas}/{totalParadas}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stops */}
      {paradas.map((parada, idx) => {
        const c = parada.clientes
        const isDone = parada.status === 'concluida'
        const isSkipped = parada.status === 'pulada'
        const isPending = parada.status === 'pendente'

        let lat = 0,
          lng = 0
        if (c?.location && typeof c.location === 'object') {
          const loc = c.location as { coordinates?: number[] }
          if (loc.coordinates) {
            lng = loc.coordinates[0]
            lat = loc.coordinates[1]
          }
        }

        return (
          <Card
            key={parada.id}
            className={`border transition-all duration-300 ${
              isDone
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : isSkipped
                ? 'bg-amber-500/5 border-amber-500/10 opacity-50'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start gap-3">
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
                    className={`font-bold text-lg ${
                      isDone || isSkipped ? 'text-gray-400' : 'text-white'
                    }`}
                  >
                    {c?.nome}
                  </p>
                  <p className="text-sm text-gray-500 flex items-start gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {c?.endereco_texto}
                  </p>
                  {c?.telefone && (
                    <a
                      href={`tel:${c.telefone}`}
                      className="text-sm text-blue-400 flex items-center gap-1 mt-1 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {c.telefone}
                    </a>
                  )}
                  {c?.observacoes && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      {c.observacoes}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {isPending && (
                <div className="flex gap-2">
                  {lat !== 0 && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        className="w-full border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Abrir no Maps
                      </Button>
                    </a>
                  )}
                  <Button
                    onClick={() => updateParadaStatus(parada.id, 'concluida')}
                    disabled={actionLoading === parada.id}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  >
                    {actionLoading === parada.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Concluir
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => updateParadaStatus(parada.id, 'pulada')}
                    disabled={actionLoading === parada.id}
                    variant="outline"
                    size="icon"
                    className="border-white/10 text-gray-400 hover:bg-white/5 shrink-0"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {isDone && parada.visitada_em && (
                <p className="text-xs text-emerald-400/60">
                  Concluída em{' '}
                  {new Date(parada.visitada_em).toLocaleTimeString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
