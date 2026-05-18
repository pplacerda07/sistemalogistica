'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Phone, MapPin, Search, AlertCircle, Pencil } from 'lucide-react'
import ClienteForm from '@/components/forms/ClienteForm'

interface ClienteRow {
  id: string
  nome: string
  telefone: string | null
  endereco_texto: string
  location: unknown
  observacoes: string | null
  ativo: boolean
  created_at: string
}

type StatusFilter = 'todos' | 'ativos' | 'inativos'

export default function ClientesList({
  initialClientes,
}: {
  initialClientes: ClienteRow[]
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ativos')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = initialClientes.filter((c) => {
    if (statusFilter === 'ativos' && !c.ativo) return false
    if (statusFilter === 'inativos' && c.ativo) return false
    const q = search.toLowerCase()
    return (
      c.nome.toLowerCase().includes(q) ||
      c.endereco_texto.toLowerCase().includes(q) ||
      c.telefone?.includes(search)
    )
  })

  return (
    <>
      {/* Search + filter + Add */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar por nome, endereço ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="ativos">Apenas ativos</option>
          <option value="inativos">Apenas inativos</option>
          <option value="todos">Todos</option>
        </select>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            }
          />
          <DialogContent className="bg-[#0d0d24] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <ClienteForm onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((cliente) => (
          <Card
            key={cliente.id}
            className={`bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-white/15 transition-all duration-200 ${
              !cliente.ativo ? 'opacity-60' : ''
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">
                    {cliente.nome}
                  </h3>
                  {cliente.telefone && (
                    <a
                      href={`tel:${cliente.telefone}`}
                      className="text-sm text-gray-400 hover:text-blue-400 flex items-center gap-1 mt-0.5 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      {cliente.telefone}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!cliente.location && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 text-amber-400 text-xs"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Sem GPS
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      cliente.ativo
                        ? 'border-emerald-500/30 text-emerald-400 text-xs'
                        : 'border-gray-500/30 text-gray-400 text-xs'
                    }
                  >
                    {cliente.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-sm text-gray-400">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{cliente.endereco_texto}</span>
              </div>

              {cliente.observacoes && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic">
                  {cliente.observacoes}
                </p>
              )}

              <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                <Link href={`/clientes/${cliente.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-white/5 h-7 px-2"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          </p>
        </div>
      )}
    </>
  )
}
