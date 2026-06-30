import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { motion } from 'framer-motion';
import { Search, Users, Shield, Briefcase, BarChart3, User, UserX, SearchX } from 'lucide-react';
import { Pagination } from './components/Pagination';

const PER_PAGE = 15;
import { useAuthGuard } from './hooks/useAuthGuard';
import TopBar from './components/TopBar';
import LoadingScreen from './components/LoadingScreen';
import StatCard from './components/StatCard';
import { containerVariants } from './utils/animations';
import { validateCargo, validateSetor, VALID_CARGOS } from './utils/validation';
import { toast } from './utils/toast';
import { getInitials } from './utils/string';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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

const CARGO_LABEL = {
  admin: 'Admin', rh: 'RH', gestor: 'Gestor', colaborador: 'Colaborador',
};
const CARGO_STYLE = {
  admin:       { color: '#7c3aed', bg: '#ede9fe' },
  rh:          { color: '#2563eb', bg: '#dbeafe' },
  gestor:      { color: '#d97706', bg: '#fef3c7' },
  colaborador: { color: '#5c6c24', bg: '#ecfccb' },
};
const CARGO_BADGE_CLASS = {
  admin:       'bg-violet-100 text-violet-700 border border-violet-200',
  rh:          'bg-blue-100 text-blue-700 border border-blue-200',
  gestor:      'bg-amber-100 text-amber-700 border border-amber-200',
  colaborador: 'bg-lime-100 text-lime-700 border border-lime-200',
};

