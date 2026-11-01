# Central de Estudos

Ambiente web de aprendizagem e acompanhamento para ENEM e vestibulares.

## Mapa curricular
- 1.064 tópicos e subtópicos no catálogo-base.
- Matemática, Física, Química, Biologia, História, Geografia, Português, Filosofia e Redação.
- Áreas adicionais podem ser criadas pelo usuário, assim como unidades e tópicos.
- Catálogo-base preservado; extensões pessoais ficam em armazenamento separado.

## Áreas
- Visão geral e progresso por matéria.
- Trilhas de conteúdo, busca global e status por tópico.
- Diagnóstico e registro de sessões.
- Revisões espaçadas D+1, D+7 e D+14.
- Área dedicada de Redação com trilha, histórico e notas por competência.
- Guia de estudo com ciclo de aprendizagem e regras de consolidação.
- Banco de dificuldades com classificação E1–E6, causa, ação corretiva e evidência de superação.
- Planejamento semanal flexível por dia, duração, matéria, tópico e tipo de bloco.
- Biblioteca de prompts especializados para diagnóstico, aula, questões, análise de erros, revisão, redação e relatório à Central.
- Exportação e importação dos dados flexíveis, além do backup de sessões e progresso.

## Método pedagógico
A sequência de trabalho é: diagnosticar → compreender → aplicar → corrigir → revisar. Assistir a uma aula ou ler um resumo não equivale a domínio. O avanço deve ser sustentado por questões, recuperação ativa e retenção.

## Armazenamento
Os dados são locais ao navegador (localStorage). Não há autenticação, servidor, sincronização entre dispositivos ou banco de dados remoto. Exporte backups periodicamente, especialmente antes de limpar os dados do navegador.

## Executar
Abra `index.html` em um navegador moderno. O catálogo compactado é carregado por `catalog.js`; a aplicação-base usa `app.js` e `styles.css`; os recursos flexíveis adicionais ficam em `advanced.js`.

## Publicação
GitHub Pages a partir da branch `main`, diretório raiz.
