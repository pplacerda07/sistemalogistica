'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, MapPin } from 'lucide-react'

export default function ClienteForm({
  cliente,
  onClose,
}: {
  cliente?: {
    id: string
    nome: string
    telefone: string | null
    endereco_texto: string
    observacoes: string | null
  }
  onClose?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!cliente

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const nome = form.get('nome') as string
    const telefone = form.get('telefone') as string
    const endereco_texto = form.get('endereco_texto') as string
    const observacoes = form.get('observacoes') as string

    try {
      // Geocode the address
      setGeocoding(true)
      let location = null
      const geoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endereco: endereco_texto }),
      })

      if (geoRes.ok) {
        const geoData = await geoRes.json()
        // Store as PostGIS point via RPC or raw insert
        location = `SRID=4326;POINT(${geoData.lng} ${geoData.lat})`
      } else {
        toast.warning('Endereço não geocodificado. Salvo sem localização.')
      }
      setGeocoding(false)

      if (isEditing) {
        const { error } = await supabase
          .from('clientes')
          .update({
            nome,
            telefone: telefone || null,
            endereco_texto,
            observacoes: observacoes || null,
          })
          .eq('id', cliente.id)

        if (error) throw error

        // Update location separately if geocoded
        if (location) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/update_cliente_location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              },
              body: JSON.stringify({ cliente_id: cliente.id, lng: location }),
            }).catch(() => {
              // Fallback: location update failed silently
            })
          }
        }

        toast.success('Cliente atualizado com sucesso!')
      } else {
        // For new clients, we need the user's ID
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Não autenticado')

        const { error } = await supabase.from('clientes').insert({
          owner_id: user.id,
          nome,
          telefone: telefone || null,
          endereco_texto,
          observacoes: observacoes || null,
          ativo: true,
        })

        if (error) throw error
        toast.success('Cliente cadastrado com sucesso!')
      }

      router.refresh()
      onClose?.()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar cliente'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
      setGeocoding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome" className="text-gray-300">
          Nome *
        </Label>
        <Input
          id="nome"
          name="nome"
          required
          defaultValue={cliente?.nome}
          placeholder="Nome do cliente"
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefone" className="text-gray-300">
          Telefone
        </Label>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          defaultValue={cliente?.telefone || ''}
          placeholder="(00) 00000-0000"
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endereco_texto" className="text-gray-300">
          Endereço completo *
        </Label>
        <Input
          id="endereco_texto"
          name="endereco_texto"
          required
          defaultValue={cliente?.endereco_texto}
          placeholder="Rua, número, bairro, cidade - UF"
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          O endereço será geocodificado automaticamente
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes" className="text-gray-300">
          Observações
        </Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={cliente?.observacoes || ''}
          placeholder="Notas sobre o cliente..."
          rows={3}
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {geocoding ? 'Geocodificando...' : 'Salvando...'}
          </div>
        ) : isEditing ? (
          'Atualizar cliente'
        ) : (
          'Cadastrar cliente'
        )}
      </Button>
    </form>
  )
}
