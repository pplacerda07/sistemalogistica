'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}

export interface EnderecoResult {
  lat: number
  lng: number
  enderecoTexto: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  /** Called when user confirms — already geocoded, ready to use. */
  onConfirm: (result: EnderecoResult) => void
}

export default function EnderecoDialog({
  open,
  onOpenChange,
  title = 'Definir endereço',
  onConfirm,
}: Props) {
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleCepBlur() {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      if (!res.ok) throw new Error()
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
    setSubmitting(true)
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logradouro, numero, bairro, cidade, estado }),
      })

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`
        try {
          const j = await res.json()
          errMsg = j.error || errMsg
        } catch {
          /* no-op */
        }
        throw new Error(errMsg)
      }

      const data = await res.json()
      const enderecoTexto = [logradouro, numero, bairro, cidade, estado, 'Brasil']
        .filter(Boolean)
        .join(', ')

      onConfirm({ lat: data.lat, lng: data.lng, enderecoTexto })
      onOpenChange(false)
      // Reset for next time
      setCep('')
      setLogradouro('')
      setNumero('')
      setBairro('')
      setCidade('')
      setEstado('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao localizar endereço'
      toast.error(msg, { duration: 6000 })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d0d24] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-1">
              <Label htmlFor="origem-cep" className="text-gray-300">CEP</Label>
              <div className="relative">
                <Input
                  id="origem-cep"
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
              <Label htmlFor="origem-logradouro" className="text-gray-300">Logradouro *</Label>
              <Input
                id="origem-logradouro"
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
              <Label htmlFor="origem-numero" className="text-gray-300">Número</Label>
              <Input
                id="origem-numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="123"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="origem-bairro" className="text-gray-300">Bairro</Label>
              <Input
                id="origem-bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Centro"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="origem-cidade" className="text-gray-300">Cidade *</Label>
              <Input
                id="origem-cidade"
                required
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Campo Grande"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origem-estado" className="text-gray-300">UF *</Label>
              <select
                id="origem-estado"
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

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Localizando...
              </div>
            ) : (
              'Confirmar endereço'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
