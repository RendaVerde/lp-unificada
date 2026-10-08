# Regras do projeto

- Site estático em HTML, CSS e JavaScript puros; sem npm, framework ou build.
- A primeira dobra é o funil de vídeo e triagem; preserve sua jornada completa.
- Preserve os campos existentes do payload; os campos adicionais são `cidade`, `uf` e `investimento_faixa`.
- Mantenha um único `CONFIG`, `site_id: rendaverde-igreen` e `landing_page_id: lp-unificada`.
- Envios de lead devem permanecer bloqueados em `file:`, `localhost` e `127.0.0.1`.
- Preserve Google Analytics, Google Ads, Meta Pixel e Microsoft Clarity.
- Valores só podem existir no simulador, na prova social, nas estatísticas institucionais e nas faixas da pergunta de investimento.
- Na planilha, colunas novas entram somente no final; payloads antigos sem os campos novos devem gerar células vazias, nunca erro.
- Não recrie preços da licença nem a opção de cliente removida.
- Mantenha o aviso de ausência de garantia de renda.
- Use somente um player de vídeo e garanta somente uma reprodução ativa.
- Texto informativo deve ter pelo menos 15px; implemente mobile-first.
- Prefixe novos IDs e classes institucionais com `lp-` para evitar colisões.
- Preserve os índices numerados de `index.html`, `style.css` e `script.js`.
- Copie apenas assets efetivamente usados pela página.
- Não adicione dependências nem ferramentas de build.
- A LP inicia com `hidden` e `inert`, é liberada no resultado e pode ser acessada por rolagem.
- “Ver o que a iGreen oferece” fica no centro e apenas rola até a primeira seção.
- CTAs da LP apontam apenas para WhatsApp ou auto conexão; nunca reiniciam o funil.
- Use somente tokens de cor presentes nos CSS de origem; cada parte mantém sua paleta.

## Validação

- `node --check script.js`
- `node tools/validate-page.js`
- `rg -n -i 'R\$|%|gratuit|grátis|à vista|12x|investimento|bônus|royalt|comiss' index.html script.js` (somente simulador, prova social, estatísticas e pergunta/faixas de investimento)
