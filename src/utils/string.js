export function getInitials(nome) {
  const parts = (nome || '').trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Forma canônica de um setor para comparação: sem acentos, minúsculo,
    sem espaços nas pontas e com espaços internos colapsados.
    Ex.: " Produção " → "producao". */
export function normalizeSetor(setor) {
  return (setor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Padrão ILIKE que casa o setor com ou sem acento: letras que podem levar
    acento em pt-BR (vogais e "c") viram o curinga "_" (1 caractere) e espaços
    viram "%" (tolera espaços extras no banco).
    É um pré-filtro amplo no banco; o resultado deve ser refinado com normalizeSetor. */
export function setorIlikePattern(setor) {
  const corpo = normalizeSetor(setor)
    .replace(/[\\%_]/g, (c) => `\\${c}`)
    .replace(/[aeiouc]/g, '_')
    .replace(/ /g, '%');
  return `%${corpo}%`;
}
