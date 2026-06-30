import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const CONFIG = {
  success: { icon: '✓', bg: '#f0fdf4', border: '#86efac', color: '#166534', bar: '#22c55e' },
  error:   { icon: '⚠', bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', bar: '#ef4444' },
  info:    { icon: 'ℹ', bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', bar: '#3b82f6' },
};

const TTL = 4200;

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = ({ detail }) => {
      setToasts((prev) => [...prev.slice(-4), detail]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, TTL);
    };
    window.addEventListener('portal-toast', handler);
    return () => window.removeEventListener('portal-toast', handler);
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        display: 'flex', flexDirection: 'column-reverse', gap: '0.5rem',
        zIndex: 9999, pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const c = CONFIG[t.type] || CONFIG.info;
          return (
            <motion.div
              key={t.id}
              role="status"
              initial={{ opacity: 0, x: 64, scale: 0.93 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 64, scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.color,
                borderRadius: '14px',
                padding: '0.9rem 1.25rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 1px 3px rgba(0,0,0,0.06)',
                maxWidth: '340px',
                minWidth: '240px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                pointerEvents: 'auto',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: c.bar, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: '900', flexShrink: 0,
              }}>
                {c.icon}
              </span>
              <span style={{ lineHeight: 1.4, flex: 1 }}>{t.message}</span>
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: TTL / 1000 - 0.2, ease: 'linear', delay: 0.1 }}
                style={{
                  position: 'absolute', bottom: 0, left: 0,
                  height: '3px', width: '100%',
                  background: c.bar, transformOrigin: 'left',
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
