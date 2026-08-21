# Gestão de Estoque

Sistema web de controle de estoque — HTML, CSS e JavaScript no front-end,
Node.js no back-end e um banco de dados **SQLite** próprio, sem serviços
externos e sem necessidade de internet para funcionar.

## 📁 Onde colocar os arquivos

Extraia (ou copie) esta pasta inteira para:

```
C:\Claude_Code\Gestão de Estoque
```

A estrutura final deve ficar assim:

```
C:\Claude_Code\Gestão de Estoque\
├── BD\                  ← o banco SQLite (bd.db) é criado aqui automaticamente
├── public\               ← todo o front-end (HTML, CSS, JS)
├── server.js             ← servidor
├── package.json
└── LEIA-ME.md
```

Você não precisa criar o arquivo `bd.db` manualmente — na primeira vez que o
servidor for iniciado, ele cria a pasta `BD` e o arquivo `BD\bd.db`
automaticamente, já com as tabelas e 5 produtos de exemplo cadastrados.

## ✅ Pré-requisito

- **Node.js versão 22.5 ou superior** (o sistema usa o módulo nativo
  `node:sqlite`, incluído no próprio Node — **não é necessário instalar
  nenhuma dependência com `npm install`**).
- Baixe em: https://nodejs.org (escolha a versão "Current"/mais recente).
- Para conferir a versão instalada, abra o Prompt de Comando e digite:
  ```
  node -v
  ```

## ▶️ Como rodar

1. Abra o **Prompt de Comando** (ou PowerShell) na pasta do projeto:
   ```
   cd "C:\Claude_Code\Gestão de Estoque"
   ```
2. Inicie o servidor:
   ```
   node server.js
   ```
3. Você verá uma mensagem confirmando que o servidor está rodando. Abra o
   navegador em:
   ```
   http://localhost:3000
   ```
4. Pronto — o sistema está funcionando, com o banco salvo em
   `BD\bd.db`.

Para parar o servidor, volte ao Prompt de Comando e pressione `Ctrl + C`.

> Dica: se quiser que ele inicie sempre na mesma janela, pode criar um atalho
> com um arquivo `iniciar.bat` contendo `node server.js` e `pause`.

## 🧭 Funcionalidades

- **Dashboard**: valor total em estoque, produtos abaixo do mínimo, produtos
  zerados, gráfico de entradas/saídas dos últimos 7 dias, valor por
  categoria e últimas movimentações.
- **Produtos (cadastro)**: código, nome, categoria, unidade, fornecedor,
  localização, preço de custo/venda, **estoque mínimo e estoque máximo**.
- **Movimentações**:
  - **Entrada** — soma ao estoque atual.
  - **Saída** — subtrai do estoque atual (bloqueia se não houver saldo).
  - **Correção** — define o novo valor contado do estoque (ex: após
    inventário físico ou avaria). **O campo "Observação" é obrigatório**
    nesse tipo de movimentação.
- **Busca inteligente**: barra de busca global no topo (por nome, código,
  categoria ou fornecedor) e filtros por status de estoque (Ok, baixo,
  zerado, excesso) em cada tela.
- **Relatórios**:
  - **Sugestão de compra** — lista produtos com estoque ≤ mínimo e sugere
    a quantidade a comprar (estoque máximo − estoque atual), com custo
    estimado e nível de urgência. Exportável em CSV.
  - **Posição de estoque** — visão valorizada de todo o estoque atual.
    Exportável em CSV.

## 🗄️ Sobre o banco de dados

- Local: `BD\bd.db` (formato SQLite padrão — pode ser aberto com qualquer
  visualizador de SQLite, como o **DB Browser for SQLite**, caso queira
  inspecionar os dados diretamente).
- Tabelas: `produtos` e `movimentacoes`.
- Todo o histórico de movimentações é preservado mesmo quando um produto é
  removido (a exclusão de produto é lógica — ele fica marcado como inativo,
  não é apagado do banco).

## 🔧 Personalização rápida

- Porta do servidor: por padrão `3000`. Para mudar, defina a variável de
  ambiente `PORT` antes de iniciar, ex.: `set PORT=8080 && node server.js`.
- Unidades de medida disponíveis no cadastro: edite a lista em
  `public/index.html`, campo `#fUnidade`.
