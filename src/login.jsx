import { useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform, useMotionTemplate,
} from 'framer-motion';
import logoImg from './assets/logo biodinamica login.png';
import { cargoToRoute } from './utils/constants';
import { maskCpf, validateCpf, cpfToAuthEmail } from './utils/validation';
import ConfettiBackground from './components/ConfettiBackground';
import './login.css';

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${((i * 37.1) % 90) + 5}%`,
  top:  `${((i * 61.8) % 85) + 5}%`,
  size:  1.5 + (i % 5) * 0.75,
  delay: (i * 0.41) % 7,
  dur:   3.5 + (i % 5) * 1.3,
  op:    0.1 + (i % 6) * 0.045,
}));

const FEATURES = [
  { icon: '🔐', text: 'Acesso por perfil de cargo' },
  { icon: '📋', text: 'Registro de ocorrências' },
  { icon: '📊', text: 'Relatórios e histórico' },
];

const V = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const ITEM = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

/* ── Icons ───────────────────────────────────────────────── */
const Ico = ({ d, d2, circle, line, rect }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    {d  && <path d={d} />}
    {d2 && <path d={d2} />}
    {circle && <circle cx={circle[0]} cy={circle[1]} r={circle[2]} />}
    {line && <line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} />}
    {rect && <rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} rx={rect[4]} />}
  </svg>
);

const IconLock    = () => <Ico d="M7 11V7a5 5 0 0110 0v4" rect={[3, 11, 18, 11, 2]} />;
const IconEyeOn   = () => <Ico d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" circle={[12, 12, 3]} />;
const IconEyeOff  = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconArrow   = () => <Ico d="M5 12h14M12 5l7 7-7 7" />;
const IconShield  = () => <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IconUser    = () => <Ico d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" circle={[12, 7, 4]} />;
const IconWarn    = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{flexShrink:0}}>
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
  </svg>
);

/* ── 3-D spring tilt ─────────────────────────────────────── */
function useTilt() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 100, damping: 20 });
  const sy = useSpring(my, { stiffness: 100, damping: 20 });
  const rotateX = useTransform(sy, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(sx, [-0.5, 0.5], ['-10deg', '10deg']);
  const gx = useTransform(sx, [-0.5, 0.5], [10, 90]);
  const gy = useTransform(sy, [-0.5, 0.5], [10, 90]);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.06) 0%, transparent 55%)`;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width  - 0.5);
    my.set((e.clientY - r.top)  / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };
  return { rotateX, rotateY, glare, onMove, onLeave };
}

