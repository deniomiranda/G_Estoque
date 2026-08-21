/* Tela de Produtos: cadastro (estoque mínimo/máximo), listagem e filtros */

const Produtos = {
  lista: [],
  filtroStatus: 'todos',
  editandoId: null,

  async carregar() {
    await this.carregarCategorias();
    await this.aplicarFiltros();

    document.getElementById('filtroProdutoBusca').oninput = () => this.aplicarFiltros();
    document.getElementById('filtroCategoria').onchange = () => this.aplicarFiltros();
    document.querySelectorAll('#filtroStatusChips .chip').forEach((chip) => {
      chip.onclick = () => {
        document.querySelectorAll('#filtroStatusChips .chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.filtroStatus = chip.dataset.status;
        this.aplicarFiltros();
      };
    });

    document.getElementById('btnSalvarProduto').onclick = () => this.salvar();
  },

  async carregarCategorias() {
    try {
      const categorias = await Api.listarCategorias();
      const select = document.getElementById('filtroCategoria');
      const atual = select.value;
      select.innerHTML = '<option value="">Todas as categorias</option>' +
        categorias.map((c) => `<option value="${Fmt.escapeHtml(c)}">${Fmt.escapeHtml(c)}</option>`).join('');
      select.value = atual;

      const datalist = document.getElementById('listaCategorias');
      datalist.innerHTML = categorias.map((c) => `<option value="${Fmt.escapeHtml(c)}">`).join('');
    } catch (e) { /* segue sem categorias */ }
  },

  async aplicarFiltros() {
    const search = document.getElementById('filtroProdutoBusca').value.trim();
    const categoria = document.getElementById('filtroCategoria').value;
    try {
      const produtos = await Api.listarProdutos({ search, categoria, status: this.filtroStatus });
      this.lista = produtos;
      App.produtosCache = produtos;
      this.render();
    } catch (e) {
      toast('Erro ao carregar produtos: ' + e.message, 'err');
    }
  },

  render() {
    const tbody = document.getElementById('tabelaProdutos');
    const empty = document.getElementById('produtosEmptyState');
    if (!this.lista.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    tbody.innerHTML = this.lista.map((p) => `
      <tr>
        <td class="cell-code">${Fmt.escapeHtml(p.codigo)}</td>
        <td class="cell-strong">${Fmt.escapeHtml(p.nome)}<div class="muted" style="font-size:11px;">${Fmt.escapeHtml(p.fornecedor || '')}</div></td>
        <td>${Fmt.escapeHtml(p.categoria || '—')}</td>
        <td class="cell-num">${Fmt.numero(p.estoque_atual)} <span class="muted">${Fmt.escapeHtml(p.unidade)}</span></td>
        <td class="cell-num muted">${Fmt.numero(p.estoque_minimo)} / ${Fmt.numero(p.estoque_maximo)}</td>
        <td><span class="badge badge-${p.status_estoque}">${Fmt.statusLabel(p.status_estoque)}</span></td>
        <td class="cell-num">${Fmt.moeda(p.preco_custo)}</td>
        <td class="cell-num cell-strong">${Fmt.moeda(p.estoque_atual * p.preco_custo)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm btn-icon" title="Movimentar" data-mov="${p.id}">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 21l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Editar" data-edit="${p.id}">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Inativar" data-del="${p.id}">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => this.abrirModalEdicao(Number(b.dataset.edit)));
    tbody.querySelectorAll('[data-mov]').forEach((b) => b.onclick = () => Movimentacoes.abrirModal(Number(b.dataset.mov)));
    tbody.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => this.remover(Number(b.dataset.del)));
  },

  abrirModalNovo() {
    this.editandoId = null;
    document.getElementById('modalProdutoTitulo').textContent = 'Novo produto';
    document.getElementById('formProduto').reset();
    document.getElementById('fCodigo').disabled = false;
    document.getElementById('wrapEstoqueInicial').classList.remove('hidden');
    document.getElementById('fUnidade').value = 'UN';
    this.esconderAlerta();
    Modal.open('modalProduto');
    setTimeout(() => document.getElementById('fCodigo').focus(), 60);
  },

  abrirModalEdicao(id) {
    const p = this.lista.find((x) => x.id === id) || App.produtosCache.find((x) => x.id === id);
    if (!p) return;
    this.editandoId = id;
    document.getElementById('modalProdutoTitulo').textContent = 'Editar produto';
    document.getElementById('fCodigo').value = p.codigo;
    document.getElementById('fCodigo').disabled = false;
    document.getElementById('fNome').value = p.nome;
    document.getElementById('fCategoria').value = p.categoria || '';
    document.getElementById('fUnidade').value = p.unidade || 'UN';
    document.getElementById('fFornecedor').value = p.fornecedor || '';
    document.getElementById('fEstoqueMinimo').value = p.estoque_minimo;
    document.getElementById('fEstoqueMaximo').value = p.estoque_maximo;
    document.getElementById('fPrecoCusto').value = p.preco_custo;
    document.getElementById('fPrecoVenda').value = p.preco_venda;
    document.getElementById('fLocalizacao').value = p.localizacao || '';
    document.getElementById('wrapEstoqueInicial').classList.add('hidden');
    this.esconderAlerta();
    Modal.open('modalProduto');
  },

  esconderAlerta() {
    const el = document.getElementById('produtoFormAlert');
    el.classList.remove('show'); el.textContent = '';
  },
  mostrarAlerta(msg) {
    const el = document.getElementById('produtoFormAlert');
    el.textContent = msg; el.classList.add('show');
  },

  async salvar() {
    const payload = {
      codigo: document.getElementById('fCodigo').value,
      nome: document.getElementById('fNome').value,
      categoria: document.getElementById('fCategoria').value,
      unidade: document.getElementById('fUnidade').value,
      fornecedor: document.getElementById('fFornecedor').value,
      estoque_minimo: document.getElementById('fEstoqueMinimo').value,
      estoque_maximo: document.getElementById('fEstoqueMaximo').value,
      preco_custo: document.getElementById('fPrecoCusto').value,
      preco_venda: document.getElementById('fPrecoVenda').value,
      localizacao: document.getElementById('fLocalizacao').value,
    };
    if (!this.editandoId) payload.estoque_atual = document.getElementById('fEstoqueInicial').value || 0;

    try {
      if (this.editandoId) {
        await Api.atualizarProduto(this.editandoId, payload);
        toast('Produto atualizado com sucesso.', 'ok');
      } else {
        await Api.criarProduto(payload);
        toast('Produto cadastrado com sucesso.', 'ok');
      }
      Modal.close('modalProduto');
      await this.carregar();
    } catch (e) {
      this.mostrarAlerta(e.message);
    }
  },

  async remover(id) {
    const p = this.lista.find((x) => x.id === id);
    if (!confirm(`Inativar o produto "${p ? p.nome : ''}"? Ele deixará de aparecer nas listagens, mas o histórico é mantido.`)) return;
    try {
      await Api.removerProduto(id);
      toast('Produto inativado.', 'ok');
      await this.aplicarFiltros();
    } catch (e) {
      toast('Erro: ' + e.message, 'err');
    }
  },
};
