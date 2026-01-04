# QA Selector Helper

**QA Selector Helper** é uma extensão para Google Chrome desenvolvida para agilizar a vida de QA Engineers e Desenvolvedores. Ela gera automaticamente seletores robustos e confiáveis (CSS/XPath) para **Cypress** e **Playwright**, eliminando a "adivinhação" na hora de escrever testes automatizados.

## Funcionalidades

- **Inspeção Inteligente**: Clique em qualquer elemento da página para gerar o melhor seletor possível.
- **Prioridade de QA**: A ferramenta prioriza atributos de teste (`data-cy`, `data-testid`, `data-qa`) sobre IDs ou Classes genéricas.
- **Painel Lateral (Side Panel)**: Interface persistente que não fecha enquanto você navega e interage com a página.
- **Detecção de Contexto**:
  - Reconhece se você clicou em um container (ex: form) e lista automaticamente os inputs e botões importantes dentro dele.
- **UI Moderna & Dark Mode**: Interface limpa, com suporte nativo a Tema Escuro.
- **Lista de Candidatos**: Não gostou do seletor automático? Escolha entre todas as opções disponíveis (ID, Name, Texto, Ancestrais) em uma lista clara.
- **Fluxo Limpo**: Cópia automática para o clipboard com auto-limpeza da interface para a próxima inspeção.

## Como Usar

1. **Abra o Painel**: Clique no ícone da extensão na barra do navegador (ela abrirá na barra lateral direita).
2. **Ative a Inspeção**: Ligue a chave "Inspecionar".
3. **Selecione**: Passe o mouse sobre os elementos (veja a etiqueta rosa identificando-os) e clique.
4. **Copie**: Escolha o melhor seletor na lista e clique em "Copiar". O código já vem formatado para Cypress (`cy.get`) ou Playwright (`page.locator`).

## Tech Stack

- **Manifest V3**: Compatível com as normas mais recentes de segurança e performance do Chrome (2025).
- **Vanilla JavaScript**: Leve e rápido, sem dependências pesadas.
- **Side Panel API**: Para melhor experiência de usuário (UX).
