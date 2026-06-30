import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthGuard } from './hooks/useAuthGuard';
import TopBar from './components/TopBar';
import LoadingScreen from './components/LoadingScreen';
import StatCard from './components/StatCard';
import { containerVariants, itemVariantsLight } from './utils/animations';
import { validateMotivo, validateTipoOcorrencia, VALID_TIPOS_OCORRENCIA } from './utils/validation';
import { toast } from './utils/toast';
import { relativeDate, exactDatetime } from './utils/dateUtils';
import { FileText, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './components/StatusBadge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import './index.css';

const TIPOS_LABELS = {
  falta: 'Falta',
  'atraso/saida antecipada': 'Atraso / Saída',
  'hora extra': 'Hora Extra',
  outros: 'Outros',
};

const STATUS_GESTOR = {
  aprovado:  { variant: 'default', label: 'Aprovado',   dot: '#059669' },
  reprovado: { variant: 'destructive', label: 'Reprovado', dot: '#dc2626' },
  pendente:  { variant: 'secondary', label: 'Pendente',  dot: '#d97706' },
};

const STATUS_RH = {
  recebido: { label: 'RH: Recebido',   className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  pendente: { label: 'RH: Aguardando', className: 'bg-slate-50 text-slate-500 border border-slate-200' },
};

function SkeletonTimeline({ rows = 4 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <div key={i} className="timeline-item" style={{ opacity: 0.7 }}>
      <div className="timeline-dot" style={{ background: '#e2e8f0', color: 'transparent', border: '3px solid white' }} />
      <div className="timeline-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  ));
}

export default function ColaboradorDashboard() {
  const { perfil, loading, logout } = useAuthGuard('colaborador');
  const [filterStatus, setFilterStatus] = useState(null);
  const [tipo, setTipo] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [atestado, setAtestado] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const submitRef = useRef(false);
  const atestadoRef = useRef(null);
  const prevStatusRef = useRef({});

  const fetchHistorico = useCallback(async () => {
    if (!perfil?.id) return;
    const { data } = await supabase
      .from('ocorrencias')
      .select('*')
      .eq('colaborador_id', perfil.id)
      .order('created_at', { ascending: false });
    if (data) {
      if (Object.keys(prevStatusRef.current).length > 0) {
        for (const item of data) {
          const prev = prevStatusRef.current[item.id];
          if (prev && prev !== item.status_gestor) {
            const label = TIPOS_LABELS[item.tipo] || item.tipo;
            if (item.status_gestor === 'aprovado')
              toast(`Ocorrência "${label}" aprovada pelo gestor!`, 'success');
            else if (item.status_gestor === 'reprovado')
              toast(`Ocorrência "${label}" reprovada pelo gestor.`, 'error');
          }
        }
      }
      prevStatusRef.current = Object.fromEntries(data.map(h => [h.id, h.status_gestor]));
      setHistorico(data);
    }
    setLoadingData(false);
  }, [perfil?.id]);

  useEffect(() => {
    if (!perfil) return;
    void fetchHistorico(); // eslint-disable-line react-hooks/set-state-in-effect
    const channel = supabase
      .channel(`colab-ocos-${perfil.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ocorrencias',
        filter: `colaborador_id=eq.${perfil.id}`,
      }, fetchHistorico)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [perfil?.id, fetchHistorico]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitRef.current) return;

    if (!validateTipoOcorrencia(tipo)) {
      toast('Selecione um tipo de ocorrência.', 'error'); return;
    }
    const erroMotivo = validateMotivo(motivo);
    if (erroMotivo) { toast(erroMotivo, 'error'); return; }
    if (!dataHora) { toast('Informe a data e hora.', 'error'); return; }

    submitRef.current = true;
    setSubmitting(true);

    try {
      let atestado_url = null;

      if (atestado) {
        const ext = atestado.name.split('.').pop();
        const path = `${perfil.id}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('atestados')
          .upload(path, atestado, { contentType: atestado.type, upsert: false });

        if (uploadError) {
          toast('Erro ao enviar atestado. Tente novamente.', 'error');
          setSubmitting(false);
          submitRef.current = false;
          return;
        }

        // Bucket é privado: guardamos o CAMINHO do arquivo, não uma URL pública.
        // Só o RH gera uma signed URL temporária para baixar (ver RhDashboard).
        atestado_url = uploadData.path;
      }

      const { error } = await supabase.from('ocorrencias').insert([{
        colaborador_id: perfil.id,
        setor: perfil.setor,
        tipo,
        data_hora: dataHora,
        motivo: motivo.trim().substring(0, 500),
        ...(atestado_url && { atestado_url }),
      }]);

      if (error) {
        toast('Erro ao registrar. Tente novamente.', 'error');
      } else {
        toast('Ocorrência registrada com sucesso!');
        setTipo(''); setDataHora(''); setMotivo('');
        setAtestado(null);
        if (atestadoRef.current) atestadoRef.current.value = '';
      }
    } catch {
      toast('Erro inesperado. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
      submitRef.current = false;
    }
  };

  if (loading) return <LoadingScreen />;
  if (!perfil) return null;

  const motivoLength = motivo.length;
  const counts = { total: historico.length, aprovado: 0, pendente: 0, reprovado: 0 };
  for (const h of historico) {
    if (h.status_gestor === 'aprovado') counts.aprovado++;
    else if (h.status_gestor === 'pendente') counts.pendente++;
    else if (h.status_gestor === 'reprovado') counts.reprovado++;
  }

  const toggleFilter = (status) => setFilterStatus(prev => prev === status ? null : status);
  const historicoFiltrado = filterStatus ? historico.filter(h => h.status_gestor === filterStatus) : historico;

  return (
    <div className="dashboard-aurora-bg">
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <TopBar nome={perfil.nome_completo} cargo={perfil.cargo} role={perfil.setor} onLogout={logout} />

      <div className="app-container">
        <motion.div
          className="dash-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="page-title">Olá, <span className="page-title-name">{perfil.nome_completo.split(' ')[0]}</span>.</h1>
          <p className="page-subtitle">Registre e acompanhe suas ocorrências aqui.</p>
          <div className="stat-grid">
            <StatCard icon="📋" value={counts.total}     label="Total enviadas"  color="#0f172a" bg="#f1f5f9" delay={0.05} onClick={() => toggleFilter(null)}       active={filterStatus === null} />
            <StatCard icon="✅" value={counts.aprovado}  label="Aprovadas"       color="#059669" bg="#ecfdf5" delay={0.10} onClick={() => toggleFilter('aprovado')}  active={filterStatus === 'aprovado'} />
            <StatCard icon="⏳" value={counts.pendente}  label="Aguardando"      color="#d97706" bg="#fffbeb" delay={0.15} onClick={() => toggleFilter('pendente')}  active={filterStatus === 'pendente'} />
            <StatCard icon="✕"  value={counts.reprovado} label="Reprovadas"      color="#dc2626" bg="#fef2f2" delay={0.20} onClick={() => toggleFilter('reprovado')} active={filterStatus === 'reprovado'} />
          </div>
        </motion.div>

        <motion.div className="dashboard-grid" variants={containerVariants} initial="hidden" animate="show">

          {/* Form */}
          <motion.section variants={itemVariantsLight} className="vision-card">
            <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Nova Ocorrência</h2>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tipo-ocorrencia">Tipo de Ocorrência</Label>
                <Select value={tipo} onValueChange={setTipo} required>
                  <SelectTrigger id="tipo-ocorrencia" aria-required="true" className="h-11 field-premium">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {VALID_TIPOS_OCORRENCIA.map((t) => (
                        <SelectItem key={t} value={t}>{TIPOS_LABELS[t]}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="data-hora">Data e Hora</Label>
                <Input
                  id="data-hora"
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  required
                  aria-required="true"
                  className="h-11 field-premium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="motivo">Descrição / Motivo</Label>
                <Textarea
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva os detalhes da ocorrência..."
                  required
                  aria-required="true"
                  maxLength={500}
                  className="min-h-[110px] field-premium-ta"
                />
                <div className={`char-counter ${motivoLength > 500 ? 'error' : motivoLength > 450 ? 'warning' : ''}`}>
                  {motivoLength}/500
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Atestado <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></Label>
                <input
                  ref={atestadoRef}
                  id="atestado-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) { setAtestado(null); return; }
                    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
                      toast('Formato inválido. Use PDF, JPG ou PNG.', 'error');
                      e.target.value = '';
                      return;
                    }
                    if (file.size > 10 * 1024 * 1024) {
                      toast('Arquivo muito grande. Limite: 10 MB.', 'error');
                      e.target.value = '';
                      return;
                    }
                    setAtestado(file);
                  }}
                />
                {atestado ? (
                  <div
                    style={{
                      border: '1px solid rgba(92,108,36,0.35)',
                      borderRadius: '10px',
                      background: 'rgba(92,108,36,0.04)',
                      padding: '0.65rem 0.85rem',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                        <FileText size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {atestado.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setAtestado(null); if (atestadoRef.current) atestadoRef.current.value = ''; }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                          color: 'var(--text-muted)', flexShrink: 0, lineHeight: 1,
                        }}
                        aria-label="Remover atestado"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#92400e', fontWeight: 500, lineHeight: 1.4 }}>
                      Este arquivo não substitui o documento original.
                    </p>
                  </div>
                ) : (
                  <label
                    htmlFor="atestado-input"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      border: '1.5px dashed var(--border)',
                      borderRadius: '10px',
                      padding: '0.7rem 1rem',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(92,108,36,0.03)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Paperclip size={15} />
                    Clique para anexar atestado
                  </label>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting || motivoLength > 500}
                size="lg"
                className="w-full mt-1 btn-action-primary"
              >
                {submitting ? 'Enviando...' : 'Registrar Ocorrência'}
              </Button>
            </form>
          </motion.section>

          {/* Timeline */}
          <motion.section variants={itemVariantsLight} className="vision-card">
            <div className="section-header">
              <h2 className="section-title">Histórico</h2>
              <div className="flex items-center gap-3 flex-wrap">
                {historico.length > 0 && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {historicoFiltrado.length}{filterStatus ? `/${historico.length}` : ''} {historicoFiltrado.length === 1 ? 'registro' : 'registros'}
                  </span>
                )}
                {filterStatus && (
                  <button
                    onClick={() => setFilterStatus(null)}
                    style={{
                      fontSize: '0.7rem', fontWeight: '700', color: 'var(--primary)',
                      background: 'rgba(92,108,36,0.08)', border: '1px solid rgba(92,108,36,0.2)',
                      borderRadius: '999px', padding: '0.18rem 0.6rem', cursor: 'pointer',
                      letterSpacing: '0.03em',
                    }}
                  >
                    × Limpar filtro
                  </button>
                )}
                {!loadingData && <span className="live-dot">ao vivo</span>}
              </div>
            </div>

            {loadingData ? (
              <div className="timeline" role="list">
                <SkeletonTimeline rows={3} />
              </div>
            ) : historico.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><FileText size={30} /></div>
                <p className="empty-state-title">Nenhuma ocorrência registrada</p>
                <p className="empty-state-desc">Suas ocorrências aparecerão aqui após o envio.</p>
              </div>
            ) : historicoFiltrado.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><FileText size={30} /></div>
                <p className="empty-state-title">Nenhuma ocorrência nesta categoria</p>
                <p className="empty-state-desc">Clique no card novamente para ver todas.</p>
              </div>
            ) : (
              <div className="timeline" role="list">
                <AnimatePresence>
                  {historicoFiltrado.map((h) => {
                    const sg = STATUS_GESTOR[h.status_gestor] || STATUS_GESTOR.pendente;
                    const sr = STATUS_RH[h.status_rh] || STATUS_RH.pendente;
                    return (
                      <motion.div
                        key={h.id}
                        className="timeline-item"
                        role="listitem"
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div
                          className="timeline-dot"
                          style={{ color: sg.dot, background: sg.dot + '1a' }}
                          aria-hidden="true"
                        />
                        <div className="timeline-body">
                          <div className="flex justify-between items-start gap-2 flex-wrap mb-2">
                            <div>
                              <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                {TIPOS_LABELS[h.tipo] || h.tipo}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: '500', cursor: 'default' }}
                                  >
                                    {relativeDate(h.created_at)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div>Enviado: {exactDatetime(h.created_at)}</div>
                                  <div>Ocorrência: {exactDatetime(h.data_hora)}</div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                              {h.status_gestor === 'aprovado' && h.acao_gestor ? (
                                <StatusBadge
                                  status={h.acao_gestor === 'abonar' ? 'abonar' : 'descontar'}
                                  label={h.acao_gestor === 'abonar' ? 'Abonado' : 'Descontado'}
                                />
                              ) : (
                                <StatusBadge status={h.status_gestor} label={sg.label} />
                              )}
                              <StatusBadge
                                status={h.status_rh === 'recebido' ? 'rh_recebido' : 'rh_aguardando'}
                                label={sr.label}
                              />
                            </div>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.25rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {h.motivo}
                          </p>
                          {h.atestado_url && (
                            <span
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}
                              title="Atestado enviado — apenas o RH pode baixar"
                            >
                              <Paperclip size={11} /> Atestado anexado
                            </span>
                          )}
                          {(h.observacao_gestor || h.observacao_rh) && (
                            <>
                              <Separator className="my-2" />
                              <div className="flex flex-col gap-1">
                                {h.observacao_gestor && (
                                  <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>
                                    <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Gestor: </span>
                                    {h.observacao_gestor}
                                  </p>
                                )}
                                {h.observacao_rh && (
                                  <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>
                                    <span style={{ fontWeight: '700', color: '#2563eb' }}>RH: </span>
                                    {h.observacao_rh}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.section>

        </motion.div>
      </div>
    </div>
  );
}
