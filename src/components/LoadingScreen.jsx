import logoImg from '../assets/Logo Biodinâmica.png';

export default function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh',
        background: '#f8fafc', gap: '1.25rem',
      }}
      role="status"
      aria-label="Carregando"
      aria-busy="true"
    >
      <img src={logoImg} alt="Biodinâmica" className="logo-filter" style={{ height: '42px' }} />
      <div className="loading-spinner" aria-hidden="true" />
    </div>
  );
}
