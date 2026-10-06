# Regras do projeto

- Site estático em HTML, CSS e JavaScript puros; sem npm, framework ou build.
- A primeira dobra é o funil de vídeo e triagem; preserve sua jornada completa.
- Não altere os campos nem o formato do payload de leads.
- Mantenha um único `CONFIG`, `site_id: rendaverde-igreen` e `landing_page_id: lp-unificada`.
- Envios de lead devem permanecer bloqueados em `file:`, `localhost` e `127.0.0.1`.
- Preserve Google Analytics, Google Ads, Meta Pixel e Microsoft Clarity.
- Não publique preços, taxas, parcelas, remunerações ou linguagem de acesso sem custo.
- Não recrie a opção de cliente removida nem o simulador de carteira.
- Mantenha o aviso de ausência de garantia de renda.
- Use somente um player de vídeo e garanta somente uma reprodução ativa.
- Texto informativo deve ter pelo menos 15px; implemente mobile-first.
- Prefixe novos IDs e classes institucionais com `lp-` para evitar colisões.
- Preserve os índices numerados de `index.html`, `style.css` e `script.js`.
- Copie apenas assets efetivamente usados pela página.
- Não adicione dependências nem ferramentas de build.

## Validação

- `node --check script.js`
- `node tools/validate-page.js`
- `rg -n -i 'R\$|%|gratuit|grátis|à vista|12x|investimento|bônus|royalt|comiss' index.html script.js`
