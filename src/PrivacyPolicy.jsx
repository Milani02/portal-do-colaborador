import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import logoImg from './assets/Logo Biodinâmica.png';

/* ─────────────────────────────────────────────────────────────
   Política de Privacidade — Portal do Colaborador (Biodinâmica)
   Página pública (sem autenticação). Alinhada à LGPD (Lei 13.709/2018).
   Campos entre [colchetes] devem ser preenchidos pelo jurídico/DPO.
   ───────────────────────────────────────────────────────────── */

const ATUALIZADO_EM = '30 de junho de 2026';

const Section = ({ n, title, children }) => (
  <section style={{ marginTop: '2rem' }}>
    <h2 style={{
      fontSize: '1.05rem', fontWeight: 800, color: '#1e293b',
      margin: '0 0 0.6rem', display: 'flex', alignItems: 'baseline', gap: '0.55rem',
    }}>
      <span style={{ color: '#5c6c24', fontVariantNumeric: 'tabular-nums' }}>{n}.</span>
      {title}
    </h2>
    <div style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#475569' }}>
      {children}
    </div>
  </section>
);

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Cabeçalho */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{
          maxWidth: '820px', margin: '0 auto', padding: '0.9rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <img src={logoImg} alt="Biodinâmica" style={{ height: '40px' }} />
          <Link
            to="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.85rem', fontWeight: 700, color: '#5c6c24',
              textDecoration: 'none', padding: '0.45rem 0.85rem',
              borderRadius: '8px', border: '1px solid rgba(92,108,36,0.25)',
              background: 'rgba(92,108,36,0.06)',
            }}
          >
            <ArrowLeft size={15} /> Voltar ao Portal
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ maxWidth: '820px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: '#ecfccb', color: '#5c6c24', fontWeight: 700,
          fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase',
          padding: '0.35rem 0.8rem', borderRadius: '999px', marginBottom: '1rem',
        }}>
          <ShieldCheck size={15} /> Proteção de Dados · LGPD
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem', lineHeight: 1.15 }}>
          Política de Privacidade
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#64748b', margin: 0 }}>
          Portal do Colaborador — Biodinâmica
        </p>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.35rem' }}>
          Última atualização: {ATUALIZADO_EM}
        </p>

        <Section n={1} title="Quem somos e objetivo desta política">
          <p>
            Esta Política de Privacidade descreve como a <strong>Biodinâmica</strong> (&ldquo;nós&rdquo;,
            controladora dos dados) coleta, utiliza, armazena e protege os dados pessoais
            tratados no <strong>Portal do Colaborador</strong> (&ldquo;Portal&rdquo; ou &ldquo;sistema&rdquo;).
            O tratamento é realizado em conformidade com a Lei Geral de Proteção de Dados
            Pessoais — <strong>LGPD (Lei nº 13.709/2018)</strong>.
          </p>
          <p>
            O Portal é de uso interno e restrito a colaboradores, gestores, equipe de Recursos
            Humanos e administradores, destinando-se à gestão de ocorrências de jornada
            (faltas, atrasos, horas extras e situações correlatas).
          </p>
        </Section>

        <Section n={2} title="Dados pessoais que tratamos">
          <p>No uso do Portal, podemos tratar as seguintes categorias de dados:</p>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            <li><strong>Dados de identificação e acesso:</strong> CPF (utilizado como login) e senha.</li>
            <li><strong>Dados cadastrais:</strong> nome completo, cargo e setor.</li>
            <li>
              <strong>Dados de ocorrências:</strong> tipo de ocorrência, data e hora, motivo
              descrito, decisões do gestor (aprovação, reprovação, abono ou desconto) e
              observações de gestor e do RH.
            </li>
            <li>
              <strong>Dados sensíveis de saúde:</strong> quando você anexa um
              <strong> atestado médico</strong>, esse documento pode conter informações de
              saúde, classificadas como <strong>dado pessoal sensível</strong> pela LGPD,
              recebendo proteção reforçada (ver item 6).
            </li>
            <li>
              <strong>Dados técnicos:</strong> informações de sessão armazenadas localmente no
              seu navegador para mantê-lo autenticado (ver item 9).
            </li>
          </ul>
        </Section>

        <Section n={3} title="Para que utilizamos os dados (finalidade)">
          <ul style={{ paddingLeft: '1.2rem' }}>
            <li>Autenticar o acesso e direcionar cada usuário ao painel do seu perfil.</li>
            <li>Registrar, analisar e dar andamento às ocorrências de jornada de trabalho.</li>
            <li>Permitir a avaliação pelo gestor e a ciência/arquivamento pelo RH.</li>
            <li>Gerar relatórios internos de gestão de pessoal.</li>
            <li>Cumprir obrigações trabalhistas, legais e regulatórias.</li>
          </ul>
        </Section>

        <Section n={4} title="Base legal do tratamento">
          <p>
            O tratamento dos dados se fundamenta principalmente nas seguintes bases legais da
            LGPD: <strong>cumprimento de obrigação legal ou regulatória</strong> (art. 7º, II),
            <strong> execução de contrato de trabalho</strong> (art. 7º, V) e, no que se refere
            a atestados médicos e demais dados de saúde, na hipótese de
            <strong> cumprimento de obrigação legal/regulatória pela controladora</strong>
            aplicável a dados sensíveis (art. 11, II, &ldquo;a&rdquo;).
          </p>
        </Section>

        <Section n={5} title="Quem tem acesso e compartilhamento">
          <p>
            O acesso é segmentado por perfil. Cada colaborador visualiza apenas as próprias
            ocorrências; gestores acessam as ocorrências da sua equipe; o RH e a administração
            acessam os registros conforme sua função. Não vendemos nem comercializamos dados
            pessoais.
          </p>
          <p>
            Os dados podem ser compartilhados com: <strong>operador de tecnologia</strong> que
            hospeda a infraestrutura do Portal (provedor de banco de dados e autenticação), que
            atua sob nossas instruções; e <strong>autoridades públicas</strong>, quando exigido
            por lei ou ordem judicial.
          </p>
        </Section>

        <Section n={6} title="Tratamento de atestados médicos (dados sensíveis)">
          <p>
            Atestados médicos são tratados com proteção reforçada. Os arquivos são armazenados
            em repositório de acesso restrito, disponibilizados apenas a usuários autorizados
            (gestor responsável e RH) e por meio de links temporários de download. Recomendamos
            que sejam anexados somente os documentos estritamente necessários à comprovação da
            ocorrência.
          </p>
        </Section>

        <Section n={7} title="Por quanto tempo guardamos">
          <p>
            Os dados são mantidos pelo período necessário ao cumprimento das finalidades acima e
            das obrigações legais aplicáveis à relação de trabalho (incluindo prazos
            prescricionais trabalhistas). Encerrado esse período, os dados são eliminados ou
            anonimizados, salvo quando a guarda for exigida por lei.
          </p>
        </Section>

        <Section n={8} title="Segurança da informação">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados, como conexão
            criptografada (SSL/TLS), controle de acesso por perfil, autenticação individual e
            restrição de acesso aos arquivos sensíveis. Apesar dos esforços, nenhum sistema é
            totalmente imune a incidentes; em caso de incidente de segurança relevante, adotaremos
            as providências previstas na LGPD.
          </p>
        </Section>

        <Section n={9} title="Armazenamento local no navegador">
          <p>
            O Portal utiliza o armazenamento local do seu navegador para guardar a sessão de
            autenticação, mantendo você conectado de forma segura. Não utilizamos cookies de
            publicidade nem rastreamento de terceiros. Ao encerrar a sessão (&ldquo;Sair do
            sistema&rdquo;), esses dados de sessão são removidos.
          </p>
        </Section>

        <Section n={10} title="Seus direitos como titular">
          <p>Nos termos da LGPD, você pode solicitar, a qualquer momento:</p>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            <li>confirmação da existência de tratamento e acesso aos seus dados;</li>
            <li>correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
            <li>informação sobre o compartilhamento dos seus dados;</li>
            <li>revogação de consentimento, quando aplicável.</li>
          </ul>
          <p style={{ marginTop: '0.6rem' }}>
            Algumas solicitações podem ser limitadas quando a guarda dos dados for necessária ao
            cumprimento de obrigações legais.
          </p>
        </Section>

        <Section n={11} title="Canal de contato sobre privacidade">
          <p>
            Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados e
            sobre esta política, entre em contato pelos canais abaixo:
          </p>
          <div style={{
            marginTop: '0.75rem', padding: '1rem 1.1rem', borderRadius: '12px',
            background: '#fff', border: '1px solid #e2e8f0', fontSize: '0.9rem', lineHeight: 1.6,
          }}>
            <div><strong>E-mail:</strong> contato@biodinamica.com.br</div>
            <div><strong>Telefone:</strong> (43) 3178-7000</div>
            <div><strong>Endereço:</strong> Rua Ronat Walter Sodré, 4350 — Parque Industrial IV, Ibiporã/PR</div>
          </div>
        </Section>

        <Section n={12} title="Alterações desta política">
          <p>
            Esta política pode ser atualizada para refletir mudanças legais ou no funcionamento do
            Portal. A data da última atualização é indicada no topo deste documento. Recomendamos a
            revisão periódica.
          </p>
        </Section>

        <div style={{
          marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0',
          fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center',
        }}>
          © {new Date().getFullYear()} Biodinâmica · Portal do Colaborador. Todos os direitos reservados.
        </div>
      </motion.main>
    </div>
  );
}
