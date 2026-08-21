/* Tela de Movimentações: entrada, saída e correção de estoque
   Regra de negócio: correção exige observação obrigatória */

const Movimentacoes = {
  lista: [],
  tipoAtual: 'entrada',
  produtoSelecionado: null,

  async carregar() {
    await this.aplicarFiltros();
    document.getElementById('filtroMovBusca').oninput = () => this.aplicarFiltros();
    document.getElementById('filtroDataInicio').onchange = () => this.aplicarFiltros();
    document.getElementById('filtroDataFim').onchange = () => this.aplicarFiltros();
    document.querySelectorAll('#filtroTipoChips .chip').forEach((chip) => {
      chip.onclick = () => {
        document.querySelectorAll('#filtroTipoChips .chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.aplicarFiltros();
      };
    });
    document.getElementById('btnSalvarMovimentacao').onclick = () => this.salvar();

    document.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.onclick = () => this.selecionarTipo(btn.dataset.tipo);
    });
    document.getElementById('fMovProdutoBusca').oninput = (e) => this.buscarProdutoModal(e.target.value);
    document.getElementById('fMovQuantidade').oninput = () => this.atualizarPreview();
  },

  async aplicarFiltros() {
    const search = document.getElementById('filtroMovBusca').value.trim();
    const tipo = document.querySelector('#filtroTipoChips .chip.active')?.dataset.tipo || '';
    const data_inicio = document.getElementById('filtroDataInicio').value;
    const data_fim = document.getElementById('filtroDataFim').value;
    try {
      this.lista = await Api.listarMovimentacoes({ search, tipo, data_inicio, data_fim });
      this.render();
    } catch (e) {
      toast('Erro ao carregar movimentações: ' + e.message, 'err');
    }
  },

  render() {
    const tbody = document.getElementById('tabelaMovimentacoes');
    const empty = document.getElementById('movEmptyState');
    if (!this.lista.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = this.lista.map((m) => `
      <tr>
        <td class="muted">${Fmt.dataHora(m.data)}</td>
        <td class="cell-strong">${Fmt.escapeHtml(m.produto_nome)}<div class="cell-code">${Fmt.escapeHtml(m.produto_codigo)}</div></td>
        <td><span class="badge badge-${m.tipo}">${Fmt.tipoLabel(m.tipo)}</span></td>
        <td class="cell-num">${m.quantidade > 0 ? '+' : ''}${Fmt.numero(m.quantidade)} ${Fmt.escapeHtml(m.produto_unidade)}</td>
        <td class="cell-num muted">${Fmt.numero(m.estoque_anterior)} → <b style="color:var(--ink)">${Fmt.numero(m.estoque_novo)}</b></td>
        <td class="muted">${Fmt.escapeHtml(m.documento || '—')}</td>
        <td class="muted" style="max-width:260px;">${Fmt.escapeHtml(m.observacao || '—')}</td>
      </tr>
    `).join('');
  },

  abrirModal(produtoId = null) {
    document.getElementById('formMovimentacao').reset();
    document.getElementById('fMovProdutoId').value = '';
    this.produtoSelecionado = null;
    document.getElementById('wrapEstoqueAtualInfo').classList.add('hidden');
    this.esconderAlerta();
    this.selecionarTipo('entrada');

    if (produtoId) {
      const p = App.produtosCache.find((x) => x.id === produtoId) || Produtos.lista.find((x) => x.id === produtoId);
      if (p) this.selecionarProduto(p);
    } else {
      document.getElementById('fMovProdutoBusca').value = '';
      document.getElementById('movProdutoResultados').style.display = 'none';
    }

    Modal.open('modalMovimentacao');
    setTimeout(() => document.getElementById('fMovProdutoBusca').focus(), 60);
  },

  selecionarTipo(tipo) {
    this.tipoAtual = tipo;
    document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.tipo === tipo));

    const labelQtd = document.getElementById('labelQuantidade');
    const labelObs = document.getElementById('labelObservacao');
    const obsHint = document.getElementById('obsHint');

    if (tipo === 'correcao') {
      labelQtd.innerHTML = 'Estoque contado (novo valor) <span class="req">*</span>';
      labelObs.innerHTML = 'Observação <span class="req">*</span>';
      obsHint.textContent = 'Obrigatório: explique o motivo da correção (ex: inventário, avaria, perda).';
    } else if (tipo === 'entrada') {
      labelQtd.innerHTML = 'Quantidade recebida <span class="req">*</span>';
      labelObs.innerHTML = 'Observação';
      obsHint.textContent = 'Opcional. Ex: número da nota fiscal ou fornecedor.';
    } else {
      labelQtd.innerHTML = 'Quantidade retirada <span class="req">*</span>';
      labelObs.innerHTML = 'Observação';
      obsHint.textContent = 'Opcional. Ex: destino ou motivo da saída.';
    }
    this.atualizarPreview();
  },

  async buscarProdutoModal(termo) {
    const box = document.getElementById('movProdutoResultados');
    termo = termo.trim();
    document.getElementById('fMovProdutoId').value = '';
    this.produtoSelecionado = null;
    document.getElementById('wrapEstoqueAtualInfo').classList.add('hidden');
    if (!termo) { box.style.display = 'none'; return; }

    try {
      const produtos = await Api.listarProdutos({ search: termo });
      if (!produtos.length) {
        box.innerHTML = `<div class="search-empty">Nenhum produto encontrado</div>`;
      } else {
        box.innerHTML = produtos.slice(0, 6).map((p) => `
          <div class="search-result-item" data-id="${p.id}">
            <div>
              <div class="sri-name">${Fmt.escapeHtml(p.nome)}</div>
              <div class="sri-meta">${Fmt.escapeHtml(p.codigo)} · estoque: ${Fmt.numero(p.estoque_atual)} ${Fmt.escapeHtml(p.unidade)}</div>
            </div>
            <span class="badge badge-${p.status_estoque}">${Fmt.statusLabel(p.status_estoque)}</span>
          </div>`).join('');
        box.querySelectorAll('.search-result-item').forEach((item) => {
          item.onclick = () => {
            const p = produtos.find((x) => x.id === Number(item.dataset.id));
            this.selecionarProduto(p);
          };
        });
      }
      box.style.display = 'block';
    } catch (e) { /* silencioso */ }
  },

  selecionarProduto(p) {
    this.produtoSelecionado = p;
    document.getElementById('fMovProdutoId').value = p.id;
    document.getElementById('fMovProdutoBusca').value = `${p.nome} (${p.codigo})`;
    document.getElementById('movProdutoResultados').style.display = 'none';
    document.getElementById('wrapEstoqueAtualInfo').classList.remove('hidden');
    document.getElementById('movEstoqueAtualTxt').textContent = `${Fmt.numero(p.estoque_atual)} ${p.unidade}`;
    this.atualizarPreview();
  },

  atualizarPreview() {
    const el = document.getElementById('movEstoquePreviewTxt');
    if (!this.produtoSelecionado) { el.textContent = ''; return; }
    const qtd = Number(document.getElementById('fMovQuantidade').value) || 0;
    const atual = this.produtoSelecionado.estoque_atual;
    let novo;
    if (this.tipoAtual === 'entrada') novo = atual + qtd;
    else if (this.tipoAtual === 'saida') novo = atual - qtd;
    else novo = qtd;
    el.textContent = `Estoque após confirmar: ${Fmt.numero(novo)} ${this.produtoSelecionado.unidade}`;
  },

  esconderAlerta() {
    const el = document.getElementById('movFormAlert');
    el.classList.remove('show'); el.textContent = '';
  },
  mostrarAlerta(msg) {
    const el = document.getElementById('movFormAlert');
    el.textContent = msg; el.classList.add('show');
  },

  async salvar() {
    this.esconderAlerta();
    const produtoId = document.getElementById('fMovProdutoId').value;
    const quantidade = document.getElementById('fMovQuantidade').value;
    const observacao = document.getElementById('fMovObservacao').value.trim();
    const documento = document.getElementById('fMovDocumento').value.trim();

    if (!produtoId) return this.mostrarAlerta('Selecione um produto.');
    if (quantidade === '' || Number(quantidade) < 0) return this.mostrarAlerta('Informe uma quantidade válida.');
    if (this.tipoAtual === 'correcao' && !observacao) return this.mostrarAlerta('O campo observação é obrigatório para correção de estoque.');

    try {
      await Api.criarMovimentacao({
        produto_id: Number(produtoId),
        tipo: this.tipoAtual,
        quantidade: Number(quantidade),
        observacao, documento,
      });
      toast('Movimentação registrada com sucesso.', 'ok');
      Modal.close('modalMovimentacao');
      if (App.currentView === 'movimentacoes') await this.aplicarFiltros();
      if (App.currentView === 'produtos') await Produtos.aplicarFiltros();
      if (App.currentView === 'dashboard') await Dashboard.carregar();
    } catch (e) {
      this.mostrarAlerta(e.message);
    }
  },
};
