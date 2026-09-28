@AGENTS.md

# Tably — convenções do projeto

SaaS de gestão para cafeterias, restaurantes, açaiterias e similares.
Stack: Next.js (App Router) · React · TypeScript · Tailwind · shadcn/ui · Zod · React Hook Form · TanStack Query · TanStack Table · Zustand · Supabase (Postgres, Auth, Storage, Realtime) · Lucide · date-fns · Sonner · Biome · react-number-format. PWA instalável.

## Comunicação
- Responder sempre em português brasileiro, explicando decisões técnicas e trade-offs.

## Código
- Nunca escrever comentários no código (diretivas de ferramenta, como `biome-ignore`, são a exceção).
- Código limpo, conciso, SOLID, DRY: extrair funções/componentes reutilizáveis quando houver repetição.
- Sempre TypeScript. Nunca `any`. Preferir `type` a `interface`. Tipagem explícita.
- Nomes descritivos em inglês (`isLoading`, `hasError`). Arquivos e pastas em kebab-case.
- `as const` para arrays/objetos imutáveis, branded types para IDs, discriminated unions para estados complexos, `?.` e `??` quando apropriado, utility types (`Pick`, `Omit`, `Partial`).
- Atualização de estado que depende do anterior: sempre na forma de callback.

## React e Next.js
- Componentes como `function MeuComponente()`, nunca arrow function atribuída a const.
- Usar componentes do shadcn/ui ao máximo.
- Formulários: sempre React Hook Form + Zod via `zodResolver`, com feedback visual claro.
- Client Components falam com Server Actions via TanStack Query, sempre por hooks customizados (um por query/mutation). Cada hook exporta uma função que retorna a query key ou a mutation key.
- Inputs com máscara: sempre `react-number-format`.
- Componente usado por uma única página fica em `components/` dentro da pasta da rota. Componentes compartilhados ficam em `src/components` ou `src/features/<domínio>/components`.
- Sempre `Link` e `Image` do Next. `React.memo`, `useMemo`, `useCallback` e lazy loading com critério.
- Estado no componente mais baixo possível; Zustand para estado de cliente complexo; TanStack Query para dados do servidor.
- Acessibilidade: HTML semântico e atributos `aria-*`/`alt`.

## Estilo
- Não alterar nem adicionar estilização sem pedido explícito.
- Tailwind primeiro, cores via variáveis CSS do tema, variantes com `cva`/`cn`.

## Git
- Commits pequenos e focados com Conventional Commits, em branches `feature/`, `fix/` ou `chore/`.

## Comandos
- `pnpm dev` · `pnpm lint` (Biome) · `pnpm format` · `pnpm typecheck` · `pnpm build`
