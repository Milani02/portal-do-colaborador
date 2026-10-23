import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { CalendarClock, ChevronDown, Download, ExternalLink, Eye, FileSpreadsheet, FileText, Megaphone, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from '../utils/toast';
import { relativeDate, exactDatetime } from '../utils/dateUtils';
import { getInitials } from '../utils/string';
import { miniaturaPdf } from '../utils/pdfThumb';
import { ExpandableText } from './ExpandableText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const BUCKET = 'mural';
const VISIVEIS_INICIO = 3;
const MAX_TITULO = 120;
const MAX_MENSAGEM = 3000;
const NOVO_MS = 72 * 60 * 60 * 1000;
const PREVIEW_TTL = 12 * 60 * 60; // segundos
const EASE = [0.16, 1, 0.3, 1];
const TIPOS_ANEXO = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Etiqueta do cartão de arquivo, pela extensão do nome original.
function tipoArquivo(nome) {
  const ext = (nome || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return { label: 'PDF', cor: 'pdf' };
  if (ext === 'doc' || ext === 'docx') return { label: 'DOC', cor: 'doc' };
  if (ext === 'xls' || ext === 'xlsx') return { label: 'XLS', cor: 'xls' };
  if (['jpg', 'jpeg', 'png'].includes(ext)) return { label: 'IMG', cor: 'img' };
  return { label: 'ARQ', cor: 'arq' };
}

// PDF e imagem têm miniatura real e abrem no visualizador; Word/Excel só baixam.
const temPrevia = (nome) => ['img', 'pdf'].includes(tipoArquivo(nome).cor);

// Date → 'AAAA-MM-DD' no fuso local (formato do <input type="date">).
function dataInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function DataCarimbo({ data }) {
  const d = new Date(data);
  const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return (
    <div className="mural-data" aria-hidden="true">
      <span className="mural-data-mes">{mes}</span>
      <span className="mural-data-dia">{d.getDate()}</span>
    </div>
  );
}

/**
 * Mural de comunicados do RH. Todos os cargos leem; só o RH publica,
 * edita e exclui (garantido pelas policies em supabase/mural.sql).
 */
export default function Mural({ perfil }) {
  const isRh = perfil.cargo === 'rh';
  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verTodos, setVerTodos] = useState(false);
  // Momento da última carga — base do selo "Novo" (Date.now não pode rodar no render).
  const [agora, setAgora] = useState(0);
  // Signed URLs dos anexos com prévia (PDF/imagem), por caminho.
  const [urls, setUrls] = useState({});
  // Miniatura da 1ª página de cada PDF (dataURL), por caminho.
  const [thumbs, setThumbs] = useState({});
  const [visualizando, setVisualizando] = useState(null);

  // Dialog de publicar/editar: `editando` é null (fechado), {} (novo) ou o comunicado.
  const [editando, setEditando] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [validade, setValidade] = useState(''); // 'AAAA-MM-DD' ou '' (sem validade)
  const [arquivo, setArquivo] = useState(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const arquivoRef = useRef(null);

  const [excluindo, setExcluindo] = useState(null);

  const perfilId = perfil.id;

  const fetchComunicados = useCallback(async () => {
    const { data, error } = await supabase
      .from('comunicados')
      .select('*, autor:autor_id (nome_completo)')
      .order('created_at', { ascending: false });
    if (error) { toast('Erro ao carregar o mural.', 'error'); setLoading(false); return; }
    setComunicados(data || []);
    setAgora(Date.now());
    setLoading(false);

    const comPrevia = (data || []).filter(c => c.anexo_path && temPrevia(c.anexo_nome));
    if (!comPrevia.length) { setUrls({}); return; }
    const { data: assinadas } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(comPrevia.map(c => c.anexo_path), PREVIEW_TTL);
    const mapa = Object.fromEntries((assinadas || []).filter(u => u.signedUrl).map(u => [u.path, u.signedUrl]));
    setUrls(mapa);

    // PDFs: gera as miniaturas uma a uma (cache por caminho, não refaz nas recargas).
    for (const c of comPrevia) {
      if (tipoArquivo(c.anexo_nome).cor !== 'pdf' || !mapa[c.anexo_path]) continue;
      try {
        const img = await miniaturaPdf(c.anexo_path, mapa[c.anexo_path]);
        setThumbs(t => (t[c.anexo_path] === img ? t : { ...t, [c.anexo_path]: img }));
      } catch {
        setThumbs(t => ({ ...t, [c.anexo_path]: 'erro' }));
      }
    }
  }, []);

  useEffect(() => {
    void fetchComunicados(); // eslint-disable-line react-hooks/set-state-in-effect
    const channel = supabase
      .channel(`mural-${perfilId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados' }, fetchComunicados)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [perfilId, fetchComunicados]);

  const abrirNovo = () => {
    setEditando({});
    setTitulo(''); setMensagem(''); setValidade(''); setArquivo(null); setRemoverAnexo(false);
  };

  const abrirEdicao = (c) => {
    setEditando(c);
    setTitulo(c.titulo); setMensagem(c.mensagem || ''); setArquivo(null); setRemoverAnexo(false);
    setValidade(c.expira_em ? dataInput(new Date(c.expira_em)) : '');
  };

  const escolherArquivo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TIPOS_ANEXO.includes(file.type)) {
      toast(`"${file.name}": formato inválido. Use PDF, imagem, Word ou Excel.`, 'error'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast(`"${file.name}": arquivo muito grande. Limite: 10 MB.`, 'error'); return;
    }
    setArquivo(file);
    setRemoverAnexo(false);
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (salvandoRef.current) return;
    const t = titulo.trim();
    if (!t) { toast('Informe o título do comunicado.', 'error'); return; }
    if (!mensagem.trim() && !arquivo && !(editando.anexo_path && !removerAnexo)) {
      toast('Escreva uma mensagem ou anexe um documento.', 'error'); return;
    }
    if (validade && validade < dataInput(new Date())) {
      toast('A validade deve ser hoje ou uma data futura.', 'error'); return;
    }

    salvandoRef.current = true;
    setSalvando(true);
    let novoPath = null;
    try {
      if (arquivo) {
        const ext = arquivo.name.split('.').pop();
        const { data: up, error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(`${perfilId}/${Date.now()}.${ext}`, arquivo, { contentType: arquivo.type, upsert: false });
        if (upErr) { toast('Erro ao enviar o anexo. Tente novamente.', 'error'); return; }
        novoPath = up.path;
      }

      const anexoAntigo = editando.anexo_path;
      const trocouAnexo = !!novoPath || removerAnexo;
      const campos = {
        titulo: t.substring(0, MAX_TITULO),
        mensagem: mensagem.trim().substring(0, MAX_MENSAGEM),
        // Vale até o fim do dia escolhido (horário local).
        expira_em: validade ? new Date(`${validade}T23:59:59`).toISOString() : null,
        ...(trocouAnexo && {
          anexo_path: novoPath,
          anexo_nome: novoPath ? arquivo.name : null,
        }),
      };

      const { error } = editando.id
        ? await supabase.from('comunicados').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', editando.id)
        : await supabase.from('comunicados').insert([campos]);

      if (error) {
        // Não deixa arquivo órfão no bucket se o registro não foi salvo.
        if (novoPath) await supabase.storage.from(BUCKET).remove([novoPath]);
        toast('Erro ao salvar o comunicado.', 'error');
        return;
      }

      if (trocouAnexo && anexoAntigo) await supabase.storage.from(BUCKET).remove([anexoAntigo]);
      toast(editando.id ? 'Comunicado atualizado.' : 'Comunicado publicado no mural.');
      setEditando(null);
      fetchComunicados();
    } catch {
      if (novoPath) await supabase.storage.from(BUCKET).remove([novoPath]);
      toast('Erro inesperado. Tente novamente.', 'error');
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    const c = excluindo;
    setExcluindo(null);
    if (!c) return;
    const { error } = await supabase.from('comunicados').delete().eq('id', c.id);
    if (error) { toast('Erro ao excluir o comunicado.', 'error'); return; }
    if (c.anexo_path) await supabase.storage.from(BUCKET).remove([c.anexo_path]);
    toast('Comunicado excluído.');
    fetchComunicados();
  };

  const baixarAnexo = async (c) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(c.anexo_path, 60, { download: c.anexo_nome || true });
    if (error || !data?.signedUrl) { toast('Não foi possível baixar o anexo.', 'error'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  // Vencidos: o banco já esconde de quem não é RH; o RH os vê no fim, apagados.
  const expirado = (c) => !!c.expira_em && new Date(c.expira_em).getTime() <= agora;
  const ativos = comunicados.filter(c => !expirado(c));
  const visiveis = isRh ? [...ativos, ...comunicados.filter(expirado)] : ativos;

  // Sem comunicados, o mural some para quem não publica (não ocupa espaço à toa).
  if (!isRh && !loading && visiveis.length === 0) return null;

  const lista = verTodos ? visiveis : visiveis.slice(0, VISIVEIS_INICIO);
  const anexoAtual = editando?.anexo_path && !removerAnexo ? editando.anexo_nome || 'Anexo' : null;

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        className="vision-card mural-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: EASE }}
        aria-labelledby="mural-titulo-secao"
      >
        <header className="mural-header">
          <div className="mural-header-id">
            <div className="mural-header-chip" aria-hidden="true">
              <Megaphone size={18} />
            </div>
            <div>
              <h2 id="mural-titulo-secao" className="mural-header-titulo">Mural do RH</h2>
              <p className="mural-header-sub">
                Comunicados e documentos para toda a empresa
                {ativos.length > 0 && <> · {ativos.length} {ativos.length === 1 ? 'publicação' : 'publicações'}</>}
                {visiveis.length > ativos.length && <> · {visiveis.length - ativos.length} {visiveis.length - ativos.length === 1 ? 'vencida' : 'vencidas'}</>}
              </p>
            </div>
          </div>
          {isRh && visiveis.length > 0 && (
            <Button size="sm" onClick={abrirNovo} className="btn-action-primary gap-1.5" style={{ padding: '0 0.85rem 0 0.7rem' }}>
              <Plus data-icon="inline-start" />
              Novo comunicado
            </Button>
          )}
        </header>

        {loading ? (
          <div className="mural-quadro">
            <div className="mural-grid">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          </div>
        ) : visiveis.length === 0 ? (
          <div className="mural-vazio">
            <div className="mural-vazio-chip" aria-hidden="true"><Megaphone size={22} /></div>
            <p className="mural-vazio-titulo">O mural está vazio</p>
            <p className="mural-vazio-desc">Publique avisos, mudanças de horário ou documentos. Todos os colaboradores verão aqui, no topo do painel.</p>
            <Button size="sm" onClick={abrirNovo} className="btn-action-primary gap-1.5" style={{ marginTop: '0.5rem', padding: '0 0.85rem 0 0.7rem' }}>
              <Plus data-icon="inline-start" />
              Publicar primeiro comunicado
            </Button>
          </div>
        ) : (
          <div className="mural-quadro">
          <motion.ul className="mural-grid" layout>
            <AnimatePresence initial={true} mode="popLayout">
              {lista.map((c, i) => {
                const novo = agora - new Date(c.created_at) < NOVO_MS;
                const editado = c.updated_at && new Date(c.updated_at) - new Date(c.created_at) > 60000;
                const tipo = c.anexo_path ? tipoArquivo(c.anexo_nome) : null;
                const vencido = expirado(c);
                const url = c.anexo_path && urls[c.anexo_path];
                const thumb = tipo?.cor === 'img' ? url : thumbs[c.anexo_path];
                return (
                  <motion.li
                    key={c.id}
                    layout
                    className="mural-slot"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE, delay: Math.min(i, 5) * 0.05 } }}
                    exit={{ opacity: 0, y: 8, transition: { duration: 0.16, ease: 'easeIn' } }}
                  >
                    <div className={`mural-item${vencido ? ' mural-vencido' : ''}`}>
                    <span className="mural-pino" aria-hidden="true" />

                    <div className="mural-item-corpo">
                      <div className="mural-item-topo">
                        <div className="mural-item-cabeca">
                          <DataCarimbo data={c.created_at} />
                          <div style={{ minWidth: 0 }}>
                            {vencido
                              ? <span className="mural-selo-vencido">Vencido · só o RH vê</span>
                              : novo && <span className="mural-novo">Novo</span>}
                            <h3 className="mural-item-titulo">{c.titulo}</h3>
                          </div>
                        </div>
                        {isRh && (
                          <div className="mural-acoes">
                            <Button size="icon-sm" variant="ghost" onClick={() => abrirEdicao(c)} aria-label={`Editar comunicado ${c.titulo}`}>
                              <Pencil />
                            </Button>
                            <Button size="icon-sm" variant="ghost" onClick={() => setExcluindo(c)} aria-label={`Excluir comunicado ${c.titulo}`} className="mural-acao-excluir">
                              <Trash2 />
                            </Button>
                          </div>
                        )}
                      </div>

                      {c.mensagem && (
                        <ExpandableText
                          text={c.mensagem}
                          lines={4}
                          style={{ fontSize: '0.86rem', marginTop: '0.75rem' }}
                        />
                      )}

                      {tipo && temPrevia(c.anexo_nome) && url && (
                        <button
                          type="button"
                          className={`mural-preview${tipo.cor === 'pdf' ? ' is-pdf' : ''}`}
                          onClick={() => setVisualizando(c)}
                          aria-label={`Visualizar ${c.anexo_nome || 'anexo'}`}
                        >
                          {thumb && thumb !== 'erro' ? (
                            <img src={thumb} alt="" loading="lazy" />
                          ) : thumb === 'erro' ? (
                            <span className="mural-preview-falha"><FileText size={26} aria-hidden="true" />Prévia indisponível</span>
                          ) : (
                            <span className="mural-preview-carregando" aria-hidden="true" />
                          )}
                          <span className="mural-preview-acao"><Eye size={13} aria-hidden="true" /> Visualizar</span>
                        </button>
                      )}

                      {tipo && !temPrevia(c.anexo_nome) && (
                        <button type="button" className={`mural-capa capa-${tipo.cor}`} onClick={() => baixarAnexo(c)}>
                          {tipo.cor === 'xls'
                            ? <FileSpreadsheet size={34} strokeWidth={1.6} aria-hidden="true" />
                            : <FileText size={34} strokeWidth={1.6} aria-hidden="true" />}
                          <span className="mural-capa-tipo">{tipo.cor === 'xls' ? 'Planilha Excel' : tipo.cor === 'doc' ? 'Documento Word' : 'Arquivo'}</span>
                          <span className="mural-capa-dica">Baixar para abrir</span>
                        </button>
                      )}

                      {tipo && (
                        <button type="button" className="mural-arquivo" onClick={() => baixarAnexo(c)}>
                          <span className={`mural-arquivo-tag tag-${tipo.cor}`}>{tipo.label}</span>
                          <span className="mural-arquivo-nome">{c.anexo_nome || 'Documento'}</span>
                          <Download size={14} className="mural-arquivo-icone" aria-hidden="true" />
                          <span className="sr-only">Baixar anexo</span>
                        </button>
                      )}

                      {c.expira_em && (
                        <div className={`mural-validade${vencido ? ' is-vencido' : ''}`}>
                          <CalendarClock size={13} aria-hidden="true" />
                          {vencido ? 'Venceu em' : 'Válido até'} {new Date(c.expira_em).toLocaleDateString('pt-BR')}
                        </div>
                      )}

                      <div className="mural-item-rodape">
                        <span className="mural-avatar" aria-hidden="true">{getInitials(c.autor?.nome_completo || 'RH')}</span>
                        <span className="truncate">{c.autor?.nome_completo || 'Recursos Humanos'}</span>
                        <span aria-hidden="true">·</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <time dateTime={c.created_at} style={{ cursor: 'default', whiteSpace: 'nowrap' }}>{relativeDate(c.created_at)}</time>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div>Publicado: {exactDatetime(c.created_at)}</div>
                            {editado && <div>Editado: {exactDatetime(c.updated_at)}</div>}
                          </TooltipContent>
                        </Tooltip>
                        {editado && <span className="mural-editado">editado</span>}
                      </div>
                    </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
          </div>
        )}

        {visiveis.length > VISIVEIS_INICIO && (
          <button type="button" className="mural-ver-todos" aria-expanded={verTodos} onClick={() => setVerTodos(v => !v)}>
            {verTodos ? 'Mostrar só os recentes' : `Ver todos os comunicados (${visiveis.length})`}
            <ChevronDown size={15} className="mural-ver-todos-icone" aria-hidden="true" />
          </button>
        )}
      </motion.section>

      {isRh && (
        <Dialog open={!!editando} onOpenChange={(open) => { if (!open && !salvando) setEditando(null); }}>
          <DialogContent
            className="sm:max-w-lg gap-0 edit-dialog"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div className="edit-dialog-header">
              <div className="edit-dialog-chip" aria-hidden="true">
                <Megaphone size={19} />
              </div>
              <div>
                <DialogTitle className="edit-dialog-title">{editando?.id ? 'Editar comunicado' : 'Novo comunicado'}</DialogTitle>
                <DialogDescription className="edit-dialog-sub">Todos os colaboradores verão este comunicado no mural.</DialogDescription>
              </div>
            </div>

            <form onSubmit={salvar} noValidate>
              <div className="edit-dialog-body flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mural-titulo">Título</Label>
                  <Input
                    id="mural-titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    maxLength={MAX_TITULO}
                    placeholder="Ex.: Feriado de 15 de novembro"
                    required
                    aria-required="true"
                    className="h-11 field-premium"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mural-mensagem">Mensagem</Label>
                  <Textarea
                    id="mural-mensagem"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    maxLength={MAX_MENSAGEM}
                    placeholder="Escreva o comunicado..."
                    className="min-h-[130px] field-premium-ta"
                  />
                  <div className={`char-counter ${mensagem.length > MAX_MENSAGEM - 200 ? 'warning' : ''}`}>
                    {mensagem.length}/{MAX_MENSAGEM}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mural-validade">Válido até <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="mural-validade"
                      type="date"
                      value={validade}
                      min={dataInput(new Date(agora))}
                      onChange={(e) => setValidade(e.target.value)}
                      className="h-11 field-premium w-auto"
                      aria-describedby="mural-validade-dica"
                    />
                    {validade && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setValidade('')} style={{ padding: '0 0.6rem' }}>
                        Sem validade
                      </Button>
                    )}
                  </div>
                  <span id="mural-validade-dica" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {validade
                      ? 'No dia seguinte a essa data, o comunicado sai do mural sozinho.'
                      : 'Sem data, o comunicado fica no mural até ser excluído.'}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Documento <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></Label>
                  <input
                    ref={arquivoRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={escolherArquivo}
                  />
                  {arquivo || anexoAtual ? (
                    <div className="mural-anexo-escolhido">
                      <span className={`mural-arquivo-tag tag-${tipoArquivo(arquivo ? arquivo.name : editando?.anexo_nome).cor}`}>
                        {tipoArquivo(arquivo ? arquivo.name : editando?.anexo_nome).label}
                      </span>
                      <span className="truncate">{arquivo ? arquivo.name : anexoAtual}</span>
                      <button
                        type="button"
                        aria-label="Remover documento"
                        onClick={() => { if (arquivo) setArquivo(null); else setRemoverAnexo(true); }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="mural-dropzone" onClick={() => arquivoRef.current?.click()}>
                      <Paperclip size={16} aria-hidden="true" />
                      <span><strong>Anexar documento</strong><br />PDF, imagem, Word ou Excel — até 10 MB</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="edit-dialog-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" disabled={salvando} onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvando} className="btn-action-primary">
                  {salvando ? 'Salvando...' : editando?.id ? 'Salvar alterações' : 'Publicar no mural'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {isRh && (
        <AlertDialog open={!!excluindo} onOpenChange={(open) => { if (!open) setExcluindo(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir comunicado?</AlertDialogTitle>
              <AlertDialogDescription>
                “{excluindo?.titulo}” será removido do mural para todos{excluindo?.anexo_path ? ', junto com o documento anexado' : ''}. Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirmarExclusao}>Excluir comunicado</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Dialog open={!!visualizando} onOpenChange={(open) => { if (!open) setVisualizando(null); }}>
        <DialogContent className="mural-visualizador" showCloseButton={false}>
          {visualizando && (() => {
            const t = tipoArquivo(visualizando.anexo_nome);
            const url = urls[visualizando.anexo_path];
            return (
              <>
                <div className="mural-visualizador-topo">
                  <span className={`mural-arquivo-tag tag-${t.cor}`}>{t.label}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <DialogTitle className="mural-visualizador-titulo">{visualizando.anexo_nome || 'Anexo'}</DialogTitle>
                    <DialogDescription className="mural-visualizador-sub">{visualizando.titulo}</DialogDescription>
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="mural-visualizador-btn" aria-label="Abrir em nova aba">
                    <ExternalLink size={15} /><span>Nova aba</span>
                  </a>
                  <button type="button" className="mural-visualizador-btn primario" onClick={() => baixarAnexo(visualizando)}>
                    <Download size={15} /><span>Baixar</span>
                  </button>
                  <button type="button" className="mural-visualizador-fechar" onClick={() => setVisualizando(null)} aria-label="Fechar">
                    <X size={18} />
                  </button>
                </div>
                <div className="mural-visualizador-corpo">
                  {t.cor === 'img'
                    ? <img src={url} alt={visualizando.anexo_nome || ''} />
                    : <iframe src={url} title={visualizando.anexo_nome || 'Documento'} />}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </MotionConfig>
  );
}
