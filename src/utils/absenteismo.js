import { normalizeSetor } from './string';

/* Absenteísmo = dias perdidos ÷ (colaboradores × dias úteis).
   Entram faltas e atrasos/saídas antecipadas, abonados ou não; ocorrências
   reprovadas pelo gestor ficam de fora (o gestor não reconheceu a ausência). */

export const JORNADA_HORAS = 8.8; // 44h semanais ÷ 5 dias (CLT)
export const TIPOS_AUSENCIA = ['falta', 'atraso/saida antecipada'];
export const CATEGORIAS = ['descontado', 'abonado', 'aguardando'];

const chaveMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const inicioDoDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const ehDiaUtil = (d) => d.getDay() !== 0 && d.getDay() !== 6;

export function categoriaDe(o) {
  if (o.status_gestor === 'pendente') return 'aguardando';
  return o.acao_gestor === 'descontar' ? 'descontado' : 'abonado';
}

/** Dias perdidos de uma ocorrência, distribuídos pelos meses: [['AAAA-MM', dias], ...] */
export function diasPerdidos(o) {
  const ini = new Date(o.data_hora);
  const fim = o.data_hora_fim ? new Date(o.data_hora_fim) : null;
  const horas = fim ? (fim - ini) / 36e5 : null;

  if (o.tipo === 'atraso/saida antecipada') {
    // Sem horário final não dá para saber quanto tempo foi perdido.
    if (horas == null || horas <= 0) return [];
    return [[chaveMes(ini), Math.min(horas, JORNADA_HORAS) / JORNADA_HORAS]];
  }

  // Falta no mesmo dia: proporcional às horas (sem fim ou < 1h conta o dia todo).
  const diaIni = inicioDoDia(ini);
  const diaFim = fim ? inicioDoDia(fim) : diaIni;
  if (diaFim <= diaIni) {
    const dias = horas != null && horas >= 1 ? Math.min(horas / JORNADA_HORAS, 1) : 1;
    return [[chaveMes(ini), dias]];
  }

  // Falta de vários dias: cada dia útil do período conta 1, no mês em que cai.
  const porMes = {};
  for (let d = diaIni; d <= diaFim; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (ehDiaUtil(d)) porMes[chaveMes(d)] = (porMes[chaveMes(d)] || 0) + 1;
  }
  return Object.entries(porMes);
}

/** Dias úteis (seg–sex) do mês; no mês corrente, só até `hoje`. */
export function diasUteisDoMes(chave, hoje) {
  const [a, m] = chave.split('-').map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  const limite = chaveMes(hoje) === chave ? hoje.getDate() : ultimo;
  let n = 0;
  for (let dia = 1; dia <= limite; dia++) if (ehDiaUtil(new Date(a, m - 1, dia))) n++;
  return n;
}

/** Últimos `n` meses até o atual, do mais antigo ao mais recente. */
export function ultimosMeses(n, hoje) {
  return Array.from({ length: n }, (_, i) => chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1 - i), 1)));
}

export function rotuloMes(chave, comAno = true) {
  const [a, m] = chave.split('-').map(Number);
  const mes = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return comAno ? `${mes}/${String(a).slice(2)}` : mes;
}

/**
 * Agrega tudo de uma vez.
 * @param ocorrencias  linhas de `ocorrencias`
 * @param headcount    { [setorNormalizado]: { nome, total } }
 * @param meses        chaves 'AAAA-MM' do período
 * @param setor        setor normalizado ou null (empresa toda)
 */
