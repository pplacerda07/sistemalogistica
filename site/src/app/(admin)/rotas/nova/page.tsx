'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import dynamic from 'next/dynamic'

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  ),
})

interface ClienteDB {
  id: string
  nome: string
  telefone: string | null
  endereco_texto: string
  location: unknown
  ativo: boolean
}

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
      const [{ data: clientesData }, { data: vendedoresData }] = await Promise.all([
        supabase
          .from('clientes')
          .select('*')
          .eq('ativo', true)
          .not('location', 'is', null)
          .order('nome'),
        supabase
          .from('profiles')
          .select('id, nome')
          .eq('role', 'vendedor')
          .order('nome'),
      ])

      if (clientesData) {
        const rows = clientesData as unknown as ClienteDB[]
        const parsed: ParsedCliente[] = rows.map((c) => {
          let lat = 0,
            lng = 0
          if (c.location && typeof c.location === 'object') {
            const loc = c.location as { coordinates?: number[] }
            if (loc.coordinates) {
              lng = loc.coordinates[0]
              lat = loc.coordinates[1]
            }
          }
          return {
            id: c.id,
            nome: c.nome,
            telefone: c.telefone,
            endereco_texto: c.endereco_texto,
            lat,
            lng,
            ativo: c.ativo,
          }
        })
        setClientes(parsed)
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

  async function geocodeOrigem() {
    if (!origem.trim()) {
      toast.error('Informe o endereço de origem')
      return
    }

    const res = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endereco: origem }),
    })

    if (res.ok) {
      const data = await res.json()
      setOrigemCoords({ lat: data.lat, lng: data.lng })
      toast.success('Origem localizada!')
    } else {
      toast.error('Não foi possível localizar o endereço de origem')
    }
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
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origem: origemCoords,
          clientes: selectedClientes.map((c) => ({
            id: c.id,
            lat: c.lat,
            lng: c.lng,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao otimizar')
      }

      const result = await res.json()
      setOptimizedResult(result)
      toast.success('Rota otimizada com sucesso!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao otimizar'
      toast.error(msg)
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
      // Create route
      const { data: rota, error: rotaError } = await supabase
        .from('rotas')
        .insert({
          vendedor_id: vendedorId,
          data: new Date().toISOString().split('T')[0],
          origem_texto: origem,
          status: 'planejada',
          distancia_total_m: optimizedResult.distanciaTotalMetros,
          duracao_total_s: optimizedResult.duracaoTotalSegundos,
          polyline: optimizedResult.polyline,
        })
        .select()
        .single()

      if (rotaError) throw rotaError

      // Create stops in order
      const paradas = optimizedResult.ordem.map((clienteId, idx) => ({
        rota_id: rota.id,
        cliente_id: clienteId,
        ordem: idx,
        status: 'pendente' as const,
      }))

      const { error: paradasError } = await supabase
        .from('paradas')
        .insert(paradas)

      if (paradasError) throw paradasError

      toast.success('Rota salva com sucesso!')
      router.push(`/rotas/${rota.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      toast.error(msg)
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
              <select
                value={vendedorId}
                onChange={(e) => {
                  setVendedorId(e.target.value)
                  setOptimizedResult(null)
                }}
                required
                className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Selecione um vendedor...</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
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
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Endereço de partida..."
                  value={origem}
                  onChange={(e) => {
                    setOrigem(e.target.value)
                    setOrigemCoords(null)
                  }}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <Button
                  onClick={geocodeOrigem}
                  variant="outline"
                  className="border-white/10 text-gray-300 hover:bg-white/5 shrink-0"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
              {origemCoords && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Localizado: {origemCoords.lat.toFixed(5)},{' '}
                  {origemCoords.lng.toFixed(5)}
                </p>
              )}
            </CardContent>
          </Card>

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
