import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

function useCountUp(end, duration = 900) {
  const [count, setCount] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    cancelAnimationFrame(frame.current);
    if (end === 0) {
      frame.current = requestAnimationFrame(() => setCount(0));
      return () => cancelAnimationFrame(frame.current);
    }
    let start = null;
    const tick = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(end * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [end, duration]);

  return count;
}

export default function StatCard({ icon, value, label, color, bg, delay = 0, onClick, active = false }) {
  const count = useCountUp(value);
  const isClickable = typeof onClick === 'function';

  return (
    <motion.div
      className="stat-card"
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-pressed={isClickable ? active : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{
        '--stat-accent': color,
        cursor: isClickable ? 'pointer' : 'default',
        outline: active ? `2px solid ${color}` : 'none',
        outlineOffset: '2px',
        transform: active ? 'translateY(-4px)' : undefined,
        boxShadow: active
          ? `0 8px 28px rgba(0,0,0,0.1), 0 0 0 2px ${color}22`
          : undefined,
        transition: 'outline 0.15s ease, box-shadow 0.15s ease',
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: active ? -4 : 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={isClickable ? { y: -4, boxShadow: `0 16px 32px rgba(0,0,0,0.09), 0 0 0 2px ${color}33`, transition: { duration: 0.2 } } : {}}
      whileTap={isClickable ? { scale: 0.97, transition: { duration: 0.1 } } : {}}
    >
      <div className="stat-card-icon" style={{ background: bg, color }}>
        {icon}
      </div>
      <div className="stat-card-value" style={{ color }}>{count}</div>
      <div className="stat-card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {label}
        {active && (
          <span style={{
            fontSize: '0.55rem',
            fontWeight: '800',
            color: color,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            padding: '0.08rem 0.35rem',
            borderRadius: '999px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1.5,
          }}>
            ativo
          </span>
        )}
      </div>
    </motion.div>
  );
}
