const CONFIGS = {
  aprovado: {
    gradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#15803d',
    border: 'rgba(34,197,94,0.4)',
    dot: '#22c55e',
    glow: 'rgba(34,197,94,0.14)',
  },
  reprovado: {
    gradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#b91c1c',
    border: 'rgba(239,68,68,0.4)',
    dot: '#ef4444',
    glow: 'rgba(239,68,68,0.13)',
  },
  pendente: {
    gradient: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
    color: '#a16207',
    border: 'rgba(234,179,8,0.4)',
    dot: '#eab308',
    glow: 'rgba(234,179,8,0.13)',
    pulse: true,
  },
  rh_recebido: {
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    color: '#1d4ed8',
    border: 'rgba(59,130,246,0.4)',
    dot: '#3b82f6',
    glow: 'rgba(59,130,246,0.13)',
  },
  rh_aguardando: {
    gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    color: '#475569',
    border: 'rgba(148,163,184,0.45)',
    dot: '#94a3b8',
    glow: 'rgba(0,0,0,0.05)',
  },
  bloqueado: {
    gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    color: '#94a3b8',
    border: 'rgba(148,163,184,0.3)',
    dot: '#cbd5e1',
    glow: 'transparent',
  },
  abonar: {
    gradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    color: '#047857',
    border: 'rgba(16,185,129,0.35)',
    dot: '#10b981',
    glow: 'rgba(16,185,129,0.12)',
  },
  descontar: {
    gradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#b91c1c',
    border: 'rgba(239,68,68,0.35)',
    dot: '#ef4444',
    glow: 'rgba(239,68,68,0.12)',
  },
};

export function StatusBadge({ status, label, icon: Icon, compact = false }) {
  const cfg = CONFIGS[status] || CONFIGS.pendente;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.32rem',
      padding: compact ? '0.2rem 0.55rem' : '0.28rem 0.7rem',
      borderRadius: '999px',
      fontSize: compact ? '0.63rem' : '0.67rem',
      fontWeight: '700',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      color: cfg.color,
      background: cfg.gradient,
      border: `1.5px solid ${cfg.border}`,
      boxShadow: `0 1px 4px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.55)`,
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <span style={{
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        background: cfg.dot,
        flexShrink: 0,
        animation: cfg.pulse ? 'pulse 1.8s ease-in-out infinite' : 'none',
      }} />
      {Icon && <Icon style={{ width: '11px', height: '11px', flexShrink: 0 }} />}
      {label}
    </span>
  );
}
