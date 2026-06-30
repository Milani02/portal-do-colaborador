-- ============================================================
--  Atestados — restringir download apenas ao cargo RH
--  Rodar no painel do Supabase: SQL Editor → colar → Run
-- ============================================================

-- 1) Tornar o bucket PRIVADO (URLs públicas deixam de funcionar)
update storage.buckets set public = false where id = 'atestados';

-- 2) Função auxiliar: cargo do usuário logado
--    (security definer p/ ler profiles ignorando RLS da própria tabela)
create or replace function public.current_cargo()
returns text
language sql
security definer
set search_path = public
as $$
  select cargo from public.profiles where id = auth.uid();
$$;

-- 3) Limpa políticas antigas (caso já existam com estes nomes)
drop policy if exists "colab upload atestados" on storage.objects;
drop policy if exists "rh le atestados"        on storage.objects;
drop policy if exists "gestor rh leem atestados" on storage.objects;

-- 4) Colaborador pode FAZER UPLOAD apenas na própria pasta ({user_id}/arquivo)
create policy "colab upload atestados"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'atestados'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 5) Gestor e RH podem LER (necessário para createSignedUrl funcionar).
--    Obs.: "ver" e "baixar" usam a mesma permissão de leitura — a diferença
--    (gestor só visualiza / RH força download) é feita na interface (UX),
--    não há barreira técnica que impeça quem visualiza de salvar o arquivo.
create policy "gestor rh leem atestados"
on storage.objects for select
to authenticated
using (
  bucket_id = 'atestados'
  and public.current_cargo() in ('gestor', 'rh')
);
