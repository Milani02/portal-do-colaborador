// O Supabase (PostgREST) limita cada resposta a 1000 linhas ("Max rows").
// Busca em páginas até trazer todos os registros.
const PAGE_SIZE = 1000;

export async function fetchAll(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...data);
    if (data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
