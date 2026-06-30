import { Link, useLocation } from 'react-router-dom';

/* Rodapé global com link para a Política de Privacidade.
   Some no login ('/') e na própria página de privacidade, que já têm o link. */
export default function SiteFooter() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/privacidade') return null;

  return (
    <footer
      style={{
        position: 'relative',
        zIndex: 5,
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem 0.9rem',
        fontSize: '0.78rem',
        color: 'var(--text-muted, #64748b)',
      }}
    >
      <span>© {new Date().getFullYear()} Biodinâmica · Portal do Colaborador</span>
      <span aria-hidden="true" style={{ opacity: 0.4 }}>•</span>
      <Link
        to="/privacidade"
        style={{ color: '#5c6c24', fontWeight: 700, textDecoration: 'none' }}
      >
        Política de Privacidade
      </Link>
    </footer>
  );
}