export function calcularAbsenteismo(ocorrencias, headcount, meses, setor, hoje) {
  const noPeriodo = new Set(meses);
  const vazioCat = () => ({ descontado: 0, abonado: 0, aguardando: 0 });
  const porMes = Object.fromEntries(meses.map(m => [m, { dias: vazioCat(), ocorrencias: 0 }]));
  const porSetor = {};

  for (const o of ocorrencias) {
    if (!TIPOS_AUSENCIA.includes(o.tipo) || o.status_gestor === 'reprovado') continue;
    const s = normalizeSetor(o.setor);
    const cat = categoriaDe(o);
    const partes = diasPerdidos(o).filter(([mes]) => noPeriodo.has(mes));
    if (!partes.length) continue;
    porSetor[s] ??= { dias: 0, ocorrencias: 0 };
    porSetor[s].ocorrencias++;
    const doFiltro = (!setor || s === setor) && !!headcount[s];
    if (doFiltro) porMes[partes[0][0]].ocorrencias++;
    for (const [mes, dias] of partes) {
      porSetor[s].dias += dias;
      if (doFiltro) porMes[mes].dias[cat] += dias;
    }
  }

  const diasUteis = Object.fromEntries(meses.map(m => [m, diasUteisDoMes(m, hoje)]));
  const totalDiasUteis = meses.reduce((n, m) => n + diasUteis[m], 0);
  const pessoasEmpresa = Object.values(headcount).reduce((n, h) => n + h.total, 0);
  const pessoas = setor ? headcount[setor]?.total || 0 : pessoasEmpresa;

  const mensal = meses.map((m) => {
    const base = pessoas * diasUteis[m];
    const d = porMes[m].dias;
    const totalDias = d.descontado + d.abonado + d.aguardando;
    return {
      mes: m,
      diasUteis: diasUteis[m],
      ocorrencias: porMes[m].ocorrencias,
      dias: d,
      totalDias,
      taxa: base ? totalDias / base : 0,
      taxaPor: Object.fromEntries(CATEGORIAS.map(c => [c, base ? d[c] / base : 0])),
    };
  });

  const somaDias = vazioCat();
  for (const m of mensal) for (const c of CATEGORIAS) somaDias[c] += m.dias[c];
  const totalDias = somaDias.descontado + somaDias.abonado + somaDias.aguardando;
  const baseTotal = pessoas * totalDiasUteis;

  const setores = Object.entries(headcount)
    .map(([chave, h]) => {
      const dias = porSetor[chave]?.dias || 0;
      return {
        chave,
        nome: h.nome,
        pessoas: h.total,
        dias,
        ocorrencias: porSetor[chave]?.ocorrencias || 0,
        taxa: h.total && totalDiasUteis ? dias / (h.total * totalDiasUteis) : 0,
      };
    })
    .sort((a, b) => b.taxa - a.taxa);

  // Ausências de setores sem ninguém cadastrado não entram em nenhuma taxa.
  const semCadastro = Object.keys(porSetor).filter(s => !headcount[s]);

  const diasComCadastro = Object.entries(porSetor).filter(([s]) => headcount[s]).reduce((n, [, v]) => n + v.dias, 0);
  const taxaEmpresa = pessoasEmpresa && totalDiasUteis ? diasComCadastro / (pessoasEmpresa * totalDiasUteis) : 0;

  return {
    mensal,
    pessoas,
    totalDias,
    somaDias,
    taxa: baseTotal ? totalDias / baseTotal : 0,
    taxaEmpresa,
    setores,
    semCadastro,
  };
}

/** Headcount atual por setor (sem admin), com o nome mais usado do setor. */
export function montarHeadcount(perfis) {
  const grupos = {};
  for (const p of perfis) {
    if (p.cargo === 'admin' || !p.setor) continue;
    const chave = normalizeSetor(p.setor);
    grupos[chave] ??= { total: 0, nomes: {} };
    grupos[chave].total++;
    const nome = p.setor.trim();
    grupos[chave].nomes[nome] = (grupos[chave].nomes[nome] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(grupos).map(([chave, g]) => {
    const nome = Object.entries(g.nomes).sort((a, b) => b[1] - a[1])[0][0];
    // Siglas ("cq/pdi", "ti") em maiúsculas; o resto só com a inicial maiúscula.
    const sigla = nome.includes('/') || nome.length <= 3;
    return [chave, { total: g.total, nome: sigla ? nome.toUpperCase() : nome.charAt(0).toUpperCase() + nome.slice(1) }];
  }));
}
