import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileDown, X, CheckCircle, XCircle, Clock, BadgeCheck, ClipboardList, SearchX, Paperclip } from 'lucide-react';
import { Pagination } from './components/Pagination';

const PER_PAGE = 15;
import { useAuthGuard } from './hooks/useAuthGuard';
import TopBar from './components/TopBar';
import LoadingScreen from './components/LoadingScreen';
import StatCard from './components/StatCard';
import { containerVariants } from './utils/animations';
import { toast } from './utils/toast';
import { relativeDate, exactDatetime, shortDatetime } from './utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatusBadge } from './components/StatusBadge';
import { ExpandableText } from './components/ExpandableText';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import './index.css';

// Registros novos guardam vários caminhos em `atestados`; os antigos, um único em `atestado_url`.
const listaAtestados = (oco) =>
  oco.atestados?.length ? oco.atestados : oco.atestado_url ? [oco.atestado_url] : [];

function SkeletonTableRows({ cols = 8, rows = 6 }) {
  const ws = ['w-20', 'w-24', 'w-36', 'w-20', 'w-44', 'w-24', 'w-24', 'w-24'];
  return Array.from({ length: rows }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <TableCell key={j}><Skeleton className={`h-3.5 ${ws[j] || 'w-20'}`} /></TableCell>
      ))}
    </TableRow>
  ));
}

