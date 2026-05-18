# Sistema de Logística para Vendedor de Rua

> Documento de contexto do projeto. Use este arquivo como referência principal para gerar código, tomar decisões de arquitetura e manter consistência.

---

## 1. Visão Geral

Sistema simples de roteirização para um vendedor de rua que visita clientes diariamente. O admin cadastra clientes fixos e monta a rota do dia selecionando quais visitar; o sistema calcula a **ordem ótima** das paradas e o vendedor segue a rota no celular.

**Princípio norteador:** simplicidade. Nada de over-engineering. Stack 100% gratuita.

### Personas
- **Admin** (desktop): cadastra clientes, monta rotas, acompanha histórico.
- **Vendedor** (celular/PWA): recebe a rota do dia, segue a ordem, marca paradas como concluídas.

### Escopo (MVP)
- Cadastro de clientes com geocoding automático
- Criação de rotas selecionando clientes
- Otimização da ordem de visitação (TSP, até 10 paradas)
- Visualização da rota no mapa
- App mobile (PWA) pro vendedor seguir a rota
- Botão "abrir no Google Maps" para navegação

### Fora do escopo (não construir agora)
- Múltiplos vendedores compartilhando rota
- Navegação turn-by-turn interna
- Janelas de tempo / agendamento por horário
- Pagamentos, estoque, vendas (é só logística)
- Notificações push

---

## 2. Stack Técnica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript | SSR/RSC, ótimo DX |
| UI | Tailwind CSS + shadcn/ui | Velocidade + qualidade |
| Mapa | react-leaflet + tiles OpenStreetMap | Grátis, sem chave API |
| Banco | Supabase (Postgres + PostGIS) | Auth + DB + RLS prontos |
| Auth | Supabase Auth | Integrado ao RLS |
| Geocoding | Nominatim (OpenStreetMap) | Grátis (com restrições) |
| Roteirização | OSRM público (`router.project-osrm.org`) | Matriz de distâncias + polylines grátis |
| Otimização | Algoritmo próprio (Nearest Neighbor + 2-opt) | Roda em ms para ≤10 pontos |
| PWA | next-pwa | Instalável no celular |

### Restrições importantes da stack gratuita

**Nominatim:**
- Máximo 1 requisição por segundo
- User-Agent customizado obrigatório (ex: `MeuApp/1.0 (email@dominio.com)`)
- Sem uso em massa — sempre cachear o resultado no banco
- Sempre acessar via proxy server-side (API route), nunca direto do client

**OSRM público:**
- "Best effort", pode ficar lento ou cair
- Suficiente para MVP. Em produção real, considerar self-host em VPS

---

## 3. Modelo de Dados

### Tabelas

```sql
-- Habilitar PostGIS no painel do Supabase: Database → Extensions → postgis

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  role text not null check (role in ('admin', 'vendedor')),
  created_at timestamptz default now()
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  nome text not null,
  telefone text,
  endereco_texto text not null,
  location geography(Point, 4326),  -- lat/lng geocodado, SRID 4326 (WGS84)
  observacoes text,
  ativo boolean default true,
  created_at timestamptz default now()
);
create index clientes_location_idx on clientes using gist(location);
create index clientes_owner_idx on clientes(owner_id);

create table rotas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references profiles(id) on delete cascade,
  data date not null,
  origem_location geography(Point, 4326) not null,
  origem_texto text not null,
  status text not null default 'planejada'
    check (status in ('planejada', 'em_andamento', 'concluida')),
  distancia_total_m int,
  duracao_total_s int,
  polyline text,           -- geometria desenhada da rota (do OSRM, encoded polyline)
  created_at timestamptz default now()
);

create table paradas (
  id uuid primary key default gen_random_uuid(),
  rota_id uuid not null references rotas(id) on delete cascade,
  cliente_id uuid not null references clientes(id),
  ordem int not null,      -- posição na rota otimizada (0, 1, 2...)
  status text not null default 'pendente'
    check (status in ('pendente', 'concluida', 'pulada')),
  visitada_em timestamptz,
  unique(rota_id, ordem)
);
```

### Row Level Security

