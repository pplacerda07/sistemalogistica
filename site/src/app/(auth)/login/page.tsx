'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Truck, Route } from 'lucide-react'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = isSignUp ? await signup(formData) : await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a1a]">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg shadow-blue-500/25">
            <Route className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            RotaFácil
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Sistema de Logística Inteligente
          </p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white">
              {isSignUp ? 'Criar conta' : 'Entrar'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isSignUp
                ? 'Preencha os dados para criar sua conta'
                : 'Use seu email e senha para acessar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-gray-300">
                    Nome
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    type="text"
                    placeholder="Seu nome completo"
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Senha
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              {isSignUp && (
                <input type="hidden" name="role" value="admin" />
              )}

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Aguarde...
                  </div>
                ) : isSignUp ? (
                  'Criar conta'
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                }}
                className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
              >
                {isSignUp
                  ? 'Já tem conta? Faça login'
                  : 'Não tem conta? Cadastre-se'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Features list */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { icon: MapPin, label: 'Geocoding' },
            { icon: Route, label: 'Otimização' },
            { icon: Truck, label: 'Navegação' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 text-gray-500"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