function SkeletonTableRows({ cols = 4, rows = 6 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <TableCell key={j}>
          <Skeleton className={`h-3.5 ${j === 0 ? 'w-40' : j === 1 ? 'w-28' : j === 2 ? 'w-32' : 'w-20'}`} />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export default function AdminDashboard() {
  const { perfil, loading, logout } = useAuthGuard('admin');
  const [usuarios, setUsuarios] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!perfil) return;
    let isMounted = true;
    supabase
      .from('profiles')
      .select('*')
      .order('nome_completo', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) { toast('Erro ao carregar usuários.', 'error'); }
        else if (data) setUsuarios(data);
        setLoadingData(false);
      });
    return () => { isMounted = false; };
  }, [perfil?.id]);

  const atualizarUsuario = async (id, novoCargo, novoSetor) => {
    if (!validateCargo(novoCargo)) { toast('Cargo inválido.', 'error'); return; }
    const erroSetor = validateSetor(novoSetor);
    if (erroSetor) { toast(erroSetor, 'error'); return; }

    const { error } = await supabase
      .from('profiles')
      .update({ cargo: novoCargo, setor: novoSetor.trim() })
      .eq('id', id);

    if (error) { toast('Erro ao atualizar. Tente novamente.', 'error'); return; }
    toast('Usuário atualizado com sucesso!');
    setUsuarios((prev) =>
      prev.map((u) => u.id === id ? { ...u, cargo: novoCargo, setor: novoSetor.trim() } : u)
    );
  };

  if (loading) return <LoadingScreen />;
  if (!perfil) return null;

  const counts = { total: usuarios.length, admin: 0, rh: 0, gestor: 0, colaborador: 0 };
  for (const u of usuarios) {
    if (u.cargo === 'admin') counts.admin++;
    else if (u.cargo === 'rh') counts.rh++;
    else if (u.cargo === 'gestor') counts.gestor++;
    else if (u.cargo === 'colaborador') counts.colaborador++;
  }

  const term = search.trim().toLowerCase();
  const usuariosFiltrados = term
    ? usuarios.filter(u =>
        u.nome_completo?.toLowerCase().includes(term) ||
        (u.setor || '').toLowerCase().includes(term) ||
        CARGO_LABEL[u.cargo]?.toLowerCase().includes(term)
      )
    : usuarios;
  const paginados = usuariosFiltrados.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="dashboard-aurora-bg">
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <TopBar nome={perfil.nome_completo} cargo={perfil.cargo} role="Administrador" onLogout={logout} />

      <div className="app-container">
        <motion.div
          className="dash-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="page-title">Gestão de Acessos.</h1>
          <p className="page-subtitle">Controle total de usuários e permissões do sistema.</p>
          <div className="stat-grid">
            <StatCard icon={<Users size={20} />}   value={counts.total}       label="Total de usuários"  color="#0f172a"  bg="#f1f5f9" delay={0.05} />
            <StatCard icon={<Shield size={20} />}  value={counts.admin}       label="Administradores"    color="#7c3aed"  bg="#ede9fe" delay={0.10} />
            <StatCard icon={<Briefcase size={20}/>}value={counts.rh}          label="RH"                 color="#2563eb"  bg="#dbeafe" delay={0.15} />
            <StatCard icon={<BarChart3 size={20}/>}value={counts.gestor}      label="Gestores"           color="#d97706"  bg="#fef3c7" delay={0.20} />
            <StatCard icon={<User size={20} />}    value={counts.colaborador} label="Colaboradores"      color="#5c6c24"  bg="#ecfccb" delay={0.25} />
          </div>
        </motion.div>

        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="vision-card"
        >
          <div className="section-header">
            <h2 className="section-title">Usuários Cadastrados</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="search-wrap">
                <Search className="search-icon" aria-hidden="true" />
                <Input
                  type="search"
                  className="h-8 w-56 text-sm"
                  placeholder="Buscar por nome ou setor..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  aria-label="Buscar usuários"
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'usuário' : 'usuários'}
              </span>
            </div>
          </div>

          {!loadingData && usuarios.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><UserX size={30} /></div>
              <p className="empty-state-title">Nenhum usuário encontrado</p>
              <p className="empty-state-desc">Usuários criados pelo administrador aparecerão aqui.</p>
            </div>
          ) : !loadingData && usuariosFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><SearchX size={30} /></div>
              <p className="empty-state-title">Nenhum resultado para "{search}"</p>
              <p className="empty-state-desc">Tente outro nome ou setor.</p>
            </div>
          ) : (
            <>
            <div className="table-container">
              <Table aria-label="Lista de usuários">
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Nível de Acesso</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingData ? (
                    <SkeletonTableRows cols={4} rows={6} />
                  ) : (
                    paginados.map((u) => {
                      const cs = CARGO_STYLE[u.cargo] || CARGO_STYLE.colaborador;
                      const badgeClass = CARGO_BADGE_CLASS[u.cargo] || CARGO_BADGE_CLASS.colaborador;
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8 shrink-0">
                                <AvatarFallback
                                  style={{ background: cs.color, color: '#fff', fontSize: '0.65rem', fontWeight: '800' }}
                                >
                                  {getInitials(u.nome_completo)}
                                </AvatarFallback>
                              </Avatar>
                              <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{u.nome_completo}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              defaultValue={u.setor}
                              maxLength={100}
                              aria-label={`Setor de ${u.nome_completo}`}
                              onBlur={(e) => {
                                const novoSetor = e.target.value.trim();
                                if (novoSetor !== u.setor) atualizarUsuario(u.id, u.cargo, novoSetor);
                              }}
                              className="h-8 min-w-[140px] text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              defaultValue={u.cargo}
                              onValueChange={(val) => {
                                if (VALID_CARGOS.includes(val)) {
                                  atualizarUsuario(u.id, val, u.setor);
                                }
                              }}
                            >
                              <SelectTrigger
                                className="h-8 min-w-[150px] text-sm"
                                aria-label={`Cargo de ${u.nome_completo}`}
                                style={{ color: cs.color, fontWeight: '700' }}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {VALID_CARGOS.map(c => (
                                    <SelectItem key={c} value={c}>{CARGO_LABEL[c]}</SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex h-5 shrink-0 items-center rounded-4xl px-2 text-xs font-medium ${badgeClass}`}>
                              {CARGO_LABEL[u.cargo] || u.cargo}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination total={usuariosFiltrados.length} page={page} perPage={PER_PAGE} onPageChange={setPage} />
            </>
          )}
        </motion.section>
      </div>
    </div>
  );
}
