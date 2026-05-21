'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2,
  MapPin,
  Route,
  Search,
  Clock,
  Navigation,
  Zap,
  User,
  Pencil,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import EnderecoDialog from '@/components/forms/EnderecoDialog'

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  ),
})

interface ParsedCliente {
  id: string
  nome: string
  telefone: string | null
  endereco_texto: string
  lat: number
  lng: number
  ativo: boolean
}

interface VendedorOption {
  id: string
  nome: string
}

export default function NovaRotaPage() {
  const [clientes, setClientes] = useState<ParsedCliente[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [vendedores, setVendedores] = useState<VendedorOption[]>([])
  const [vendedorId, setVendedorId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [origem, setOrigem] = useState('')
  const [origemCoords, setOrigemCoords] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [origemDialogOpen, setOrigemDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [optimizedResult, setOptimizedResult] = useState<{
    ordem: string[]
    duracaoTotalSegundos: number
    distanciaTotalMetros: number
    polyline: string
  } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const [{ data: clientesData, error: clientesError }, { data: vendedoresData }] = await Promise.all([
        supabase.rpc('get_clientes_ativos_com_coords'),
        supabase
          .from('profiles')
          .select('id, nome')
          .eq('role', 'vendedor')
          .order('nome'),
      ])

      if (clientesError) {
        console.error('[loadData] clientes RPC error:', clientesError)
        toast.error(
          'Não foi possível carregar clientes. Verifique se a função SQL ' +
            'get_clientes_ativos_com_coords foi criada no Supabase.'
        )
      }

      if (clientesData) {
        setClientes(clientesData as unknown as ParsedCliente[])
      }

      if (vendedoresData) {
        setVendedores(vendedoresData as unknown as VendedorOption[])
      }
      setLoading(false)
    }
    loadData()
  }, [supabase])

  const filtered = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.endereco_texto.toLowerCase().includes(search.toLowerCase())
  )

  function toggleCliente(id: string) {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      if (next.size >= 10) {
        toast.error('Máximo de 10 clientes por rota')
        return
      }
      next.add(id)
    }
    setSelected(next)
    setOptimizedResult(null)
  }

  function handleOrigemConfirm(result: { lat: number; lng: number; enderecoTexto: string }) {
    setOrigem(result.enderecoTexto)
    setOrigemCoords({ lat: result.lat, lng: result.lng })
    setOptimizedResult(null)
    toast.success('Origem localizada!')
  }

  async function handleOptimize() {
    if (!origemCoords) {
      toast.error('Geocodifique o endereço de origem primeiro')
      return
    }
    if (selected.size < 1) {
      toast.error('Selecione pelo menos 1 cliente')
      return
    }

    setOptimizing(true)
    try {
      const selectedClientes = clientes.filter((c) => selected.has(c.id))
      const payload = {
        origem: origemCoords,
        clientes: selectedClientes.map((c) => ({
          id: c.id,
          lat: c.lat,
          lng: c.lng,
        })),
      }
      console.log('[optimize] sending', payload)

      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`
        try {
          const err = await res.json()
          errMsg = err.error || errMsg
        } catch {
          /* response not json */
        }
        console.error('[optimize] failed', res.status, errMsg)
        throw new Error(errMsg)
      }

      const result = await res.json()
      console.log('[optimize] result', result)
      setOptimizedResult(result)
      toast.success('Rota otimizada!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao otimizar'
      console.error('[optimize] exception', err)
      toast.error(msg, { duration: 6000 })
    } finally {
      setOptimizing(false)
    }
  }

  async function handleSave() {
    if (!optimizedResult || !origemCoords) return
    if (!vendedorId) {
      toast.error('Selecione o vendedor responsável')
      return
    }

    setSaving(true)
    try {
      const { data: rotaId, error } = await supabase.rpc('create_rota_with_paradas', {
        p_vendedor_id: vendedorId,
        p_data: new Date().toISOString().split('T')[0],
        p_origem_lng: origemCoords.lng,
        p_origem_lat: origemCoords.lat,
        p_origem_texto: origem,
        p_distancia_m: optimizedResult.distanciaTotalMetros,
        p_duracao_s: optimizedResult.duracaoTotalSegundos,
        p_polyline: optimizedResult.polyline,
        p_cliente_ids: optimizedResult.ordem,
      })

      if (error) throw error

      toast.success('Rota salva com sucesso!')
      router.push(`/rotas/${rotaId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      console.error('[save] error:', err)
      toast.error(msg, { duration: 6000 })
    } finally {
      setSaving(false)
    }
  }

  const selectedClientes = clientes.filter((c) => selected.has(c.id))
  const orderedClientes = optimizedResult
    ? optimizedResult.ordem.map((id) => clientes.find((c) => c.id === id)!)
    : selectedClientes

  const mapPoints = origemCoords
    ? [
        { lat: origemCoords.lat, lng: origemCoords.lng, label: 'Origem' },
        ...orderedClientes.map((c, i) => ({
          lat: c.lat,
          lng: c.lng,
          label: `${i + 1}. ${c.nome}`,
        })),
      ]
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nova Rota</h1>
        <p className="text-gray-400 text-sm mt-1">
          Defina a origem, selecione clientes e otimize a rota
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-4">
          {/* Vendedor */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                Vendedor responsável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={vendedorId}
                onValueChange={(v) => {
                  setVendedorId(v ?? '')
                  setOptimizedResult(null)
                }}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione um vendedor...">
                    {(value: string) =>
                      vendedores.find((v) => v.id === value)?.nome ?? 'Selecione um vendedor...'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d24] border-white/10 text-white">
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vendedores.length === 0 && !loading && (
                <p className="text-xs text-amber-400 mt-2">
                  Nenhum vendedor cadastrado. Cadastre em /usuarios.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Origin */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400" />
                Ponto de partida
              </CardTitle>
            </CardHeader>
            <CardContent>
              {origemCoords ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">
                      {origem}
                    </p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {origemCoords.lat.toFixed(5)}, {origemCoords.lng.toFixed(5)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOrigemDialogOpen(true)}
                    className="text-gray-400 hover:text-white hover:bg-white/5 shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Alterar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => setOrigemDialogOpen(true)}
                  variant="outline"
                  className="w-full border-white/10 text-gray-300 hover:bg-white/5"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Definir ponto de partida
                </Button>
              )}
            </CardContent>
          </Card>

          <EnderecoDialog
            open={origemDialogOpen}
            onOpenChange={setOrigemDialogOpen}
            title="Definir ponto de partida"
            onConfirm={handleOrigemConfirm}
          />

          {/* Client selection */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  Clientes para visitar
                </span>
                <Badge
                  variant="outline"
                  className="border-white/10 text-gray-400"
                >
                  {selected.size}/10
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : filtered.length > 0 ? (
                  filtered.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                        selected.has(c.id)
                          ? 'bg-blue-500/10 border border-blue-500/20'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggleCliente(c.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">
                          {c.nome}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {c.endereco_texto}
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhum cliente com localização
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleOptimize}
              disabled={optimizing || !origemCoords || selected.size < 1 || !vendedorId}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25"
            >
              {optimizing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Otimizar Rota
            </Button>

            {optimizedResult && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/25"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Route className="w-4 h-4 mr-2" />
                )}
                Salvar Rota
              </Button>
            )}
          </div>

          {/* Result info */}
          {optimizedResult && (
            <>
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Clock className="w-4 h-4" />
                      {Math.floor(optimizedResult.duracaoTotalSegundos / 60)} min
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Navigation className="w-4 h-4" />
                      {(optimizedResult.distanciaTotalMetros / 1000).toFixed(1)} km
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <MapPin className="w-4 h-4" />
                      {optimizedResult.ordem.length} paradas
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ordem otimizada — visita nessa sequência */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Route className="w-4 h-4 text-indigo-400" />
                    Ordem da visita
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      <Navigation className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-semibold">Origem</p>
                      <p className="text-xs text-gray-500 truncate">{origem}</p>
                    </div>
                  </div>
                  {orderedClientes.map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-semibold truncate">
                          {c.nome}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {c.endereco_texto}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right: Map */}
        <div className="lg:sticky lg:top-24">
          <RouteMap
            points={mapPoints}
            polyline={optimizedResult?.polyline}
          />
        </div>
      </div>
    </div>
  )
}
