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
├── iniciar.bat           ← atalho para abrir o sistema
├── iniciar.vbs           ← usado pelo iniciar.bat para rodar 100% oculto
├── parar.bat             ← atalho para encerrar o servidor
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

## ▶️ Como abrir o sistema (forma mais fácil)

Dentro da pasta do projeto tem um arquivo **`iniciar.bat`**. Basta dar
**duplo clique** nele:

1. O servidor sobe **totalmente em segundo plano** — não aparece nenhuma
   janela, nem mesmo minimizada na barra de tarefas.
2. Depois de alguns segundos, o navegador abre sozinho em
   `http://localhost:3000` com o sistema pronto para uso.

> O `iniciar.bat` funciona chamando um pequeno script auxiliar
> (`iniciar.vbs`) que roda o Node.js de forma oculta. Os dois arquivos
> precisam ficar juntos, na mesma pasta.

Como não há mais nenhuma janela visível, para **fechar o sistema** você
**precisa** usar o `parar.bat` (dê duplo clique nele) — ele localiza o
servidor pelo identificador de processo salvo automaticamente em
`servidor.pid` e o encerra.

Se por algum motivo o `parar.bat` não conseguir encerrar (raro), abra o
**Gerenciador de Tarefas** do Windows, procure por **node.exe** na aba
"Detalhes" e finalize a tarefa manualmente.

> Um arquivo `servidor.log` também é criado na pasta — é apenas o registro
> do que o servidor exibiria no terminal, útil só se algo der errado. Pode
> ignorá-lo ou apagá-lo a qualquer momento com o servidor parado.

> **Nota:** como os arquivos vieram de um `.zip` baixado, o Windows pode
> exibir um aviso de segurança ("Windows protegeu o computador") na
> primeira vez. Se isso acontecer, clique com o botão direito no arquivo
> `.zip` → **Propriedades** → marque **Desbloquear** → **OK**, antes de
> extrair. Isso é um comportamento padrão do Windows para arquivos
> baixados da internet, não um problema do sistema em si.

### Criar um atalho na Área de Trabalho

Se quiser abrir com um ícone no desktop, sem precisar entrar na pasta:

1. Clique com o botão direito no arquivo `iniciar.bat`.
2. Escolha **Enviar para → Área de trabalho (criar atalho)**.
3. (Opcional) Clique com o botão direito no atalho criado → **Propriedades**
   → **Alterar Ícone...** para personalizar o ícone.
4. Você pode renomear o atalho para algo como "Gestão de Estoque".

Agora é só dar duplo clique nesse atalho sempre que quiser abrir o sistema.

## ▶️ Como abrir manualmente (alternativa)

Se preferir não usar o `.bat`, também funciona assim:

1. Abra o **Prompt de Comando** (ou PowerShell) na pasta do projeto:
   ```
   cd "C:\Claude_Code\Gestão de Estoque"
   ```
2. Inicie o servidor:
   ```
   node server.js
   ```
3. Abra o navegador em:
   ```
   http://localhost:3000
   ```
4. Para parar, volte à janela do Prompt e pressione `Ctrl + C`.

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
