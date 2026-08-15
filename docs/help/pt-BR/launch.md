---
title: Rodar e depurar (launch.json)
category: Ferramentas de workspace
order: 91
summary: Rode suas configurações de launch do VS Code sem sair do Gitcito.
keywords: launch.json rodar run depurar debug vscode configurações configs tasks preLaunchTask input background
---

# Rodar e depurar

O Gitcito lê o seu `.vscode/launch.json` — o da raiz e quaisquer aninhados,
agrupados com divisórias — e roda a configuração que você escolher no terminal
integrado.

![O seletor de launch e a barra flutuante](../../screenshots/launch-configs.webp)

- As **variáveis do VS Code são resolvidas** (`${workspaceFolder}` e companhia).
- O **`preLaunchTask`** de uma configuração roda antes.
- Valores **`${input:…}`** são perguntados interativamente antes de lançar
  (`promptString` e `pickString`).
- Tarefas **`isBackground`** (watchers, servidores de desenvolvimento) rodam
  destacadas, então nunca bloqueiam o lançamento.

Uma barra de ferramentas flutuante te dá **pausar / retomar, reiniciar, parar**, e
alterna entre as sessões em execução.

Ative em **Configurações → Geral → Habilitar launch.json**. O botão **LAUNCH**
aparece ao lado das abas Git / Arquivos.

**Veja também:** [Terminal integrado](terminal.md)
