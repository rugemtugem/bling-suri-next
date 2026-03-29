# Skill: Deployment VPS

## Pré-requisitos
- Node.js 20+ instalado no VPS
- Nginx configurado
- PM2 para process management

## Build
```bash
npm run build
```

## Configurar Nginx (subfolder)
```nginx
location /bling-suri-next {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
}
```

## PM2
```bash
cd /path/to/bling-suri-next
pm2 start npm --name "bling-suri" -- start -- -p 3001
pm2 save
```

## Crons (via crontab)
```bash
# Renovar token Bling a cada 4 horas
0 */4 * * * curl -s https://rugemtugem.dev/bling-suri-next/api/cron/refresh > /dev/null

# Sincronizar status a cada 5 minutos
*/5 * * * * curl -s -X POST https://rugemtugem.dev/bling-suri-next/api/sync/status > /dev/null
```

## Variáveis de Ambiente
Copiar `.env` para o servidor e ajustar:
- `DATABASE_URL` → caminho absoluto do SQLite
- `JWT_SECRET` → gerar novo valor seguro em produção
- `BLING_REDIRECT_URI` → URL de produção
