import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ClienteEditClient from './edit-client'

export default async function ClienteEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!cliente) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Editar cliente</h1>
          <p className="text-gray-400 text-sm mt-1">{cliente.nome}</p>
        </div>
      </div>

      <Card className="bg-white/5 border-white/10 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white text-base">Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClienteEditClient cliente={cliente} />
        </CardContent>
      </Card>
    </div>
  )
}
