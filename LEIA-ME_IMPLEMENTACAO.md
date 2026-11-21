# Banco de Questões Específicas — Operação e Dutos e Terminais

## O que está neste pacote

Este pacote foi montado a partir dos cinco PDFs anexados. Ele contém **somente questões da parte de Conhecimentos Específicos**: os itens de Conhecimentos Básicos (Português, Matemática e outros blocos gerais) foram excluídos.

- 270 questões específicas, identificadas por `question_id` e `app_lookup_key`.
- Texto extraído e normalizado para pesquisa e renderização.
- Uma imagem WebP por questão, recortada da página original para preservar fórmulas, diagramas, tabelas e estrutura visual.
- Gabarito e situação do gabarito, quando já constavam do banco anterior.
- PDF reduzido de cada prova contendo somente páginas que abrigam questões específicas.
- Página original e página correspondente no PDF reduzido.

## Arquivos principais

| Arquivo | Uso |
|---|---|
| `database/questoes_especificas.json` | Banco principal recomendado para o app |
| `database/questoes_especificas.min.json` | Mesmo banco minificado, menor para distribuição |
| `database/questoes_especificas.jsonl` | Uma questão por linha, útil para importação em lote |
| `database/indice_questoes.json` | Busca direta por `EXAM_ID:numero` |
| `database/provas.json` | Identificação das provas e mapeamento de páginas |
| `assets/questions/{exam_id}/Qnnn.webp` | Imagem original recortada de cada questão |
| `specific_pdfs/` | PDFs com páginas específicas, sem as páginas básicas |
| `reference_materials/` | Material de apoio separado, quando aplicável |

## Provas incluídas

1. Transpetro 2018 — Técnico(a) de Operação Júnior — questões 21 a 60 (40).
2. Petrobras 2023.1 — Ênfase 7: Operação — itens 41 a 100 (60).
3. Petrobras 2023.2 — Ênfase 8: Operação — itens 41 a 100 (60). A prova foi aplicada em 2024, mas pertence ao PSP 2023.2.
4. Transpetro 2023.1 — Ênfase 2: Dutos e Terminais — questões 21 a 60 (40).
5. ANSA 2026 — Ênfase 22: Operação — itens 31 a 100 (70).

Total: 270 questões específicas.

## Como localizar uma questão

Use a chave composta, que inclui a prova e o número:

```json
{
  "app_lookup_key": "TRANSPETRO_2023_1_DUTOS_TERMINAIS:25",
  "question_id": "TRANSPETRO_2023_1_DUTOS_TERMINAIS_Q025",
  "question_number": 25,
  "pdf_page": 8,
  "source_pdf_page_specific_derivative": 1,
  "visual_reference": {
    "image_path": "assets/questions/TRANSPETRO_2023_1_DUTOS_TERMINAIS/Q025.webp"
  }
}
```

**Não use apenas o número da questão**: o número 41, por exemplo, aparece em várias provas. Use `app_lookup_key` ou `question_id`.

## Renderização recomendada no app

- Mostre `context_text_normalized` antes do enunciado quando não estiver vazio.
- Mostre `question_text_normalized` como texto selecionável e pesquisável.
- Para questões CESGRANRIO, apresente as alternativas A–E a partir de `alternatives`.
- Para questões CEBRASPE, ofereça os botões “Certo” e “Errado”.
- Exiba a imagem WebP dentro de uma opção “Ver questão original” ou abaixo do texto quando houver figura, tabela, equação ou necessidade de fidelidade visual.
- Mostre a resposta correta somente após a ação de corrigir, salvo no modo de estudo com gabarito visível.
- Exiba o status do gabarito. Não apresente gabarito preliminar como definitivo. Questões anuladas devem aparecer como anuladas, sem tratá-las como acerto/erro.
- O arquivo `specific_pdfs/...` é a versão reduzida para abrir a prova sem o conteúdo básico. Use `source_pdf_page_original` para a página do PDF original e `source_pdf_page_specific_derivative` para a página do PDF reduzido.

## Google AI Studio / app web

1. Extraia o ZIP no projeto do aplicativo.
2. Copie `database/` para `public/data/` (ou para o diretório estático equivalente).
3. Copie `assets/questions/` para `public/assets/questions/`.
4. Copie `specific_pdfs/` para `public/provas-especificas/`.
5. Faça o app carregar `public/data/questoes_especificas.min.json` com `fetch` ou importe o JSON.
6. Ao clicar em um resultado, procure pelo `app_lookup_key` ou `question_id`; nunca por número isolado.
7. Para exibir imagem, use o `visual_reference.image_path` como caminho relativo à raiz pública.
8. Para abrir o PDF reduzido, use `specific_pdf_path` e a página `source_pdf_page_specific_derivative`.

Se o app for hospedado em um backend, mantenha os mesmos caminhos relativos e envie as pastas para o storage correspondente. Não coloque os PDFs completos originais na pasta pública caso não queira expor os Conhecimentos Básicos.

## Limitações conhecidas

- Texto de PDF pode preservar pequenas quebras de linha ou símbolos especiais; a imagem WebP da questão é a referência visual fiel.
- Os gabaritos mantêm o status herdado do banco anterior (preliminar, definitivo, alterado ou anulado).
- O pacote não inclui as provas completas originais. Os PDFs derivados contêm somente páginas com questões específicas; materiais de consulta que não são questões podem ficar separados em `reference_materials/`.
