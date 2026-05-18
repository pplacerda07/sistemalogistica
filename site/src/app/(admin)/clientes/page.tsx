import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Phone, MapPin, Search, AlertCircle } from 'lucide-react'
import ClientesList from './clientes-list'

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome', { ascending: true })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerencie seus clientes e endereços
          </p>
        </div>
      </div>

      <ClientesList initialClientes={clientes || []} />
    </div>
  )
}
