# RotaFácil

Aplicação web que organiza o dia de vendedores de rua: o administrador cadastra clientes e monta a rota, o sistema calcula a melhor ordem de visita e o vendedor segue as paradas pelo celular.

Projeto desenvolvido por Pedro Paulo Lacerda. Sistema de roteirização para equipes de vendas externas.

## Funcionalidades

- **Cadastro de clientes** com endereço estruturado, preenchimento automático por CEP (ViaCEP) e geocodificação automática via Nominatim (OpenStreetMap).
- **Ajuste manual da localização**: na edição, o pin do cliente pode ser arrastado no mapa para corrigir a posição.
- **Carteira de clientes** com busca, filtro por ativos e inativos e opção de ativar ou desativar cadastros.
- **Montagem de rota**: origem definida por endereço, seleção de até 10 clientes, escolha do vendedor responsável e otimização da ordem de visita, com prévia no mapa, distância e tempo estimados.
- **Histórico de rotas** com página de detalhes, trajeto desenhado no mapa e status de cada parada.
- **Área mobile do vendedor** (`/rota/hoje`): paradas em ordem, barra de progresso, botões para ligar para o cliente, abrir a navegação no Google Maps e marcar a parada como concluída ou pulada.
- **Status automático da rota**: passa de planejada para em andamento e concluída conforme as paradas avançam.
- **Dashboard e usuários**: totais de clientes, rotas e paradas concluídas, rotas recentes e gestão de usuários com perfis admin e vendedor.

## Stack

- **Front-end:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, componentes shadcn/ui sobre Base UI, lucide-react, sonner
- **Back-end:** Supabase (Auth, Postgres e Edge Functions em Deno) e API Routes do Next.js
- **Mapas e rotas:** Leaflet com react-leaflet e tiles do OpenStreetMap, OSRM, Nominatim, ViaCEP e `@mapbox/polyline`

## Estrutura

```
sistemalogistica/
├── contexto_do_projeto.md    # escopo, modelo de dados, fluxos e algoritmo
├── site/                     # aplicação Next.js
│   └── src/
│       ├── app/(auth)/       # login
│       ├── app/(admin)/      # dashboard, clientes, rotas e usuários (desktop)
│       ├── app/(mobile)/     # rota do dia do vendedor
│       ├── app/api/          # geocode e optimize
│       ├── components/       # formulários, mapas e componentes de UI
│       └── lib/              # OSRM, otimizador, geocoding e clientes Supabase
└── supabase/functions/       # Edge Function create-user
```

## Como rodar localmente

Pré-requisitos: Node.js 20.9 ou superior (exigência do Next.js 16), um projeto no Supabase e a Supabase CLI para publicar a Edge Function.

1. Clone o repositório e instale as dependências dentro de `site/`:

   ```bash
   git clone https://github.com/pplacerda07/sistemalogistica.git
   cd sistemalogistica/site
   npm install
   ```

2. Crie o arquivo `site/.env.local` com as variáveis abaixo (o repositório não traz arquivo de exemplo):

   | Variável | Uso |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (anon) do Supabase |
   | `NOMINATIM_USER_AGENT` | identificação enviada ao Nominatim, exigida pela política de uso do serviço |
   | `OSRM_BASE_URL` | opcional: servidor OSRM (padrão: instância pública) |
   | `NOMINATIM_BASE_URL` | opcional: servidor Nominatim (padrão: instância pública) |

3. Prepare o banco no Supabase. O modelo de dados de referência (tabelas `profiles`, `clientes`, `rotas` e `paradas`, PostGIS, RLS e trigger de criação de perfil) está em [contexto_do_projeto.md](contexto_do_projeto.md). O cadastro atual também grava os campos `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade` e `estado` em `clientes`, e a aplicação chama as funções RPC `set_cliente_location`, `get_clientes_ativos_com_coords` e `create_rota_with_paradas`, que precisam existir no banco.

4. Na raiz do repositório, publique a Edge Function de criação de usuários. `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo próprio Supabase ao ambiente da função.

   ```bash
   supabase functions deploy create-user
   ```

5. Volte para `site/`, rode `npm run dev` e abra [http://localhost:3000](http://localhost:3000). Após o login, admins vão para `/dashboard` e vendedores para `/rota/hoje`.

## Decisões técnicas

- **Otimização de rota própria**: o OSRM (`/table`) devolve a matriz de tempos entre os pontos; a ordem inicial vem da heurística do vizinho mais próximo e é refinada com 2-opt, mantendo a origem fixa. Em seguida o OSRM (`/route`) retorna a polyline, a distância e a duração da ordem final (`site/src/lib/optimizer.ts`).
- **Route groups por perfil**: `(admin)`, `(mobile)` e `(auth)` separam os layouts de desktop (sidebar) e celular (navegação inferior) no mesmo deploy. A página inicial redireciona conforme o `role` do perfil e o `proxy.ts` do Next.js 16 renova a sessão do Supabase a cada requisição.
- **Geocoding no servidor**: a rota `/api/geocode` faz busca estruturada no Nominatim e, se não encontrar, repete a busca em texto livre, respeitando o limite de 1 requisição por segundo e um User-Agent configurável.
- **Criação de usuários em Edge Function**: o painel chama a função `create-user` (Deno), que confere se quem chama tem perfil admin e cria a conta pela API administrativa do Supabase Auth, já com nome e perfil.

## Autor

Pedro Paulo Lacerda · [github.com/pplacerda07](https://github.com/pplacerda07)
