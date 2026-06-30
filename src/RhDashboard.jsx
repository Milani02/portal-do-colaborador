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
import { relativeDate, exactDatetime, shortDate } from './utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatusBadge } from './components/StatusBadge';
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
  const cienteRefs = useRef({});

  const fetchOcorrencias = useCallback(async () => {
    if (!perfil?.id) return;
    const { data, error } = await supabase
      .from('ocorrencias')
      .select('*, colaborador:colaborador_id (nome_completo), gestor:gestor_id (nome_completo)')
      .order('created_at', { ascending: false });
    if (error) { toast('Erro ao carregar dados.', 'error'); return; }
    if (data) setOcorrencias(data);
    setLoadingData(false);
  }, [perfil?.id]);

  useEffect(() => {
    if (!perfil) return;
    void fetchOcorrencias(); // eslint-disable-line react-hooks/set-state-in-effect
    const channel = supabase
      .channel(`rh-ocos-${perfil.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ocorrencias' }, fetchOcorrencias)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [perfil?.id, fetchOcorrencias]);

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
    const filtradas = filtradaPorData;
    if (!filtradas.length) { toast('Nenhuma ocorrência no período selecionado.', 'error'); return; }
    try {
      const doc = new jsPDF('landscape');
      doc.setFontSize(14);
      doc.text('Relatório Geral de Ocorrências — RH', 14, 15);
      doc.setFontSize(9);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);
      autoTable(doc, {
        head: [['Data', 'Setor', 'Colaborador', 'Tipo', 'Motivo', 'Gestor', 'Aprov. Gestor', 'Ação', 'Status RH', 'Obs. RH', 'Atestado']],
        body: filtradas.map((o) => [
          shortDate(o.data_hora),
          o.setor || '-',
          o.colaborador?.nome_completo || '-',
          o.tipo || '-',
          (o.motivo || '').substring(0, 40),
          o.status_gestor !== 'pendente' ? (o.gestor?.nome_completo || '-') : '-',
          (o.status_gestor || '-').toUpperCase(),
          (o.acao_gestor || '-').toUpperCase(),
          (o.status_rh || '-').toUpperCase(),
          o.observacao_rh || '-',
          o.atestado_url ? 'Sim' : '—',
        ]),
        startY: 28,
        styles: { fontSize: 7.5 },
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: { 4: { cellWidth: 45 } },
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
    const d = new Date(o.created_at);
    const ini = dataInicio ? new Date(`${dataInicio}T00:00:00`) : new Date('2000-01-01');
    const fim = dataFim   ? new Date(`${dataFim}T23:59:59`)    : new Date('2100-01-01');
    return d >= ini && d <= fim;
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
                <label htmlFor="rh-ini" className="text-xs text-muted-foreground font-medium">Enviado de</label>
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
                        <TableCell style={{ fontSize: '0.85rem' }}>{oco.setor}</TableCell>
                        <TableCell style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                          {oco.colaborador?.nome_completo || '-'}
                        </TableCell>
                        <TableCell style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{oco.tipo}</TableCell>
                        <TableCell style={{ maxWidth: '180px', fontSize: '0.82rem' }}>
                          <div
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}
                            title={oco.motivo}
                          >
                            {oco.motivo}
                          </div>
                          {oco.atestado_url && (
                            <button
                              type="button"
                              onClick={() => baixarAtestado(oco.atestado_url)}
                              title="Baixar atestado"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              <Paperclip size={11} /> Baixar atestado
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
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
                        <TableCell>
                          {oco.status_rh === 'recebido'
                            ? <StatusBadge status="rh_recebido"   label="Recebido" icon={CheckCircle} compact />
                            : <StatusBadge status="rh_aguardando" label="Aguard."  icon={Clock}       compact />
                          }
                        </TableCell>
                        <TableCell>
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