```sql
alter table profiles enable row level security;
alter table clientes enable row level security;
alter table rotas enable row level security;
alter table paradas enable row level security;

create policy "profiles_self" on profiles
  for all using (id = auth.uid());

create policy "clientes_owner" on clientes
  for all using (owner_id = auth.uid());

create policy "rotas_owner" on rotas
  for all using (vendedor_id = auth.uid());

create policy "paradas_via_rota" on paradas
  for all using (
    exists (
      select 1 from rotas
      where rotas.id = paradas.rota_id
        and rotas.vendedor_id = auth.uid()
    )
  );
```

### Trigger para criar profile automaticamente

```sql
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'vendedor')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

---

## 4. Arquitetura de Pastas

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx
├── (admin)/                      ← rotas do admin (desktop)
│   ├── dashboard/page.tsx
│   ├── clientes/
│   │   ├── page.tsx              ← lista + form de cadastro
│   │   └── [id]/page.tsx         ← editar cliente
│   ├── rotas/
│   │   ├── page.tsx              ← histórico de rotas
│   │   ├── nova/page.tsx         ← seleciona clientes → otimiza → salva
│   │   └── [id]/page.tsx         ← detalhes + mapa
│   └── layout.tsx
├── (mobile)/                     ← rotas do vendedor (celular, PWA)
│   ├── rota/
│   │   ├── hoje/page.tsx         ← rota do dia
│   │   └── [id]/
│   │       ├── page.tsx          ← lista de paradas em ordem
│   │       └── navegar/page.tsx  ← mapa + abrir no Maps
│   └── layout.tsx
├── api/
│   ├── geocode/route.ts          ← proxy pro Nominatim (rate-limited)
│   └── optimize/route.ts         ← recebe pontos, devolve ordem ótima
├── layout.tsx
└── page.tsx                       ← redirect por role

lib/
├── supabase/
│   ├── client.ts                  ← createBrowserClient
│   ├── server.ts                  ← createServerClient (RSC)
│   └── middleware.ts              ← refresh de sessão
├── osrm.ts                        ← wrapper das chamadas ao OSRM
├── optimizer.ts                   ← nearest neighbor + 2-opt
├── geocode.ts                     ← wrapper do Nominatim
└── types.ts                       ← tipos compartilhados

components/
├── map/
│   ├── RouteMap.tsx               ← mapa com markers + polyline
│   └── ClienteMarker.tsx
├── forms/
│   ├── ClienteForm.tsx
│   └── RotaForm.tsx
└── ui/                            ← shadcn

middleware.ts                       ← Supabase session refresh
next.config.js
tailwind.config.ts
```

---

## 5. Fluxos Principais

### 5.1. Cadastrar cliente
1. Admin abre `/clientes` → clica em "Novo cliente"
2. Preenche nome, telefone, endereço completo (texto livre)
3. Submit → POST para criar cliente
4. **Server-side**: chama `/api/geocode?q=<endereço>` → Nominatim → recebe lat/lng
5. Salva cliente com `location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)`
6. Se geocoding falhar, salva sem location e marca para revisão manual

### 5.2. Criar rota do dia
1. Admin abre `/rotas/nova`
2. Define origem (endereço de partida) → geocoda
3. Multi-select dos clientes a visitar hoje (até 10)
4. Clica em "Otimizar"
5. **Server-side**:
   - Monta array `[origem, cliente1, cliente2, ...]`
   - Chama OSRM `/table` → matriz NxN de durações
   - Roda Nearest Neighbor → solução inicial
   - Aplica 2-opt → solução melhorada
   - Chama OSRM `/route` na ordem otimizada → polyline + distância/tempo finais
   - Salva `rotas` + `paradas` no banco
6. Mostra preview do mapa com a rota desenhada
7. Admin confirma → rota fica disponível em `/rota/hoje` no celular do vendedor

