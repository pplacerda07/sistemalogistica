import { createClient } from '@/lib/supabase/server'
import RotasList from './rotas-list'

export default async function RotasPage() {
  const supabase = await createClient()

  const [{ data: rotas }, { data: vendedores }] = await Promise.all([
    supabase
      .from('rotas')
      .select('*, paradas(count), vendedor:profiles!rotas_vendedor_id_fkey(id, nome)')
      .order('data', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, nome')
      .eq('role', 'vendedor')
      .order('nome'),
  ])

  return (
    <RotasList
      initialRotas={rotas ?? []}
      vendedores={vendedores ?? []}
    />
  )
}
