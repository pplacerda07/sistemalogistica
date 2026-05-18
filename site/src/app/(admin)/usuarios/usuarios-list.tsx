'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Pencil, Loader2, Mail, Shield, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ProfileRow {
  id: string
  nome: string
  role: 'admin' | 'vendedor'
  created_at: string
}

export default function UsuariosList({
  initialProfiles,
}: {
  initialProfiles: ProfileRow[]
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProfileRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const form = new FormData(e.currentTarget)
      const payload = {
        nome: form.get('nome') as string,
        email: form.get('email') as string,
        senha: form.get('senha') as string,
        role: form.get('role') as 'admin' | 'vendedor',
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar usuário')

      toast.success('Usuário criado com sucesso!')
      setCreateOpen(false)
      router.refresh()
      setProfiles((curr) => [
        {
          id: json.user.id,
          nome: payload.nome,
          role: payload.role,
          created_at: new Date().toISOString(),
        },
        ...curr,
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar usuário'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editTarget) return
    setSubmitting(true)
    try {
      const form = new FormData(e.currentTarget)
      const nome = form.get('nome') as string
      const role = form.get('role') as 'admin' | 'vendedor'

      const { error } = await supabase
        .from('profiles')
        .update({ nome, role })
        .eq('id', editTarget.id)

      if (error) throw error

      toast.success('Usuário atualizado!')
      setProfiles((curr) =>
        curr.map((p) =>
          p.id === editTarget.id ? { ...p, nome, role } : p
        )
      )
      setEditTarget(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25">
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            }
          />
          <DialogContent className="bg-[#0d0d24] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Criar Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-gray-300">Nome *</Label>
                <Input
                  id="nome"
                  name="nome"
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha" className="text-gray-300">Senha *</Label>
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  required
                  minLength={6}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-300">Tipo *</Label>
                <select
                  id="role"
                  name="role"
                  required
                  defaultValue="vendedor"
                  className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Criar usuário'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {profiles.map((p) => {
          const isAdmin = p.role === 'admin'
          return (
            <Card
              key={p.id}
              className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-all"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isAdmin
                          ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20'
                          : 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20'
                      }`}
                    >
                      {isAdmin ? (
                        <Shield className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Truck className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {p.nome}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span className="truncate font-mono">{p.id.slice(0, 8)}...</span>
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      isAdmin
                        ? 'border-amber-500/30 text-amber-400'
                        : 'border-blue-500/30 text-blue-400'
                    }
                  >
                    {isAdmin ? 'Admin' : 'Vendedor'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Criado em{' '}
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditTarget(p)}
                    className="text-gray-400 hover:text-white hover:bg-white/5 h-7 px-2"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {profiles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">Nenhum usuário cadastrado</p>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="bg-[#0d0d24] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome" className="text-gray-300">Nome *</Label>
                <Input
                  id="edit-nome"
                  name="nome"
                  required
                  defaultValue={editTarget.nome}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-gray-300">Tipo *</Label>
                <select
                  id="edit-role"
                  name="role"
                  required
                  defaultValue={editTarget.role}
                  className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Salvar alterações'
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
