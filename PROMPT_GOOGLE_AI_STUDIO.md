# Prompt para Google AI Studio — integrar Banco de Questões Específicas

Implemente no aplicativo uma área chamada **Banco de Questões — Provas Originais** usando os arquivos deste pacote. Não recrie nem invente questões. O banco oficial é `database/questoes_especificas.json` (ou a versão minificada `database/questoes_especificas.min.json`).

## Requisitos obrigatórios

1. Carregue as 270 questões e as cinco provas do banco. O pacote contém somente Conhecimentos Específicos; não adicionar Conhecimentos Básicos.
2. Preserve exatamente os textos extraídos, a banca, a empresa, o ano, a ênfase, o número original, o tipo de questão e o gabarito/status.
3. Identifique cada questão exclusivamente por `question_id` ou `app_lookup_key` (`EXAM_ID:numero`). Nunca faça busca pelo número isolado.
4. Crie filtros de empresa, concurso/ano, banca, ênfase, grupo Pareto, área, tema e número da questão.
5. Ao abrir uma questão, exiba: cabeçalho da prova, banca, número, assunto, contexto comum (se houver), enunciado, alternativas ou resposta Certo/Errado, e botão “Ver questão original”.
6. “Ver questão original” deve carregar a imagem WebP indicada em `visual_reference.image_path`. Use `object-fit: contain`, permita ampliar e não corte figuras, equações ou tabelas.
7. Inclua botão para abrir a versão reduzida do PDF da prova em `specific_pdf_path`, posicionando no valor `source_pdf_page_specific_derivative`. Apresente também a página original `pdf_page`.
8. Em questões CESGRANRIO, permitir selecionar uma alternativa A–E. Em questões CEBRASPE, permitir selecionar Certo ou Errado.
9. Mantenha gabarito oculto por padrão durante a resolução. Depois de corrigir, mostre `correct_option_label`/`correct_judgment`, texto da alternativa certa quando disponível e `answer_key_status_label`. Se o item estiver anulado, mostrar “Questão anulada”, sem contabilizar acerto ou erro.
10. Não transformar gabaritos preliminares em definitivos. Exiba claramente a situação herdada no campo `answer_key_status`.
11. Faça os gráficos, rankings e módulos Pareto existentes navegarem para a lista de questões correspondentes. Cada barra, linha, célula de matriz ou tema deve abrir as questões que compõem aquele total.
12. Inclua contagem de questões por prova e valide que são 270 no total: Transpetro 2018 (40), Petrobras 2023.1 (60), Petrobras 2023.2 (60), Transpetro 2023.1 Dutos e Terminais (40), ANSA 2026 (70).

## Caminhos esperados no projeto

- `public/data/questoes_especificas.min.json`
- `public/data/indice_questoes.json`
- `public/data/provas.json`
- `public/assets/questions/{exam_id}/Qnnn.webp`
- `public/provas-especificas/{exam_id}_somente_conhecimentos_especificos.pdf`

Adapte os caminhos se o projeto já tiver outra estrutura, mas preserve os caminhos relativos ou atualize-os de forma consistente.

## Fluxo de navegação

Dashboard/Pareto → clicar em tema → lista de questões filtradas → abrir questão → responder → corrigir → visualizar recorte original/PDF.

## Validação antes de concluir

- Verifique que todas as imagens referenciadas existem.
- Verifique que cada uma das 270 `app_lookup_key` é única.
- Verifique que cada `question_id` é único.
- Verifique que todos os registros estão associados a uma das cinco provas.
- Verifique que nenhuma questão básica foi importada.
- Teste uma questão com alternativas (Transpetro 2018 Q21), uma questão CEBRASPE com contexto (Petrobras 2023.1 Q41), uma questão com tabela (Transpetro 2023 Q21) e uma questão ANSA (Q100).
- Não substitua imagem da questão por um resumo textual.

Implemente a integração mantendo o design, funcionalidades e banco já existentes. Não apague históricos, desempenho, favoritos ou dados atuais do usuário.
