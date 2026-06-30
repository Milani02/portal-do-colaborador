import { motion } from 'framer-motion';
import { LogOut, ChevronDown, Bell } from 'lucide-react';
import logoImg from '../assets/Logo Biodinâmica.png';
import { getInitials } from '../utils/string';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ROLE_CONFIG = {
  admin:       { color: '#7c3aed', bg: '#ede9fe', label: 'Administrador' },
  rh:          { color: '#2563eb', bg: '#dbeafe', label: 'RH' },
  gestor:      { color: '#d97706', bg: '#fef3c7', label: 'Gestor' },
  colaborador: { color: '#5c6c24', bg: '#ecfccb', label: 'Colaborador' },
};

export default function TopBar({ nome, cargo, role, onLogout, backButton = false, pendingCount = 0 }) {
  const rc = ROLE_CONFIG[cargo] || ROLE_CONFIG.colaborador;
  const initials = nome ? getInitials(nome) : '?';

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="app-topbar-full"
    >
      <div className="app-topbar-content">
        <div className="topbar-left">
          <img
            src={logoImg}
            alt="Biodinâmica"
            className="logo-filter"
            style={{ height: 'clamp(38px, 5vw, 50px)' }}
          />
        </div>

        <div className="topbar-actions">
          {backButton ? (
            <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Voltar ao dashboard">
              ← Voltar
            </Button>
          ) : (
            <>
              {pendingCount > 0 && (
                <div
                  className="pending-badge"
                  aria-label={`${pendingCount} ocorrência${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`}
                >
                  <span className="pending-badge-dot" aria-hidden="true" />
                  <Bell style={{ width: '13px', height: '13px' }} aria-hidden="true" />
                  {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </div>
              )}

              <div className="divider" aria-hidden="true" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2.5 rounded-xl border px-3 py-2 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50"
                    style={{
                      background: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = 'rgba(92,108,36,0.22)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.85)';
                      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                    }}
                    aria-label="Menu do usuário"
                  >
                    <Avatar className="size-9">
                      <AvatarFallback
                        style={{ background: rc.color, color: '#fff', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.04em' }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left leading-tight">
                      <div style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                        {nome?.split(' ')[0]}
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '0.15rem',
                          background: rc.bg,
                          color: rc.color,
                          padding: '0.1rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.58rem',
                          fontWeight: '700',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          border: `1px solid ${rc.color}30`,
                        }}
                      >
                        {role || rc.label}
                      </span>
                    </div>
                    <ChevronDown style={{ width: '13px', height: '13px', opacity: 0.5, flexShrink: 0 }} className="hidden sm:block text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 p-0 overflow-hidden">
                  {/* Profile header */}
                  <div style={{
                    padding: '1.1rem 1.25rem 1rem',
                    background: 'linear-gradient(135deg, rgba(92,108,36,0.06) 0%, rgba(255,255,255,0.5) 100%)',
                    borderBottom: '1px solid rgba(0,0,0,0.07)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Avatar className="size-11">
                        <AvatarFallback style={{ background: rc.color, color: '#fff', fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.04em' }}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, lineHeight: 1.3 }}>
                          {nome}
                        </p>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.28rem',
                          marginTop: '0.28rem',
                          background: rc.bg,
                          color: rc.color,
                          padding: '0.18rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.58rem',
                          fontWeight: '700',
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                          border: `1.5px solid ${rc.color}28`,
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: rc.color, flexShrink: 0 }} />
                          {role || rc.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Logout */}
                  <div style={{ padding: '0.4rem' }}>
                    <DropdownMenuItem
                      onClick={onLogout}
                      className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2 py-2 text-red-600 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                    >
                      <div style={{
                        width: '32px', height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <LogOut style={{ width: '14px', height: '14px', color: '#dc2626' }} />
                      </div>
                      <div>
                        <p style={{ fontWeight: '700', fontSize: '0.84rem', color: '#b91c1c', margin: 0, lineHeight: 1.2 }}>Sair do sistema</p>
                        <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: 0, fontWeight: '500', lineHeight: 1.4 }}>Encerrar sessão atual</p>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