export default function RhDashboard() {
  const { perfil, loading, logout } = useAuthGuard('rh');
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [search, setSearch] = useState('');
  const [obsRhTexto, setObsRhTexto] = useState({});
  const [expandidoId, setExpandidoId] = useState(null);
  const [page, setPage] = useState(1);
  const [cardAbertoId, setCardAbertoId] = useState(null);
  const cienteRefs = useRef({});

  // Mobile: cartões recolhidos por padrão; toque expande (sem efeito no desktop).
  const toggleCard = (e, id) => {
    if (e.target.closest('button, a, input, textarea, [role="combobox"]')) return;
    setCardAbertoId(prev => (prev === id ? null : id));
  };

  const perfilId = perfil?.id;

  const fetchOcorrencias = useCallback(async () => {
    if (!perfilId) return;
    const { data, error } = await supabase
      .from('ocorrencias')
      .select('*, colaborador:colaborador_id (nome_completo), gestor:gestor_id (nome_completo)')
      .order('created_at', { ascending: false });
    if (error) { toast('Erro ao carregar dados.', 'error'); return; }
    if (data) setOcorrencias(data);
    setLoadingData(false);
  }, [perfilId]);

  useEffect(() => {
    if (!perfilId) return;
    void fetchOcorrencias(); // eslint-disable-line react-hooks/set-state-in-effect
    const channel = supabase
      .channel(`rh-ocos-${perfilId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ocorrencias' }, fetchOcorrencias)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [perfilId, fetchOcorrencias]);

  const darCiente = async (id) => {
    if (cienteRefs.current[id]) return;
    cienteRefs.current[id] = true;
    try {
      const { error } = await supabase.from('ocorrencias').update({
        rh_id: perfil.id,
        status_rh: 'recebido',
        observacao_rh: (obsRhTexto[id] || '').trim() || null,
      }).eq('id', id);
      if (error) { toast('Erro ao registrar ciência.', 'error'); }
      else { toast('Ciência registrada com sucesso!'); setExpandidoId(null); fetchOcorrencias(); }
    } catch {
      toast('Erro inesperado.', 'error');
    } finally {
      cienteRefs.current[id] = false;
    }
  };

  const baixarAtestado = async (valor) => {
    // Aceita o caminho novo OU a URL pública antiga (extrai o caminho após /atestados/).
    const m = valor.match(/\/atestados\/(.+?)(?:\?|$)/);
    const path = m ? decodeURIComponent(m[1]) : valor;
    // Bucket privado: signed URL (60s) com download forçado (Content-Disposition: attachment).
    const { data, error } = await supabase.storage
      .from('atestados')
      .createSignedUrl(path, 60, { download: true });
    if (error || !data?.signedUrl) { toast('Não foi possível baixar o atestado.', 'error'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const exportarPDF = () => {
    // Exporta exatamente o que está na tela: período + busca (nome/setor) + filtro de status.
    const filtradas = visiveis;
    if (!filtradas.length) { toast('Nenhuma ocorrência com os filtros selecionados.', 'error'); return; }
    try {
      const doc = new jsPDF('landscape');
      doc.setFontSize(14);
      doc.text('Relatório Geral de Ocorrências — RH', 14, 15);
      doc.setFontSize(9);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);
      autoTable(doc, {
        head: [['Data/Hora', 'Setor', 'Colaborador', 'Tipo', 'Motivo', 'Gestor', 'Aprov. Gestor', 'Ação', 'Status RH', 'Obs. RH', 'Atestado']],
        body: filtradas.map((o) => [
          o.data_hora_fim
            ? `${exactDatetime(o.data_hora)}\naté ${exactDatetime(o.data_hora_fim)}`
            : exactDatetime(o.data_hora),
          o.setor || '-',
          o.colaborador?.nome_completo || '-',
          o.tipo || '-',
          o.motivo || '-',
          o.status_gestor !== 'pendente' ? (o.gestor?.nome_completo || '-') : '-',
          (o.status_gestor || '-').toUpperCase(),
          (o.acao_gestor || '-').toUpperCase(),
          (o.status_rh || '-').toUpperCase(),
          o.observacao_rh || '-',
          listaAtestados(o).length ? `Sim (${listaAtestados(o).length})` : '—',
        ]),
        startY: 28,
        styles: { fontSize: 7.5 },
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: { 0: { cellWidth: 27 }, 4: { cellWidth: 45 } },
      });
      doc.save(`Relatorio_RH_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast('PDF exportado com sucesso!');
    } catch {
      toast('Falha ao gerar PDF.', 'error');
    }
  };

  if (loading) return <LoadingScreen />;
  if (!perfil) return null;

  const counts = { total: ocorrencias.length, aguardandoRh: 0, recebidas: 0 };
  for (const o of ocorrencias) {
    if (o.status_rh === 'pendente' && o.status_gestor !== 'pendente') counts.aguardandoRh++;
    if (o.status_rh === 'recebido') counts.recebidas++;
  }

  const toggleFilter = (status) => { setFilterStatus(prev => prev === status ? null : status); setPage(1); };

  const term = search.trim().toLowerCase();
  const filtradaPorData = ocorrencias.filter((o) => {
    if (!dataInicio && !dataFim) return true;
    const ini = dataInicio ? new Date(`${dataInicio}T00:00:00`) : new Date('2000-01-01');
    const fim = dataFim   ? new Date(`${dataFim}T23:59:59`)    : new Date('2100-01-01');
    // Filtra pela data da ocorrência (não pela data de envio); ocorrências com
    // período entram se qualquer parte dele cair dentro do intervalo pesquisado.
    const ocoIni = new Date(o.data_hora);
    const ocoFim = o.data_hora_fim ? new Date(o.data_hora_fim) : ocoIni;
    return ocoIni <= fim && ocoFim >= ini;
  });
  const visiveisBusca = term
    ? filtradaPorData.filter(o =>
        (o.colaborador?.nome_completo || '').toLowerCase().includes(term) ||
        (o.setor || '').toLowerCase().includes(term)
      )
    : filtradaPorData;
  const visiveis = filterStatus === 'aguardando_rh'
    ? visiveisBusca.filter(o => o.status_rh === 'pendente' && o.status_gestor !== 'pendente')
    : filterStatus === 'recebido_rh'
    ? visiveisBusca.filter(o => o.status_rh === 'recebido')
    : visiveisBusca;
  const paginados = visiveis.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="dashboard-aurora-bg">
      <div className="orb orb-1" aria-hidden="true" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)' }} />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <TopBar
        nome={perfil.nome_completo}
        cargo={perfil.cargo}
        role="Recursos Humanos"
        onLogout={logout}
        pendingCount={counts.aguardandoRh}
      />

      <div className="app-container">
        <motion.div
          className="dash-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="page-title">Olá, <span className="page-title-name">{perfil.nome_completo.split(' ')[0]}</span>.</h1>
          <p className="page-subtitle">Central Corporativa de Recursos Humanos.</p>
          <div className="stat-grid">
            <StatCard icon={<BadgeCheck size={20}/>} value={counts.total}        label="Total ocorrências"  color="#0f172a" bg="#f1f5f9" delay={0.05} onClick={() => toggleFilter(null)}             active={filterStatus === null} />
            <StatCard icon={<Clock size={20}/>}      value={counts.aguardandoRh} label="Aguardando RH"      color="#d97706" bg="#fef3c7" delay={0.10} onClick={() => toggleFilter('aguardando_rh')}  active={filterStatus === 'aguardando_rh'} />
            <StatCard icon={<CheckCircle size={20}/>}value={counts.recebidas}    label="Recebidas pelo RH"  color="#059669" bg="#ecfdf5" delay={0.15} onClick={() => toggleFilter('recebido_rh')}    active={filterStatus === 'recebido_rh'} />
          </div>
        </motion.div>

        <motion.section variants={containerVariants} initial="hidden" animate="show" className="vision-card">
          <div className="section-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="section-title">Aprovações</h2>
              <Badge variant="secondary">{visiveis.length}{filterStatus ? `/${counts.total}` : ''}</Badge>
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
            <div className="filter-container">
              <div className="search-wrap">
                <Search className="search-icon" aria-hidden="true" />
                <Input
                  type="search"
                  className="h-8 w-48 text-sm"
                  placeholder="Buscar colaborador ou setor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar por colaborador ou setor"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="rh-ini" className="text-xs text-muted-foreground font-medium">Ocorrência de</label>
                <Input id="rh-ini" type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="rh-fim" className="text-xs text-muted-foreground font-medium">Até</label>
                <Input id="rh-fim" type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPage(1); }} className="h-8 text-sm w-36" />
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

          <Separator className="mb-4" />

          {!loadingData && ocorrencias.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ClipboardList size={30} /></div>
              <p className="empty-state-title">Nenhuma ocorrência registrada</p>
              <p className="empty-state-desc">Ocorrências aprovadas pelo gestor aparecerão aqui.</p>
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
              <Table aria-label="Todas as ocorrências">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead>Status RH</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingData ? (
                    <SkeletonTableRows cols={8} rows={6} />
                  ) : (
                    paginados.map((oco) => (
                      <TableRow
                        key={oco.id}
                        className="oco-row"
                        data-collapsed={cardAbertoId === oco.id ? 'false' : 'true'}
                        onClick={(e) => toggleCard(e, oco.id)}
                      >
                        <TableCell data-label="Data" style={{ fontWeight: '700', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div style={{ cursor: 'default' }}>
                                <div>{shortDatetime(oco.data_hora)}</div>
                                {oco.data_hora_fim && (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', fontWeight: 600 }}>
                                    até {shortDatetime(oco.data_hora_fim)}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                  {relativeDate(oco.created_at)}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div>{oco.data_hora_fim ? 'Início' : 'Ocorrência'}: {exactDatetime(oco.data_hora)}</div>
                              {oco.data_hora_fim && <div>Fim: {exactDatetime(oco.data_hora_fim)}</div>}
                              <div>Enviado: {exactDatetime(oco.created_at)}</div>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell data-label="Setor" style={{ fontSize: '0.85rem' }}>{oco.setor}</TableCell>
                        <TableCell data-label="Colaborador" style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                          {oco.colaborador?.nome_completo || '-'}
                        </TableCell>
                        <TableCell data-label="Tipo" style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{oco.tipo}</TableCell>
                        <TableCell data-label="Motivo" style={{ maxWidth: '220px', fontSize: '0.82rem' }}>
                          <ExpandableText text={oco.motivo} />
                          {listaAtestados(oco).length > 0 && (
                            <div className="flex flex-wrap items-center" style={{ gap: '0.25rem 0.75rem', marginTop: '0.25rem' }}>
                              {listaAtestados(oco).map((anexo, i, arr) => (
                                <button
                                  key={anexo}
                                  type="button"
                                  onClick={() => baixarAtestado(anexo)}
                                  title="Baixar atestado"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                >
                                  <Paperclip size={11} /> Baixar atestado{arr.length > 1 ? ` ${i + 1}` : ''}
                                </button>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell data-label="Gestor">
                          {oco.status_gestor === 'pendente'  && <StatusBadge status="pendente" label="Aguard." icon={Clock} compact />}
                          {oco.status_gestor === 'aprovado'  && <StatusBadge
                              status={oco.acao_gestor === 'abonar' ? 'abonar' : oco.acao_gestor === 'descontar' ? 'descontar' : 'aprovado'}
                              label={oco.acao_gestor === 'abonar' ? 'Abonar' : oco.acao_gestor === 'descontar' ? 'Descontar' : 'Aprov.'}
                              icon={CheckCircle}
                              compact
                            />}
                          {oco.status_gestor === 'reprovado' && <StatusBadge status="reprovado" label="Reprov." icon={XCircle} compact />}
                          {oco.status_gestor !== 'pendente' && oco.gestor?.nome_completo && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>
                              {oco.gestor.nome_completo}
                            </div>
                          )}
                        </TableCell>
                        <TableCell data-label="Status RH">
                          {oco.status_rh === 'recebido'
                            ? <StatusBadge status="rh_recebido"   label="Recebido" icon={CheckCircle} compact />
                            : <StatusBadge status="rh_aguardando" label="Aguard."  icon={Clock}       compact />
                          }
                        </TableCell>
                        <TableCell data-label="Ação">
                          {oco.status_gestor !== 'pendente' && oco.status_rh === 'pendente' ? (
                            <AnimatePresence mode="wait">
                              {expandidoId === oco.id ? (
                                <motion.div
                                  key="expanded"
                                  initial={{ opacity: 0, y: -6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  className="flex flex-col gap-2"
                                  style={{ minWidth: '200px' }}
                                >
                                  <Textarea
                                    value={obsRhTexto[oco.id] || ''}
                                    onChange={(e) => setObsRhTexto(prev => ({ ...prev, [oco.id]: e.target.value }))}
                                    placeholder="Observação do RH (opcional)..."
                                    maxLength={300}
                                    className="text-sm min-h-[60px] resize-y"
                                  />
                                  <div className="flex gap-1.5">
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 text-white border-none"
                                      onClick={() => darCiente(oco.id)}
                                    >
                                      Confirmar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setExpandidoId(null)}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </motion.div>
                              ) : (
                                <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white border-none"
                                    onClick={() => setExpandidoId(oco.id)}
                                    aria-label={`Dar ciência à ocorrência de ${oco.colaborador?.nome_completo}`}
                                  >
                                    Dar Ciente
                                  </Button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          ) : oco.status_rh === 'recebido' && oco.observacao_rh ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '180px', display: 'block' }}>
                              "{oco.observacao_rh}"
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)', fontWeight: '700' }}>—</span>
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