### 5.3. Vendedor segue a rota
1. Abre PWA no celular → `/rota/hoje`
2. Vê lista ordenada de paradas com nome, endereço, telefone
3. Para cada parada: botão "Abrir no Maps" (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`)
4. Após visitar, marca como "Concluída" → atualiza `paradas.status` e `visitada_em`
5. Quando todas concluídas, rota muda para `status = 'concluida'`

---

## 6. Algoritmo de Otimização

### Por que essa abordagem
- Para ≤10 paradas, força bruta (10! = 3.6M permutações) seria possível mas desnecessária
- Nearest Neighbor sozinho dá soluções até 25% piores que o ótimo
- 2-opt em cima do NN chega em ~99% do ótimo em milissegundos

### Implementação (`lib/optimizer.ts`)

```typescript
export type Point = { lat: number; lng: number; id: string };

export async function fetchDurationMatrix(points: Point[]): Promise<number[][]> {
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM table failed: ${res.status}`);
  const data = await res.json();
  return data.durations; // matriz NxN em segundos
}

export function nearestNeighbor(matrix: number[][], start = 0): number[] {
  const n = matrix.length;
  const visited = new Set([start]);
  const order = [start];
  let current = start;
  while (visited.size < n) {
    let best = -1;
    let bestCost = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && matrix[current][i] < bestCost) {
        bestCost = matrix[current][i];
        best = i;
      }
    }
    order.push(best);
    visited.add(best);
    current = best;
  }
  return order;
}

export function routeCost(order: number[], matrix: number[][]): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) {
    total += matrix[order[i]][order[i + 1]];
  }
  return total;
}

export function twoOpt(order: number[], matrix: number[][]): number[] {
  let best = [...order];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let j = i + 1; j < best.length - 1; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        if (routeCost(candidate, matrix) < routeCost(best, matrix)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

export async function optimizeRoute(origem: Point, clientes: Point[]) {
  const points = [origem, ...clientes]; // índice 0 = origem (fixo)
  const matrix = await fetchDurationMatrix(points);
  const initial = nearestNeighbor(matrix, 0);
  const optimized = twoOpt(initial, matrix);
  // optimized[0] sempre = 0 (origem); pegamos só a ordem dos clientes
  return {
    clienteIdsOrdenados: optimized.slice(1).map(idx => clientes[idx - 1].id),
    custoTotalSegundos: routeCost(optimized, matrix),
  };
}
```

**Atenção:** o algoritmo acima é TSP aberto (não volta à origem). Se o vendedor precisar voltar ao ponto de partida, ajustar `routeCost` para somar o trecho `order[last] → order[0]` e adicionar `0` ao fim do array antes do 2-opt.

---

## 7. Endpoints da API

### `POST /api/geocode`

**Request body:**
```json
{ "endereco": "Rua Tal, 123, Bairro, Cidade - UF" }
```

**Response:**
```json
{ "lat": -20.4697, "lng": -54.6201, "display_name": "..." }
```

**Implementação:**
- Chama Nominatim com User-Agent customizado
- Limite global de 1 req/seg (usar uma fila simples em memória ou `setTimeout`)
- Retorna 404 se não encontrou, 429 se passou do rate limit

### `POST /api/optimize`

**Request body:**
```json
{
  "origem": { "lat": -20.46, "lng": -54.62 },
  "clientes": [
    { "id": "uuid1", "lat": -20.47, "lng": -54.63 },
    { "id": "uuid2", "lat": -20.48, "lng": -54.61 }
  ]
}
```

**Response:**
```json
{
  "ordem": ["uuid2", "uuid1"],
  "duracaoTotalSegundos": 1840,
  "distanciaTotalMetros": 12500,
  "polyline": "encoded_polyline_string"
}
```

**Implementação:**
- Valida que `clientes.length` ≤ 10
- Chama `optimizeRoute` (acima)
- Faz uma segunda chamada ao OSRM `/route` na ordem otimizada para obter polyline e distância
- Retorna tudo num único objeto

---

## 8. Decisões e Convenções

### Geocoding
- **Sempre cachear:** quando cliente é cadastrado, salvar `location` no banco. Nunca regeocodar a cada uso.
- **Falha silenciosa:** se Nominatim falhar, deixa `location` nulo e marca cliente como "precisa revisão". Não bloquear cadastro.
- **Server-side apenas:** nunca chamar Nominatim do browser (CORS + User-Agent).

### Origem da rota
- Campo `origem_location` é por rota (não por usuário), assim o admin pode escolher um ponto de partida diferente a cada dia se quiser.

### Mobile vs Desktop
- Mesmo deploy, diferenciação por rota (`(admin)` vs `(mobile)`) e por role no profile.
- Layout mobile: bottom-nav, cards grandes, fontes maiores.
- Layout admin: sidebar lateral, tabelas densas.

### Estado offline (mobile)
- MVP: assume online.
- Versão 2: salvar rota em IndexedDB ao carregar, permitir marcar paradas offline, sincronizar quando voltar.

### Navegação
- Não implementar navegação interna. Botão "Abrir no Maps" usa deeplink:
  - Android/iOS: `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`
  - Alternativa: `geo:LAT,LNG?q=LAT,LNG`

### Polyline
- OSRM retorna em formato "encoded polyline" (Google polyline algorithm). Decodificar no front com `@mapbox/polyline` para passar pro Leaflet.

---

## 9. Variáveis de Ambiente

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # apenas server-side, nunca expor

# Identificação para Nominatim (obrigatório)
NOMINATIM_USER_AGENT=LogisticaApp/1.0 (seu-email@exemplo.com)

# URLs dos serviços externos (configuráveis para self-host futuro)
OSRM_BASE_URL=https://router.project-osrm.org
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
```

---

## 10. Ordem de Construção Recomendada

1. **Setup inicial**
   - Criar projeto Next.js + Tailwind + shadcn
   - Criar projeto Supabase, ativar PostGIS, rodar SQL do schema
   - Configurar Supabase client (browser + server) + middleware

2. **Autenticação**
   - Tela `/login` (magic link ou email/senha)
   - Trigger de criação de profile
   - Middleware de proteção de rotas + redirect por role

3. **CRUD de clientes**
   - `/api/geocode` (proxy Nominatim com rate limit)
   - Tela `/clientes` com lista + form de cadastro
   - Geocoding ao criar/editar

4. **Criação de rotas**
   - `/api/optimize` com o algoritmo
   - Tela `/rotas/nova` com multi-select + preview no mapa
   - Persistência em `rotas` + `paradas`

5. **App mobile do vendedor**
   - Layout mobile-first
   - `/rota/hoje` listando paradas na ordem
   - Botão "Concluir parada" + "Abrir no Maps"

6. **PWA**
   - `next-pwa`, manifest.json, ícones
   - Testar instalação no celular

7. **Polish**
   - Mapa visual com polyline na tela da rota
   - Dashboard com métricas (rotas/mês, paradas/dia)
   - Histórico de visitas por cliente

---

## 11. Riscos Conhecidos e Mitigações

| Risco | Mitigação |
|---|---|
| Nominatim bloqueia por excesso de requests | Rate limit no proxy + cache no banco + considerar LocationIQ free tier (5k/dia) como backup |
| OSRM público fica fora do ar | Tratar erro graciosamente; em produção, self-host OSRM em VPS |
| Geocoding errado em endereços brasileiros | Permitir edição manual de lat/lng; mostrar pin no mapa para o admin confirmar |
| Vendedor sem internet na rua | V2: cache offline com IndexedDB |
| 2-opt fica lento com mais paradas | Já está limitado a 10 paradas; se precisar mais, trocar para OR-Tools |

---

## 12. Bibliotecas a Instalar

```bash
# Core
npm install @supabase/supabase-js @supabase/ssr

# Mapa
npm install leaflet react-leaflet @mapbox/polyline
npm install -D @types/leaflet

# UI
npx shadcn-ui@latest init
# componentes conforme necessário: button, input, dialog, table, etc.

# PWA (quando chegar nesse passo)
npm install next-pwa

# Utilitários
npm install zod                    # validação de inputs
npm install date-fns               # datas
```

---

## 13. Critério de "Pronto" do MVP

- [ ] Admin consegue logar
- [ ] Admin cadastra cliente e endereço é geocodado automaticamente
- [ ] Admin cria rota selecionando 3+ clientes e vê a ordem otimizada no mapa
- [ ] Vendedor loga no celular e vê a rota do dia em ordem
- [ ] Vendedor consegue marcar paradas como concluídas
- [ ] Botão "Abrir no Maps" funciona em Android e iOS
- [ ] App pode ser instalado como PWA no celular