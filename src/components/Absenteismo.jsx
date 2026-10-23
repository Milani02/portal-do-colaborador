import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import { Table2, BarChart3, Info } from 'lucide-react';
import { toast } from '../utils/toast';
import {
  CATEGORIAS, JORNADA_HORAS, calcularAbsenteismo, montarHeadcount, rotuloMes, ultimosMeses,
} from '../utils/absenteismo';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const PERIODOS = [
  { id: '3', label: '3 meses', meses: 3 },
  { id: '6', label: '6 meses', meses: 6 },
  { id: '12', label: '12 meses', meses: 12 },
];

const CAT_INFO = {
  descontado: { label: 'Descontado', cor: 'var(--abs-descontado)' },
  abonado:    { label: 'Abonado',    cor: 'var(--abs-abonado)' },
  aguardando: { label: 'Aguardando gestor', cor: 'var(--abs-aguardando)' },
};

const pct = (v, casas = 1) => `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const num = (v, casas = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

// Teto "redondo" do eixo e o passo das linhas de grade (em fração: 0.01 = 1%).
function escala(max) {
  const alvo = Math.max(max, 0.005) / 4;
  const passos = [0.0025, 0.005, 0.01, 0.02, 0.025, 0.05, 0.1];
  const passo = passos.find(p => p >= alvo) || 0.1;
  return { passo, teto: Math.ceil(Math.max(max, 0.0001) / passo) * passo };
}

export default function Absenteismo({ ocorrencias, carregando }) {
  const [perfis, setPerfis] = useState(null);
  const [periodo, setPeriodo] = useState('6');
  const [setor, setSetor] = useState('todos');
  const [verTabela, setVerTabela] = useState(false);
  const [mesAtivo, setMesAtivo] = useState(null);
  // "Hoje" fixado na montagem: Date não pode ser lido durante o render.
  const [hoje] = useState(() => new Date());

  useEffect(() => {
    supabase.from('profiles').select('cargo, setor').then(({ data, error }) => {
      if (error) { toast('Erro ao carregar os setores para o absenteísmo.', 'error'); setPerfis([]); return; }
      setPerfis(data || []);
    });
  }, []);

  const headcount = useMemo(() => (perfis ? montarHeadcount(perfis) : {}), [perfis]);
  const meses = useMemo(() => ultimosMeses(PERIODOS.find(p => p.id === periodo).meses, hoje), [periodo, hoje]);
  const filtroSetor = setor === 'todos' ? null : setor;
  const r = useMemo(
    () => calcularAbsenteismo(ocorrencias, headcount, meses, filtroSetor, hoje),
    [ocorrencias, headcount, meses, filtroSetor, hoje],
  );

  const loading = carregando || perfis === null;
  const nomeSetor = filtroSetor ? headcount[filtroSetor]?.nome : null;
  const { passo, teto } = escala(Math.max(...r.mensal.map(m => m.taxa)));
  const grade = Array.from({ length: Math.round(teto / passo) + 1 }, (_, i) => i * passo);
  const maxSetor = Math.max(...r.setores.map(s => s.taxa), r.taxaEmpresa, 0.0001);
  const pior = r.setores.find(s => s.taxa > 0);
  const opcoesSetor = Object.entries(headcount).sort((a, b) => a[1].nome.localeCompare(b[1].nome, 'pt-BR'));

  return (
    <motion.section
      className="vision-card abs-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="abs-titulo"
    >
      <header className="abs-header">
        <div>
          <h2 id="abs-titulo" className="section-title">Absenteísmo</h2>
          <p className="abs-sub">
            Dias perdidos com faltas e atrasos ÷ dias úteis da equipe
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="abs-info" aria-label="Como a taxa é calculada">
                  <Info size={13} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Faltas contam 1 dia por dia útil (ou proporcional às horas, se foi parte do dia). Atrasos e saídas contam as horas ÷ {num(JORNADA_HORAS)}h de jornada.</p>
                <p style={{ marginTop: 4 }}>Base: colaboradores cadastrados no portal × dias úteis (seg–sex) de cada mês. Ocorrências reprovadas pelo gestor não entram.</p>
              </TooltipContent>
            </Tooltip>
          </p>
        </div>

        <div className="abs-filtros">
          <div className="abs-segmento" role="radiogroup" aria-label="Período">
            {PERIODOS.map(p => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={periodo === p.id}
                className={periodo === p.id ? 'ativo' : ''}
                onClick={() => setPeriodo(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Select value={setor} onValueChange={setSetor}>
            <SelectTrigger className="h-8 w-44 text-sm" aria-label="Setor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="todos">Empresa toda</SelectItem>
                {opcoesSetor.map(([chave, h]) => (
                  <SelectItem key={chave} value={chave}>{h.nome}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="abs-numeros">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <>
          <div className="abs-numeros">
            <div className="abs-numero">
              <span className="abs-numero-rotulo">Taxa {nomeSetor ? `· ${nomeSetor}` : 'da empresa'}</span>
              <span className="abs-numero-valor">{pct(r.taxa, 2)}</span>
              <span className="abs-numero-det">
                {nomeSetor
                  ? <>empresa: {pct(r.taxaEmpresa, 2)}</>
                  : <>{r.pessoas} colaboradores · {meses.length} meses</>}
              </span>
            </div>
            <div className="abs-numero">
              <span className="abs-numero-rotulo">Dias perdidos</span>
              <span className="abs-numero-valor">{num(r.totalDias)}</span>
              <span className="abs-numero-det">
                {num(r.somaDias.abonado)} abonados · {num(r.somaDias.descontado)} descontados
              </span>
            </div>
            <div className="abs-numero">
              <span className="abs-numero-rotulo">Maior taxa por setor</span>
              <span className="abs-numero-valor abs-numero-valor-texto">{pior ? pior.nome : '—'}</span>
              <span className="abs-numero-det">{pior ? `${pct(pior.taxa, 2)} · ${pior.pessoas} pessoas` : 'Sem ausências no período'}</span>
            </div>
          </div>

          <div className="abs-bloco">
            <div className="abs-bloco-topo">
              <h3 className="abs-bloco-titulo">Taxa mensal{nomeSetor ? ` · ${nomeSetor}` : ''}</h3>
              <div className="abs-legenda" aria-label="Legenda">
                {CATEGORIAS.map(c => (
                  <span key={c}><i style={{ background: CAT_INFO[c].cor }} />{CAT_INFO[c].label}</span>
                ))}
              </div>
              <button type="button" className="abs-toggle" onClick={() => setVerTabela(v => !v)} aria-pressed={verTabela}>
                {verTabela ? <><BarChart3 size={14} /> Ver gráfico</> : <><Table2 size={14} /> Ver tabela</>}
              </button>
            </div>

            {verTabela ? (
              <div className="abs-tabela-wrap">
                <table className="abs-tabela">
                  <thead>
                    <tr>
                      <th>Mês</th><th>Taxa</th><th>Dias perdidos</th>
                      {CATEGORIAS.map(c => <th key={c}>{CAT_INFO[c].label}</th>)}
                      <th>Ocorrências</th><th>Dias úteis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.mensal.map(m => (
                      <tr key={m.mes}>
                        <td>{rotuloMes(m.mes)}</td>
                        <td><strong>{pct(m.taxa, 2)}</strong></td>
                        <td>{num(m.totalDias)}</td>
                        {CATEGORIAS.map(c => <td key={c}>{num(m.dias[c])}</td>)}
                        <td>{m.ocorrencias}</td>
                        <td>{m.diasUteis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="abs-grafico" onMouseLeave={() => setMesAtivo(null)}>
                <div className="abs-eixo-y" aria-hidden="true">
                  {grade.map(g => (
                    <span key={g} style={{ bottom: `${(g / teto) * 100}%` }}>{pct(g, passo < 0.01 ? 1 : 0)}</span>
                  ))}
                </div>
                <div className="abs-plot">
                  <div className="abs-grade-camada" aria-hidden="true">
                    {grade.map(g => (
                      <div key={g} className={`abs-grade${g === 0 ? ' base' : ''}`} style={{ bottom: `${(g / teto) * 100}%` }} />
                    ))}
                  </div>
                  {r.mensal.map((m, i) => {
                    const ativo = mesAtivo === i;
                    const atual = i === r.mensal.length - 1;
                    return (
                      <div key={m.mes} className="abs-coluna">
                        <button
                          type="button"
                          className={`abs-alvo${ativo ? ' ativo' : ''}`}
                          onMouseEnter={() => setMesAtivo(i)}
                          onFocus={() => setMesAtivo(i)}
                          onBlur={() => setMesAtivo(null)}
                          aria-label={`${rotuloMes(m.mes)}: taxa ${pct(m.taxa, 2)}, ${num(m.totalDias)} dias perdidos`}
                        >
                          {m.taxa > 0 && (
                            <span className="abs-total" style={{ bottom: `calc(${(m.taxa / teto) * 100}% + 4px)` }}>
                              {m.taxa < 0.001 ? '<0,1%' : pct(m.taxa)}
                            </span>
                          )}
                          <span className="abs-barra" style={{ height: `${(m.taxa / teto) * 100}%` }}>
                            {[...CATEGORIAS].reverse().map(c => m.taxaPor[c] > 0 && (
                              <span key={c} className="abs-seg" style={{ flexGrow: m.taxaPor[c] / m.taxa, background: CAT_INFO[c].cor }} />
                            ))}
                          </span>
                        </button>
                        <span className="abs-mes">{rotuloMes(m.mes, meses.length <= 6)}{atual ? '*' : ''}</span>

                        {ativo && (
                          <div className={`abs-tip${i >= r.mensal.length - 2 ? ' esq' : ''}`} role="status">
                            <div className="abs-tip-titulo">{rotuloMes(m.mes)} · {pct(m.taxa, 2)}</div>
                            {CATEGORIAS.map(c => (
                              <div key={c} className="abs-tip-linha">
                                <i style={{ background: CAT_INFO[c].cor }} />
                                <span>{CAT_INFO[c].label}</span>
                                <strong>{num(m.dias[c])} d</strong>
                              </div>
                            ))}
                            <div className="abs-tip-rodape">{m.ocorrencias} ocorrências · {m.diasUteis} dias úteis{atual ? ' até hoje' : ''}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="abs-nota">* Mês atual: conta só os dias úteis até hoje.</p>
          </div>

          <div className="abs-bloco">
            <div className="abs-bloco-topo">
              <h3 className="abs-bloco-titulo">Por setor · últimos {meses.length} meses</h3>
              <span className="abs-legenda"><span><i className="abs-ref-amostra" />Média da empresa {pct(r.taxaEmpresa, 2)}</span></span>
            </div>
            <ul className="abs-setores">
              {r.setores.map(s => (
                <li key={s.chave}>
                  <button
                    type="button"
                    className={`abs-setor${filtroSetor === s.chave ? ' ativo' : ''}`}
                    onClick={() => setSetor(filtroSetor === s.chave ? 'todos' : s.chave)}
                    aria-pressed={filtroSetor === s.chave}
                    title={`${s.nome}: ${num(s.dias)} dias perdidos, ${s.ocorrencias} ocorrências, ${s.pessoas} pessoas. Clique para filtrar o gráfico mensal.`}
                  >
                    <span className="abs-setor-nome">{s.nome}<small>{s.pessoas} pess.</small></span>
                    <span className="abs-setor-trilho">
                      <span className="abs-setor-barra" style={{ width: `${(s.taxa / maxSetor) * 100}%` }} />
                      <span className="abs-setor-ref" style={{ left: `${(r.taxaEmpresa / maxSetor) * 100}%` }} aria-hidden="true" />
                    </span>
                    <span className="abs-setor-valor">{pct(s.taxa, 2)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {r.semCadastro.length > 0 && (
              <p className="abs-nota">
                Fora da conta por não ter ninguém cadastrado no setor: {r.semCadastro.join(', ')}.
              </p>
            )}
          </div>
        </>
      )}
    </motion.section>
  );
}
