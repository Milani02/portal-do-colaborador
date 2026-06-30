import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion } from 'framer-motion';
import { Search, FileDown, X, CheckCircle, XCircle, Clock, Pencil, ClipboardCheck, SearchX, Paperclip } from 'lucide-react';
import { Pagination } from './components/Pagination';

const PER_PAGE = 15;
import { useAuthGuard } from './hooks/useAuthGuard';
import TopBar from './components/TopBar';
import LoadingScreen from './components/LoadingScreen';
import StatCard from './components/StatCard';
import { containerVariants } from './utils/animations';
import { toast } from './utils/toast';
import { relativeDate, exactDatetime, shortDate } from './utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from './components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import './index.css';

function SkeletonTableRows({ cols = 7, rows = 5 }) {
  const ws = ['w-20', 'w-36', 'w-24', 'w-44', 'w-20', 'w-44', 'w-24'];
  return Array.from({ length: rows }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <TableCell key={j}><Skeleton className={`h-3.5 ${ws[j] || 'w-20'}`} /></TableCell>
      ))}
    </TableRow>
  ));
}

export default function GestorDashboard() {
  const { perfil, loading, logout } = useAuthGuard('gestor');
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [acoesSelecionadas, setAcoesSelecionadas] = useState({});
  const [observacoesGestor, setObservacoesGestor] = useState({});
  const [editandoId, setEditandoId] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [search, setSearch] = useState('');
  const [acaoErros, setAcaoErros] = useState({});
  const [page, setPage] = useState(1);
  const avaliacaoRefs = useRef({});

  const fetchOcorrencias = useCallback(async () => {
    if (!perfil?.setor) return;
    const { data, error } = await supabase
      .from('ocorrencias')
      .select('*, colaborador:profiles!ocorrencias_colaborador_id_fkey (nome_completo)')
      // Comparação resiliente: ignora maiúsculas/minúsculas e espaços nas pontas,
      // para o roteamento não quebrar com "Produção" vs "produção" etc.
      .ilike('setor', perfil.setor.trim())
      .order('created_at', { ascending: false });
    if (error) { toast('Erro ao carregar ocorrências.', 'error'); return; }
    if (data) setOcorrencias(data);
    setLoadingData(false);
  }, [perfil?.setor]);

  useEffect(() => {
    if (!perfil) return;
    void fetchOcorrencias(); // eslint-disable-line react-hooks/set-state-in-effect
    const channel = supabase
      .channel(`gestor-ocos-${perfil.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ocorrencias' }, fetchOcorrencias)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [perfil?.id, fetchOcorrencias]);

  const verAtestado = async (valor) => {
    // Aceita o caminho novo OU a URL pública antiga (extrai o caminho após /atestados/).
    const m = valor.match(/\/atestados\/(.+?)(?:\?|$)/);
    const path = m ? decodeURIComponent(m[1]) : valor;
    // Bucket privado: gera signed URL (60s) para visualizar inline. Gestor não tem "baixar".
    const { data, error } = await supabase.storage
      .from('atestados')
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast('Não foi possível abrir o atestado.', 'error'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAcaoChange = (id, valor) => {
    setAcoesSelecionadas((prev) => ({ ...prev, [id]: valor }));
    setAcaoErros((prev) => ({ ...prev, [id]: null }));
  };

  const iniciarEdicao = (oco) => {
    setEditandoId(oco.id);
    setAcoesSelecionadas(prev => ({ ...prev, [oco.id]: oco.acao_gestor || '' }));
    setObservacoesGestor(prev => ({ ...prev, [oco.id]: oco.observacao_gestor || '' }));
  };

  const avaliarOcorrencia = async (id, status) => {
    if (avaliacaoRefs.current[id]) return;
    const acao = acoesSelecionadas[id];
    if (status === 'aprovado' && !acao) {
      setAcaoErros((prev) => ({ ...prev, [id]: 'Selecione "Abonar" ou "Descontar" antes de aprovar.' }));
      return;
    }
    avaliacaoRefs.current[id] = true;
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .update({
          gestor_id: perfil.id,
          status_gestor: status,
          acao_gestor: status === 'aprovado' ? acao : null,
          observacao_gestor: (observacoesGestor[id] || '').trim() || null,
        })
        .eq('id', id);
      if (error) { toast('Erro ao processar. Tente novamente.', 'error'); }
      else {
        toast(status === 'aprovado' ? 'Ocorrência aprovada!' : 'Ocorrência reprovada.');
        setEditandoId(null);
        fetchOcorrencias();
      }
    } catch {
      toast('Erro inesperado. Tente novamente.', 'error');
    } finally {
      avaliacaoRefs.current[id] = false;
    }
  };

  const exportarPDF = () => {
    const filtradas = filtradaPorData;
    if (!filtradas.length) { toast('Nenhuma ocorrência no período selecionado.', 'error'); return; }
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Relatório — Setor: ${perfil.setor}`, 14, 15);
      doc.setFontSize(9);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);
      autoTable(doc, {
        head: [['Data', 'Colaborador', 'Tipo', 'Motivo', 'Status', 'Ação', 'Observação', 'Atestado']],
        body: filtradas.map((o) => [
          shortDate(o.data_hora),
          o.colaborador?.nome_completo || '-',
          o.tipo || '-',
          (o.motivo || '').substring(0, 60),
          (o.status_gestor || '-').toUpperCase(),
          (o.acao_gestor || '-').toUpperCase(),
          o.observacao_gestor || '-',
          o.atestado_url ? 'Sim' : '—',
        ]),
        startY: 28,
        styles: { fontSize: 7.5 },
        headStyles: { fillColor: [92, 108, 36] },
        columnStyles: { 3: { cellWidth: 50 } },
      });
      doc.save(`Relatorio_Gestor_${perfil.setor}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast('PDF exportado com sucesso!');
    } catch {
      toast('Falha ao gerar PDF.', 'error');
    }
  };

  if (loading) return <LoadingScreen />;
  if (!perfil) return null;

  const counts = { total: ocorrencias.length, pendente: 0, aprovado: 0, reprovado: 0 };
  for (const o of ocorrencias) {
    if (o.status_gestor === 'pendente') counts.pendente++;
    else if (o.status_gestor === 'aprovado') counts.aprovado++;
    else if (o.status_gestor === 'reprovado') counts.reprovado++;
  }

  const toggleFilter = (status) => { setFilterStatus(prev => prev === status ? null : status); setPage(1); };

  const term = search.trim().toLowerCase();
  const filtradaPorData = ocorrencias.filter((o) => {
    if (!dataInicio && !dataFim) return true;
    const d = new Date(o.created_at);
    const ini = dataInicio ? new Date(`${dataInicio}T00:00:00`) : new Date('2000-01-01');
    const fim = dataFim   ? new Date(`${dataFim}T23:59:59`)    : new Date('2100-01-01');
    return d >= ini && d <= fim;
  });
  const visiveisBusca = term
    ? filtradaPorData.filter(o => (o.colaborador?.nome_completo || '').toLowerCase().includes(term))
    : filtradaPorData;
  const visiveis = filterStatus
    ? visiveisBusca.filter(o => o.status_gestor === filterStatus)
    : visiveisBusca;
  const paginados = visiveis.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="dashboard-aurora-bg">
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <TopBar
        nome={perfil.nome_completo}
        cargo={perfil.cargo}
        role={`Gestor — ${perfil.setor}`}
        onLogout={logout}
        pendingCount={counts.pendente}
      />

      <div className="app-container">
        <motion.div
          className="dash-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="page-title">Olá, <span className="page-title-name">{perfil.nome_completo.split(' ')[0]}</span>.</h1>
          <p className="page-subtitle">Aprovação de ocorrências — {perfil.setor}</p>
          <div className="stat-grid">
            <StatCard icon={<Clock size={20}/>}        value={counts.total}     label="Total no setor"    color="#0f172a" bg="#f1f5f9" delay={0.05} onClick={() => toggleFilter(null)}       active={filterStatus === null} />
            <StatCard icon={<Clock size={20}/>}        value={counts.pendente}  label="Aguardando"        color="#d97706" bg="#fef3c7" delay={0.10} onClick={() => toggleFilter('pendente')}  active={filterStatus === 'pendente'} />
            <StatCard icon={<CheckCircle size={20}/>}  value={counts.aprovado}  label="Aprovadas"         color="#059669" bg="#ecfdf5" delay={0.15} onClick={() => toggleFilter('aprovado')}  active={filterStatus === 'aprovado'} />
            <StatCard icon={<XCircle size={20}/>}      value={counts.reprovado} label="Reprovadas"        color="#dc2626" bg="#fef2f2" delay={0.20} onClick={() => toggleFilter('reprovado')} active={filterStatus === 'reprovado'} />
          </div>
        </motion.div>

        <motion.section variants={containerVariants} initial="hidden" animate="show" className="vision-card">
          <div className="section-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="section-title">Equipe de {perfil.setor}</h2>
              {filterStatus && (
                <button
                  onClick={() => setFilterStatus(null)}
                  style={{
                    fontSize: '0.7rem', fontWeight: '700', color: 'var(--primary)',
                    background: 'rgba(92,108,36,0.08)', border: '1px solid rgba(92,108,36,0.2)',
                    borderRadius: '999px', padding: '0.18rem 0.6rem', cursor: 'pointer',
                  }}
                >
                  × Limpar filtro
                </button>
              )}
              {!loadingData && <span className="live-dot">ao vivo</span>}
            </div>
            <div className="filter-container" style={{ flex: 'none' }}>
              <div className="search-wrap">
                <Search className="search-icon" aria-hidden="true" />
                <Input
                  type="search"
                  className="h-8 w-48 text-sm"
                  placeholder="Buscar colaborador..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar por colaborador"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="g-ini" className="text-xs text-muted-foreground font-medium">Enviado de</label>
                <Input id="g-ini" type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="g-fim" className="text-xs text-muted-foreground font-medium">Até</label>
                <Input id="g-fim" type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
              </div>
              <Button size="sm" onClick={exportarPDF} className="gap-1.5">
                <FileDown data-icon="inline-start" />
                PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setDataInicio(''); setDataFim(''); setSearch(''); setPage(1); }}>
                <X data-icon="inline-start" />
                Limpar
              </Button>
            </div>
          </div>

          {!loadingData && ocorrencias.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ClipboardCheck size={30} /></div>
              <p className="empty-state-title">Nenhuma ocorrência encontrada</p>
              <p className="empty-state-desc">Quando sua equipe registrar ocorrências, elas aparecerão aqui.</p>
            </div>
          ) : !loadingData && visiveis.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><SearchX size={30} /></div>
              <p className="empty-state-title">Nenhum resultado</p>
              <p className="empty-state-desc">Tente ajustar os filtros de busca ou período.</p>
            </div>
          ) : (
            <>
            <div className="table-container">
              <Table aria-label="Ocorrências do setor">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação / Observação</TableHead>
                    <TableHead>Decisão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingData ? (
                    <SkeletonTableRows cols={7} rows={5} />
                  ) : (
                    paginados.map((oco) => (
                      <TableRow key={oco.id}>
                        <TableCell style={{ fontWeight: '700', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div style={{ cursor: 'default' }}>
                                <div>{shortDate(oco.data_hora)}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                  {relativeDate(oco.created_at)}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div>Ocorrência: {exactDatetime(oco.data_hora)}</div>
                              <div>Enviado: {exactDatetime(oco.created_at)}</div>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                          {oco.colaborador?.nome_completo || '-'}
                        </TableCell>
                        <TableCell style={{ textTransform: 'capitalize' }}>{oco.tipo}</TableCell>
                        <TableCell style={{ maxWidth: '180px', fontSize: '0.85rem' }}>
                          <div
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}
                            title={oco.motivo}
                          >
                            {oco.motivo}
                          </div>
                          {oco.atestado_url && (
                            <button
                              type="button"
                              onClick={() => verAtestado(oco.atestado_url)}
                              title="Visualizar atestado (download apenas pelo RH)"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              <Paperclip size={11} /> Ver atestado
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          {oco.status_gestor === 'aprovado'  && <StatusBadge status="aprovado"  label="Aprovado"   icon={CheckCircle} />}
                          {oco.status_gestor === 'reprovado' && <StatusBadge status="reprovado" label="Reprovado"  icon={XCircle} />}
                          {oco.status_gestor === 'pendente'  && <StatusBadge status="pendente"  label="Aguardando" icon={Clock} />}
                        </TableCell>
                        <TableCell>
                          {(oco.status_gestor === 'pendente' || editandoId === oco.id) ? (
                            <div className="flex flex-col gap-1.5" style={{ minWidth: '190px' }}>
                              <Select
                                value={acoesSelecionadas[oco.id] || ''}
                                onValueChange={(val) => handleAcaoChange(oco.id, val)}
                              >
                                <SelectTrigger className="h-8 text-sm" aria-label={`Ação para ${oco.colaborador?.nome_completo}`}>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectItem value="abonar">Abonar</SelectItem>
                                    <SelectItem value="descontar">Descontar</SelectItem>
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                              <Textarea
                                value={observacoesGestor[oco.id] || ''}
                                onChange={(e) => setObservacoesGestor(prev => ({ ...prev, [oco.id]: e.target.value }))}
                                placeholder="Observação (opcional)..."
                                maxLength={300}
                                className="text-sm min-h-[60px] resize-y"
                              />
                              {acaoErros[oco.id] && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-danger)', fontWeight: '600' }}>
                                  {acaoErros[oco.id]}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span style={{ fontWeight: '700', textTransform: 'capitalize', color: 'var(--text-sub)' }}>
                                {oco.acao_gestor || '—'}
                              </span>
                              {oco.observacao_gestor && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '180px' }}>
                                  "{oco.observacao_gestor}"
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {(oco.status_gestor === 'pendente' || editandoId === oco.id) ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-none gap-1"
                                  onClick={() => avaliarOcorrencia(oco.id, 'aprovado')}
                                  aria-label={`Aprovar ocorrência de ${oco.colaborador?.nome_completo}`}
                                >
                                  <CheckCircle data-icon="inline-start" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1"
                                  onClick={() => avaliarOcorrencia(oco.id, 'reprovado')}
                                  aria-label={`Reprovar ocorrência de ${oco.colaborador?.nome_completo}`}
                                >
                                  <XCircle data-icon="inline-start" />
                                  Reprovar
                                </Button>
                              </div>
                              {editandoId === oco.id && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => setEditandoId(null)}
                                  className="self-start text-muted-foreground"
                                >
                                  Cancelar
                                </Button>
                              )}
                            </div>
                          ) : oco.status_rh === 'pendente' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => iniciarEdicao(oco)}
                              className="gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                            >
                              <Pencil data-icon="inline-start" />
                              Editar
                            </Button>
                          ) : (
                            <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem', fontWeight: '600' }}>Bloqueado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination total={visiveis.length} page={page} perPage={PER_PAGE} onPageChange={setPage} />
            </>
          )}
        </motion.section>
      </div>
    </div>
  );
}
