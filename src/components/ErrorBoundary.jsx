import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '1rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#0f172a',
            background: '#f8fafc',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem' }} aria-hidden="true">⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Algo deu errado.</h1>
          <p style={{ color: '#475569', margin: 0 }}>
            Um erro inesperado ocorreu. Recarregue a página ou tente novamente mais tarde.
          </p>
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              padding: '0.8rem 2rem',
              background: '#5c6c24',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '1rem',
              fontFamily: 'inherit',
            }}
          >
            Voltar ao início
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
