# Central de Estudos

Aplicação web estática para organizar a preparação para o ENEM 2026.

## Mapa curricular
- 1.064 tópicos e subtópicos já mapeados.
- Matemática, Física, Química, Biologia, História, Geografia, Português, Filosofia e Redação.
- Sociologia e Artes aparecem no catálogo como áreas pendentes de diagnóstico e detalhamento.
- Organização por unidades, tópicos e subtópicos, sem exigir cadastro manual.

## Progresso e prática
- Progresso individual por tópico: não iniciado, em andamento, revisar e dominado.
- Indicadores por matéria e visão global.
- Busca global por tópico e matéria.
- Registro de sessões ligado a tópicos.
- Revisões automáticas em D+1, D+7 e D+14 após sessões vinculadas.
- Área exclusiva de Redação com trilha de 13 etapas, histórico de produções e avaliação das cinco competências.
- Exportação e importação de backup em JSON.

## Executar
Abra `index.html` em um navegador moderno. O catálogo compactado é carregado por `catalog.js`, e a interface fica em `app.js` e `styles.css`.

## Armazenamento
O avanço dos tópicos, sessões, revisões e redações fica no armazenamento local do navegador (localStorage). Não há conta, servidor ou sincronização entre dispositivos. Exporte backups periodicamente.

## Publicação
Site estático publicado pelo GitHub Pages a partir da branch `main`, pasta raiz.
