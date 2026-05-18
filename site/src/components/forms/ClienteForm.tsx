'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, MapPin } from 'lucide-react'

const MiniMap = dynamic(() => import('@/components/map/MiniMap'), { ssr: false })

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export interface ClienteFormInitial {
  id: string
  nome: string
  telefone: string | null
  endereco_texto: string
  observacoes: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  location?: { coordinates?: number[] } | null
}

interface Props {
  cliente?: ClienteFormInitial
  onClose?: () => void
}

function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}

function maskTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_m, a, b, c) =>
      [a && `(${a}`, a.length === 2 ? ') ' : '', b, c && `-${c}`].filter(Boolean).join('')
    )
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3')
}

export default function ClienteForm({ cliente, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const c = cliente?.location?.coordinates
    return c && c.length === 2 ? { lat: c[1], lng: c[0] } : null
  })

  const [nome, setNome] = useState(cliente?.nome ?? '')
  const [telefone, setTelefone] = useState(cliente?.telefone ?? '')
  const [cep, setCep] = useState(cliente?.cep ?? '')
  const [logradouro, setLogradouro] = useState(cliente?.logradouro ?? '')
  const [numero, setNumero] = useState(cliente?.numero ?? '')
  const [complemento, setComplemento] = useState(cliente?.complemento ?? '')
  const [bairro, setBairro] = useState(cliente?.bairro ?? '')
  const [cidade, setCidade] = useState(cliente?.cidade ?? '')
  const [estado, setEstado] = useState(cliente?.estado ?? '')
  const [observacoes, setObservacoes] = useState(cliente?.observacoes ?? '')

  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!cliente

  async function handleCepBlur() {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return

    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      if (!res.ok) throw new Error('CEP não encontrado')
      const data = await res.json()
      if (data.erro) {
        toast.error('CEP não encontrado')
        return
      }
      if (data.logradouro) setLogradouro(data.logradouro)
      if (data.bairro) setBairro(data.bairro)
      if (data.localidade) setCidade(data.localidade)
      if (data.uf) setEstado(data.uf)
    } catch {
      toast.error('Erro ao consultar CEP')
    } finally {
      setCepLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      // Geocode
      let geo: { lat: number; lng: number } | null = coords
      // Re-geocode when address changed (or when creating new without manual coords)
      const addressChanged =
        !isEditing ||
        logradouro !== (cliente?.logradouro ?? '') ||
        numero !== (cliente?.numero ?? '') ||
        bairro !== (cliente?.bairro ?? '') ||
        cidade !== (cliente?.cidade ?? '') ||
        estado !== (cliente?.estado ?? '')

      if (addressChanged) {
        const geoRes = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
          }),
        })
        if (geoRes.ok) {
          const d = await geoRes.json()
          geo = { lat: d.lat, lng: d.lng }
          setCoords(geo)
        } else {
          toast.warning('Endereço não geocodificado. Salvo sem localização.')
          geo = null
        }
      }

      const enderecoFormatado = [logradouro, numero, bairro, cidade, estado, 'Brasil']
        .filter(Boolean)
        .join(', ')

      const basePayload = {
        nome,
        telefone: telefone || null,
        endereco_texto: enderecoFormatado,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        cep: cep || null,
        observacoes: observacoes || null,
      }

      if (isEditing) {
        const { error } = await supabase
          .from('clientes')
          .update(basePayload)
          .eq('id', cliente.id)
        if (error) throw error

        if (geo) {
          await supabase.rpc('set_cliente_location', {
            cliente_id: cliente.id,
            lng: geo.lng,
            lat: geo.lat,
          })
        }

        toast.success('Cliente atualizado!')
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Não autenticado')

        const { data: inserted, error } = await supabase
          .from('clientes')
          .insert({ ...basePayload, owner_id: user.id, ativo: true })
          .select('id')
          .single()
        if (error) throw error

        if (geo && inserted) {
          await supabase.rpc('set_cliente_location', {
            cliente_id: inserted.id,
            lng: geo.lng,
            lat: geo.lat,
          })
        }

        toast.success('Cliente cadastrado!')
      }

      router.refresh()
      onClose?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar cliente'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handlePinDrag(newLat: number, newLng: number) {
    setCoords({ lat: newLat, lng: newLng })
    if (isEditing && cliente) {
      const { error } = await supabase.rpc('set_cliente_location', {
        cliente_id: cliente.id,
        lng: newLng,
        lat: newLat,
      })
      if (error) {
        toast.error('Erro ao salvar posição ajustada')
      } else {
        toast.success('Posição ajustada')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome" className="text-gray-300">Nome *</Label>
        <Input
          id="nome"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do cliente"
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefone" className="text-gray-300">Telefone</Label>
        <Input
          id="telefone"
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(maskTelefone(e.target.value))}
          placeholder="(00) 00000-0000"
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2 col-span-1">
          <Label htmlFor="cep" className="text-gray-300">CEP</Label>
          <div className="relative">
            <Input
              id="cep"
              value={cep}
              onChange={(e) => setCep(maskCep(e.target.value))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            {cepLoading && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="logradouro" className="text-gray-300">Logradouro *</Label>
          <Input
            id="logradouro"
            required
            value={logradouro}
            onChange={(e) => setLogradouro(e.target.value)}
            placeholder="Rua, Avenida..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="numero" className="text-gray-300">Número</Label>
          <Input
            id="numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="123"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="complemento" className="text-gray-300">Complemento</Label>
          <Input
            id="complemento"
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            placeholder="Apto 42, bloco B..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bairro" className="text-gray-300">Bairro</Label>
        <Input
          id="bairro"
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          placeholder="Centro"
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2 col-span-2">
          <Label htmlFor="cidade" className="text-gray-300">Cidade *</Label>
          <Input
            id="cidade"
            required
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Campo Grande"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado" className="text-gray-300">UF *</Label>
          <select
            id="estado"
            required
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">--</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes" className="text-gray-300">Observações</Label>
        <Textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Notas sobre o cliente..."
          rows={2}
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
        />
      </div>

      {coords && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <MapPin className="w-3.5 h-3.5" />
            Localização: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            {isEditing && (
              <span className="text-gray-500 ml-2">
                — arraste o pin se a posição estiver incorreta
              </span>
            )}
          </div>
          <MiniMap
            lat={coords.lat}
            lng={coords.lng}
            draggable={isEditing}
            onPositionChange={handlePinDrag}
          />
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isEditing ? (
          'Atualizar cliente'
        ) : (
          'Cadastrar cliente'
        )}
      </Button>
    </form>
  )
}
