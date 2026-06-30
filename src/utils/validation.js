export const VALID_CARGOS = ['colaborador', 'gestor', 'rh', 'admin'];
export const VALID_TIPOS_OCORRENCIA = ['falta', 'atraso/saida antecipada', 'hora extra', 'outros'];

/* Domínio interno usado para mapear CPF → e-mail no Supabase Auth.
   As contas são criadas no painel com o e-mail `{cpf}@biodinamica.local`. */
export const CPF_AUTH_DOMAIN = 'biodinamica.local';

/** Remove máscara: deixa só os 11 dígitos. */
export function cleanCpf(cpf) {
  return (cpf || '').replace(/\D/g, '');
}

/** Aplica a máscara 000.000.000-00 progressivamente conforme digita. */
export function maskCpf(cpf) {
  return cleanCpf(cpf)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

/** Valida CPF: exige apenas 11 dígitos (sem checar dígitos verificadores).
    Retorna null se OK, ou mensagem de erro. */
export function validateCpf(cpf) {
  const d = cleanCpf(cpf);
  if (d.length !== 11) return 'CPF deve ter 11 dígitos.';
  return null;
}

/** Monta o e-mail interno do Supabase Auth a partir do CPF. */
export function cpfToAuthEmail(cpf) {
  return `${cleanCpf(cpf)}@${CPF_AUTH_DOMAIN}`;
}

export function validateCargo(cargo) {
  return VALID_CARGOS.includes(cargo);
}

export function validateTipoOcorrencia(tipo) {
  return VALID_TIPOS_OCORRENCIA.includes(tipo);
}

export function validateMotivo(motivo) {
  if (!motivo || typeof motivo !== 'string') return 'Motivo é obrigatório.';
  const trimmed = motivo.trim();
  if (trimmed.length < 5) return 'Motivo deve ter pelo menos 5 caracteres.';
  if (trimmed.length > 500) return 'Motivo não pode ultrapassar 500 caracteres.';
  return null;
}

export function validateSetor(setor) {
  if (!setor || typeof setor !== 'string') return 'Setor é obrigatório.';
  const trimmed = setor.trim();
  if (trimmed.length === 0) return 'Setor não pode ser vazio.';
  if (trimmed.length > 100) return 'Setor não pode ultrapassar 100 caracteres.';
  return null;
}
