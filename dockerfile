# Estágio 1: Build
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# As variáveis do Supabase precisam existir em BUILD TIME — o Vite injeta os
# valores no bundle durante o `npm run build`. Configure-as no Coolify como
# Build Variables (Build-time), senão o app sobe em tela branca.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# Estágio 2: Servidor de Produção
FROM nginx:alpine
# O Vite gera o build na pasta 'dist' por padrão
COPY --from=build /app/dist /usr/share/nginx/html
# SPA: qualquer rota (/gestor, /rh, ...) cai no index.html (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
