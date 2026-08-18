# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

# A URL da API é embutida no build (Vite injeta VITE_* em tempo de compilação)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ---- Runner (nginx servindo os estáticos) ----
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
