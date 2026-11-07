-- ============================================================
-- Marcatalog: promoção, selos e métricas
-- Rode este arquivo UMA vez no Supabase:
--   Painel do Supabase > SQL Editor > New query > cole tudo > Run
-- É seguro rodar de novo (usa IF NOT EXISTS).
-- ============================================================

-- 1) Novos campos no produto -------------------------------------------------
alter table public.produtos
  add column if not exists preco_promocional numeric(12,2),
  add column if not exists selo text;

alter table public.produtos
  drop constraint if exists produtos_selo_check;

alter table public.produtos
  add constraint produtos_selo_check
  check (selo is null or selo in ('novo', 'destaque'));

-- 2) Tabela de eventos (métricas do catálogo) ---------------------------------
-- Os tipos das colunas de ID são lidos das suas tabelas atuais,
-- então funciona tanto com uuid quanto com número.
do $$
declare
  tipo_empresa text;
  tipo_produto text;
begin
  select format_type(a.atttypid, a.atttypmod) into tipo_empresa
    from pg_attribute a
   where a.attrelid = 'public.empresas'::regclass
     and a.attname = 'id' and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod) into tipo_produto
    from pg_attribute a
   where a.attrelid = 'public.produtos'::regclass
     and a.attname = 'id' and not a.attisdropped;

  execute format($f$
    create table if not exists public.eventos_catalogo (
      id          bigint generated always as identity primary key,
      empresa_id  %1$s not null references public.empresas(id) on delete cascade,
      produto_id  %2$s references public.produtos(id) on delete set null,
      tipo        text not null
                  check (tipo in ('visita', 'add_carrinho', 'clique_whatsapp', 'busca_sem_resultado', 'orcamento_pdf')),
      termo       text,
      vendedor_id text,
      sessao      text,
      criado_em   timestamptz not null default now()
    )
  $f$, tipo_empresa, tipo_produto);
end $$;

create index if not exists eventos_catalogo_empresa_data_idx
  on public.eventos_catalogo (empresa_id, criado_em desc);

alter table public.eventos_catalogo enable row level security;

-- Qualquer visitante pode REGISTRAR um evento de um catálogo ativo...
drop policy if exists "visitantes registram eventos" on public.eventos_catalogo;
create policy "visitantes registram eventos"
  on public.eventos_catalogo
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.empresas e
      where e.id = eventos_catalogo.empresa_id
        and e.ativo = true
    )
  );

-- ...mas só o DONO do catálogo consegue LER os eventos.
drop policy if exists "dono le seus eventos" on public.eventos_catalogo;
create policy "dono le seus eventos"
  on public.eventos_catalogo
  for select
  to authenticated
  using (
    exists (
      select 1 from public.empresas e
      where e.id = eventos_catalogo.empresa_id
        and e.usuario_id = auth.uid()
    )
  );
