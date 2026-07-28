# Portal do Colaborador

Portal interno com dashboards por perfil (Colaborador, Gestor, RH e Admin) para gestão de colaboradores, com autenticação e backend via Supabase.

## Funcionalidades

- Login e controle de acesso por papel (colaborador, gestor, RH, admin)
- Dashboards dedicados por perfil
- Geração de relatórios em PDF (jsPDF)
- Script de criação em massa de colaboradores via Supabase
- Página de política de privacidade

## Stack

- React 19 + Vite
- Tailwind CSS 4 + shadcn/ui (Radix)
- Supabase (auth + banco de dados)
- Framer Motion, Lottie
- Docker + Nginx para deploy

## Como rodar localmente

```bash
npm install
cp .env.example .env   # preencha com suas credenciais do Supabase
npm run dev
```

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Lint do projeto |
| `npm run criar:colaboradores` | Cria colaboradores em massa no Supabase |

## Deploy

Inclui `Dockerfile` e `nginx.conf` para build de imagem Docker pronta para produção.
