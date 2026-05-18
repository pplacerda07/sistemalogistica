import { createClient } from '@/lib/supabase/server'
import UsuariosList from './usuarios-list'

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome, role, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <p className="text-gray-400 text-sm mt-1">
          Gerencie os usuários do sistema (admins e vendedores)
        </p>
      </div>
      <UsuariosList initialProfiles={profiles ?? []} />
    </div>
  )
}
