'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClienteForm, { type ClienteFormInitial } from '@/components/forms/ClienteForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Power, Loader2 } from 'lucide-react'

interface ClienteDB extends ClienteFormInitial {
  ativo: boolean
}

export default function ClienteEditClient({ cliente }: { cliente: ClienteDB }) {
  const [ativo, setAtivo] = useState(cliente.ativo)
  const [toggling, setToggling] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function toggleAtivo() {
    setToggling(true)
    const next = !ativo
    const { error } = await supabase
      .from('clientes')
      .update({ ativo: next })
      .eq('id', cliente.id)
    setToggling(false)
    if (error) {
      toast.error('Erro ao alterar status')
      return
    }
    setAtivo(next)
    toast.success(next ? 'Cliente ativado' : 'Cliente desativado')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
        <div>
          <p className="text-sm text-gray-300">Status do cliente</p>
          <Badge
            variant="outline"
            className={
              ativo
                ? 'border-emerald-500/30 text-emerald-400 mt-1'
                : 'border-gray-500/30 text-gray-400 mt-1'
            }
          >
            {ativo ? 'Ativo' : 'Inativo'}
          </Badge>
          <p className="text-xs text-gray-500 mt-2">
            Clientes inativos não aparecem ao montar rotas.
          </p>
        </div>
        <Button
          type="button"
          onClick={toggleAtivo}
          disabled={toggling}
          variant="outline"
          className={
            ativo
              ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
              : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
          }
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Power className="w-4 h-4 mr-2" />
              {ativo ? 'Desativar' : 'Ativar'}
            </>
          )}
        </Button>
      </div>

      <ClienteForm cliente={cliente} />
    </div>
  )
}