/* ── Component ───────────────────────────────────────────── */
export default function Login() {
  const [cpf, setCpf]           = useState('');
  const [senha, setSenha]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState(null);
  const [shake, setShake]       = useState(false);
  const spotRef  = useRef(null);
  const submitRef = useRef(false);
  const navigate  = useNavigate();
  const { rotateX, rotateY, glare, onMove, onLeave } = useTilt();

  const onMouseMove = (e) => {
    if (spotRef.current) {
      spotRef.current.style.left = `${e.clientX}px`;
      spotRef.current.style.top  = `${e.clientY}px`;
    }
  };

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 600); };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitRef.current) return;

    const cpfErro = validateCpf(cpf);
    if (cpfErro) { setErro(cpfErro); triggerShake(); return; }

    submitRef.current = true;
    setLoading(true);
    setErro(null);
    try {
      const { data, error: ae } = await supabase.auth.signInWithPassword({
        email: cpfToAuthEmail(cpf), password: senha,
      });
      if (ae) { setErro('CPF ou senha incorretos.'); triggerShake(); return; }
      const { data: p, error: pe } = await supabase.from('profiles').select('cargo').eq('id', data.user.id).single();
      if (pe || !p) {
        setErro('Perfil não encontrado. Contate o Administrador.');
        await supabase.auth.signOut(); triggerShake(); return;
      }
      navigate(cargoToRoute[p.cargo] || '/colaborador');
    } catch {
      setErro('Erro inesperado. Tente novamente.'); triggerShake();
    } finally {
      setLoading(false); submitRef.current = false;
    }
  };

  return (
    <div className="lp-root" onMouseMove={onMouseMove}>

      <ConfettiBackground />

      {/* Cursor spotlight */}
      <div ref={spotRef} className="lp-spotlight" aria-hidden="true" />

      {/* ════ LEFT PANEL — Brand ════════════════════════════ */}
      <motion.aside
        className="lp-brand"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="lp-orb lp-orb-a" />
        <div className="lp-orb lp-orb-b" />
        <div className="lp-orb lp-orb-c" />

        {PARTICLES.map(p => (
          <motion.span
            key={p.id} aria-hidden="true" className="lp-particle"
            style={{ left: p.left, top: p.top, width: p.size, height: p.size, opacity: p.op }}
            animate={{ y: [0, -22, 0], opacity: [p.op, p.op * 3, p.op] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Rings */}
        <div className="lp-rings" aria-hidden="true">
          <div className="lp-ring lp-ring-1" />
          <div className="lp-ring lp-ring-2" />
          <div className="lp-ring lp-ring-3" />
          <div className="lp-ring-dot" />
        </div>

        {/* Content */}
        <motion.div className="lp-brand-body" variants={V} initial="hidden" animate="show">

          <motion.div variants={ITEM} className="lp-logo-pill">
            <img src={logoImg} alt="Biodinâmica" className="lp-logo-img" />
          </motion.div>

          <motion.h1 variants={ITEM} className="lp-brand-h1">
            Portal do<br/>
            <span className="lp-h1-accent">Colaborador</span>
          </motion.h1>

          <motion.p variants={ITEM} className="lp-brand-p">
            Seu espaço corporativo centralizado. Acesse ocorrências, comunicados e muito mais com segurança.
          </motion.p>

          <motion.ul variants={V} className="lp-feats">
            {FEATURES.map(f => (
              <motion.li key={f.text} className="lp-feat"
                variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}
              >
                <span className="lp-feat-ico">{f.icon}</span>
                <span className="lp-feat-txt">{f.text}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div className="lp-ssl"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }}
        >
          <IconShield />
          <span>Conexão criptografada · SSL / TLS</span>
        </motion.div>
      </motion.aside>

      {/* ════ RIGHT PANEL — Form ════════════════════════════ */}
      <div className="lp-form-panel">
        <motion.div
          className="lp-tilt"
          style={{ rotateX, rotateY, transformPerspective: 1100 }}
          onMouseMove={onMove} onMouseLeave={onLeave}
          initial={{ opacity: 0, y: 40, scale: 0.93 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
        >
          <div className="lp-card">
            <motion.div className="lp-glare" style={{ background: glare }} />

            <motion.div variants={V} initial="hidden" animate="show">

              {/* Card header */}
              <motion.div variants={ITEM} className="lp-card-head">
                <div className="lp-avatar"><IconUser /></div>
                <div>
                  <h2 className="lp-card-title">Bem-vindo</h2>
                  <p className="lp-card-sub">Entre com suas credenciais corporativas</p>
                </div>
              </motion.div>

              {/* Animated divider */}
              <motion.div className="lp-divider"
                variants={{ hidden: { scaleX: 0, opacity: 0 }, show: { scaleX: 1, opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } }}
              />

              {/* Error */}
              <AnimatePresence>
                {erro && (
                  <motion.div key="err" role="alert" aria-live="assertive"
                    initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: '1.2rem' }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="lp-error"
                  >
                    <IconWarn />{erro}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <motion.form className="lp-form" onSubmit={handleLogin} noValidate
                animate={shake ? { x: [-10, 10, -7, 7, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
              >
                <motion.div variants={ITEM} className="lp-field">
                  <label className="lp-label" htmlFor="lp-cpf">CPF</label>
                  <div className="lp-iw">
                    <span className="lp-ico"><IconUser /></span>
                    <input id="lp-cpf" type="text" inputMode="numeric" className="lp-input"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={e => { setCpf(maskCpf(e.target.value)); setErro(null); }}
                      autoComplete="username" maxLength={14} required
                    />
                  </div>
                </motion.div>

                <motion.div variants={ITEM} className="lp-field">
                  <label className="lp-label" htmlFor="lp-senha">Senha</label>
                  <div className="lp-iw">
                    <span className="lp-ico"><IconLock /></span>
                    <input id="lp-senha" type={showPass ? 'text' : 'password'} className="lp-input"
                      placeholder="••••••••••"
                      value={senha}
                      onChange={e => { setSenha(e.target.value); setErro(null); }}
                      autoComplete="current-password" required
                    />
                    <button type="button" className="lp-eye"
                      onClick={() => setShowPass(v => !v)}
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                      tabIndex={-1}
                    >
                      {showPass ? <IconEyeOff /> : <IconEyeOn />}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={ITEM}>
                  <motion.button type="submit" disabled={loading}
                    className={`lp-btn${loading ? ' lp-btn--busy' : ''}`}
                    whileHover={!loading ? { scale: 1.022, y: -2 } : {}}
                    whileTap={!loading  ? { scale: 0.972 }         : {}}
                  >
                    {loading
                      ? <><span className="lp-spinner" /><span>Autenticando...</span></>
                      : <><span>Acessar o Portal</span><IconArrow /></>
                    }
                  </motion.button>
                </motion.div>
              </motion.form>

              <motion.p className="lp-card-foot"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5 } } }}
              >
                Acesso restrito · contas criadas pelo administrador
                <br />
                <Link to="/privacidade" style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  Política de Privacidade
                </Link>
              </motion.p>

            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
