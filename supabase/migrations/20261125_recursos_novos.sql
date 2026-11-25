-- ============================================================
-- Marcatalog: "chave" para liberar as novidades por empresa
-- (modal de detalhes do produto + cores cinza e amarelo).
-- Rode UMA vez no Supabase: SQL Editor > New query > Run.
-- É seguro rodar de novo.
-- ============================================================

alter table public.empresas
  add column if not exists recursos_novos boolean not null default false;

-- Impede que o próprio dono (ou qualquer visitante) ligue a chave
-- pelo site. Só quem usa o SQL Editor / chave de serviço consegue.
create or replace function public.proteger_recursos_novos()
returns trigger
language plpgsql
as $$
begin
  if new.recursos_novos is distinct from old.recursos_novos
     and coalesce(auth.role(), '') in ('anon', 'authenticated') then
    new.recursos_novos := old.recursos_novos;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_recursos_novos on public.empresas;
create trigger trg_proteger_recursos_novos
  before update on public.empresas
  for each row execute function public.proteger_recursos_novos();

-- ------------------------------------------------------------
-- LIGAR para uma empresa (troque pelo slug do catálogo dela):
--   update public.empresas set recursos_novos = true
--    where slug = 'slug-da-empresa';
--
-- DESLIGAR:
--   update public.empresas set recursos_novos = false
--    where slug = 'slug-da-empresa';
-- ------------------------------------------------------------
