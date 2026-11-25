-- ============================================================
-- Marcatalog: novas cores do catálogo (cinza e amarelo)
-- Rode este arquivo UMA vez no Supabase:
--   Painel do Supabase > SQL Editor > New query > cole tudo > Run
-- É seguro rodar de novo.
--
-- Só é necessário se o banco recusar salvar "cinza" ou "amarelo"
-- na Configuração da empresa (erro de "check constraint").
-- Ele troca qualquer regra antiga que limitava a coluna
-- cor_catalogo por uma que aceita todas as cores atuais.
-- ============================================================

do $$
declare
  regra record;
begin
  for regra in
    select conname
      from pg_constraint
     where conrelid = 'public.empresas'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%cor_catalogo%'
  loop
    execute format(
      'alter table public.empresas drop constraint %I',
      regra.conname
    );
  end loop;
end $$;

alter table public.empresas
  add constraint empresas_cor_catalogo_check
  check (
    cor_catalogo is null
    or cor_catalogo in (
      'cereja', 'azul', 'verde', 'roxo', 'laranja', 'cinza', 'amarelo'
    )
  );
