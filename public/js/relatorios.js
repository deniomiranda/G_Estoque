/* Tela de Relatórios: sugestão de compra (baseada em mín/máx) e posição de estoque */

const Relatorios = {
  sugestaoAtual: [],
  estoqueAtual: [],

  async carregar() {
    document.querySelectorAll('.report-tab').forEach((tab) => {
      tab.onclick = () => {
        document.querySelectorAll('.report-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.report-panel').forEach((p) => p.classList.remove('active'));
        document.getElementById(`report-${tab.dataset.report}`).classList.add('active');
      };
    });
    document.getElementById('btnExportSugestao').onclick = () => this.exportarSugestao();
    document.getElementById('btnExportEstoque').onclick = () => this.exportarEstoque();

    await this.carregarSugestao();
    await this.carregarEstoque();
  },

  async carregarSugestao() {
    try {
      this.sugestaoAtual = await Api.relatorioSugestaoCompra();
      const tbody = document.getElementById('tabelaSugestao');
      const empty = document.getElementById('sugestaoEmptyState');
      if (!this.sugestaoAtual.length) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');
      tbody.innerHTML = this.sugestaoAtual.map((p) => `
        <tr>
          <td class="cell-code">${Fmt.escapeHtml(p.codigo)}</td>
          <td class="cell-strong">${Fmt.escapeHtml(p.nome)}</td>
          <td class="muted">${Fmt.escapeHtml(p.fornecedor || '—')}</td>
          <td class="cell-num">${Fmt.numero(p.estoque_atual)}</td>
          <td class="cell-num muted">${Fmt.numero(p.estoque_minimo)}</td>
          <td class="cell-num muted">${Fmt.numero(p.estoque_maximo)}</td>
          <td class="cell-num cell-strong">${Fmt.numero(p.quantidade_sugerida)} ${Fmt.escapeHtml(p.unidade)}</td>
          <td class="cell-num">${Fmt.moeda(p.custo_estimado)}</td>
          <td><span class="badge badge-${p.urgencia}">${p.urgencia === 'critica' ? 'Crítica' : 'Atenção'}</span></td>
        </tr>
      `).join('');
    } catch (e) {
      toast('Erro ao carregar sugestão de compra: ' + e.message, 'err');
    }
  },

  async carregarEstoque() {
    try {
      this.estoqueAtual = await Api.relatorioEstoque();
      document.getElementById('tabelaEstoque').innerHTML = this.estoqueAtual.map((p) => `
        <tr>
          <td class="cell-code">${Fmt.escapeHtml(p.codigo)}</td>
          <td class="cell-strong">${Fmt.escapeHtml(p.nome)}</td>
          <td class="muted">${Fmt.escapeHtml(p.categoria || '—')}</td>
          <td class="cell-num">${Fmt.numero(p.estoque_atual)} ${Fmt.escapeHtml(p.unidade)}</td>
          <td><span class="badge badge-${p.status_estoque}">${Fmt.statusLabel(p.status_estoque)}</span></td>
          <td class="cell-num">${Fmt.moeda(p.preco_custo)}</td>
          <td class="cell-num cell-strong">${Fmt.moeda(p.valor_total)}</td>
        </tr>
      `).join('');
    } catch (e) {
      toast('Erro ao carregar posição de estoque: ' + e.message, 'err');
    }
  },

  exportarSugestao() {
    if (!this.sugestaoAtual.length) return toast('Não há dados para exportar.', 'err');
    downloadCsv('sugestao_de_compra.csv', [
      { key: 'codigo', label: 'Código' }, { key: 'nome', label: 'Produto' }, { key: 'fornecedor', label: 'Fornecedor' },
      { key: 'estoque_atual', label: 'Estoque atual' }, { key: 'estoque_minimo', label: 'Estoque mínimo' },
      { key: 'estoque_maximo', label: 'Estoque máximo' }, { key: 'quantidade_sugerida', label: 'Sugestão de compra' },
      { key: 'custo_estimado', label: 'Custo estimado' },
    ], this.sugestaoAtual);
  },

  exportarEstoque() {
    if (!this.estoqueAtual.length) return toast('Não há dados para exportar.', 'err');
    downloadCsv('posicao_de_estoque.csv', [
      { key: 'codigo', label: 'Código' }, { key: 'nome', label: 'Produto' }, { key: 'categoria', label: 'Categoria' },
      { key: 'estoque_atual', label: 'Estoque atual' }, { key: 'status_estoque', label: 'Status' },
      { key: 'preco_custo', label: 'Custo unitário' }, { key: 'valor_total', label: 'Valor total' },
    ], this.estoqueAtual);
  },
};
