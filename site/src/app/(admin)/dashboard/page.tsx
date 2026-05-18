import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Route, MapPin, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch counts
  const [clientesRes, rotasRes, paradasRes] = await Promise.all([
    supabase.from('clientes').select('id', { count: 'exact', head: true }),
    supabase.from('rotas').select('id', { count: 'exact', head: true }),
    supabase
      .from('paradas')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'concluida'),
  ])

  const totalClientes = clientesRes.count ?? 0
  const totalRotas = rotasRes.count ?? 0
  const totalConcluidas = paradasRes.count ?? 0

  // Recent routes
  const { data: recentRoutes } = await supabase
    .from('rotas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    {
      title: 'Total Clientes',
      value: totalClientes,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/20',
    },
    {
      title: 'Rotas Criadas',
      value: totalRotas,
      icon: Route,
      gradient: 'from-indigo-500 to-purple-500',
      shadow: 'shadow-indigo-500/20',
    },
    {
      title: 'Paradas Concluídas',
      value: totalConcluidas,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/20',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Visão geral do sistema de logística
          </p>
        </div>
        <Link href="/rotas/nova">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25">
            <Route className="w-4 h-4 mr-2" />
            Nova Rota
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors duration-200"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.shadow}`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent routes */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg">Rotas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRoutes && recentRoutes.length > 0 ? (
            <div className="space-y-3">
              {recentRoutes.map((rota) => (
                <Link
                  key={rota.id}
                  href={`/rotas/${rota.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {rota.origem_texto}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(rota.data).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      rota.status === 'concluida'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : rota.status === 'em_andamento'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {rota.status === 'concluida'
                      ? 'Concluída'
                      : rota.status === 'em_andamento'
                      ? 'Em andamento'
                      : 'Planejada'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Route className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma rota criada ainda</p>
              <Link href="/rotas/nova" className="mt-3 inline-block">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-gray-300 hover:bg-white/5"
                >
                  Criar primeira rota
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
