# Patch do receptor de leads

O endpoint do `CONFIG` aponta para um Google Apps Script. A cópia local de referência está em
`F:\Projetos-iGreen\langing-page\integrations\google-sheets\Code.gs`.

O receptor mapeia cada célula pelo nome normalizado do cabeçalho através de `LEADS_COLUMNS`;
a posição atual das colunas é preservada. `Cidade` já faz parte do esquema existente. O patch
adiciona `UF` e `Investimento faixa` ao fim e, em abas antigas sem `Cidade`, também a acrescenta
ao fim. Leads das outras LPs deixam essas células vazias sem gerar erro.

No editor do projeto Apps Script que publica o endpoint, abra `Code.gs`, aplique integralmente
`Code.gs.diff`, salve e atualize a implantação do Web app para uma nova versão. Depois confirme
a aplicação antes de executar `node tools/test-lead.js --confirm-send`.
