/* Tela de Dashboard: KPIs, gráficos e alertas */

const Dashboard = {
  async carregar() {
    document.getElementById('btnRefreshDash').onclick = () => this.carregar();
    try {
      const d = await Api.dashboard();
      this.renderKpis(d);
      this.renderGraficoMovimentacoes(d.ultimos7);
      this.renderGraficoCategorias(d.categorias);
      this.renderUltimasMovimentacoes(d.ultimasMovimentacoes);
      this.renderAlertas(d);
    } catch (e) {
      toast('Erro ao carregar dashboard: ' + e.message, 'err');
    }
  },

  renderKpis(d) {
    const kpis = [
      {
        label: 'Produtos ativos', value: Fmt.numero(d.totalProdutos, 0), sub: `${d.movHoje.entrada + d.movHoje.saida + d.movHoje.correcao} movimentações hoje`,
        icon: 'i-blue', svg: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>'
      },
      {
        label: 'Valor em estoque', value: Fmt.moeda(d.valorTotalEstoque), sub: `Potencial de venda: ${Fmt.moeda(d.valorTotalVenda)}`,
        icon: 'i-jade', svg: '<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'
      },
      {
        label: 'Abaixo do mínimo', value: Fmt.numero(d.abaixoMinimo, 0), sub: 'Produtos exigindo reposição',
        icon: 'i-amber', svg: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
      },
      {
        label: 'Estoque zerado', value: Fmt.numero(d.zerados, 0), sub: 'Produtos sem unidades disponíveis',
        icon: 'i-red', svg: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>'
      },
    ];
    document.getElementById('kpiGrid').innerHTML = kpis.map((k) => `
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">${k.label}</span>
          <div class="kpi-icon ${k.icon}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${k.svg}</svg></div>
        </div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-sub">${k.sub}</div>
      </div>
    `).join('');
  },

  renderGraficoMovimentacoes(ultimos7) {
    const canvas = document.getElementById('chartMov');
    const labels = ultimos7.map((d) => {
      const [, m, dia] = d.dia.split('-');
      return `${dia}/${m}`;
    });
    Charts.barrasDuplas(canvas, labels, ultimos7.map((d) => d.entradas), ultimos7.map((d) => d.saidas), '#0f9d70', '#d23b3b');
  },

  renderGraficoCategorias(categorias) {
    const canvas = document.getElementById('chartCategorias');
    Charts.pizza(canvas, categorias, ['#2f5ee0', '#0f9d70', '#c8790a', '#7048c9', '#d23b3b', '#565e6b']);
  },

  renderUltimasMovimentacoes(lista) {
    const el = document.getElementById('ultimasMovimentacoes');
    if (!lista.length) { el.innerHTML = '<p class="muted" style="font-size:13px;">Nenhuma movimentação registrada ainda.</p>'; return; }
    el.innerHTML = lista.map((m) => `
      <div class="flex" style="justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--border);">
        <div>
          <div style="font-weight:600; font-size:13px;">${Fmt.escapeHtml(m.produto_nome)}</div>
          <div class="muted" style="font-size:11.5px;">${Fmt.dataHora(m.data)}</div>
        </div>
        <div class="text-right">
          <span class="badge badge-${m.tipo}">${Fmt.tipoLabel(m.tipo)}</span>
          <div class="mono" style="font-size:12px; margin-top:3px;">${m.quantidade > 0 ? '+' : ''}${Fmt.numero(m.quantidade)}</div>
        </div>
      </div>
    `).join('');
  },

  renderAlertas(d) {
    const el = document.getElementById('alertasEstoque');
    if (d.abaixoMinimo === 0 && d.zerados === 0) {
      el.innerHTML = `<p class="muted" style="font-size:13px;">Nenhum alerta no momento. Estoque saudável.</p>`;
      return;
    }
    el.innerHTML = `
      <div class="flex gap-10" style="margin-bottom:10px; padding:10px 12px; background:var(--red-bg); border-radius:8px;">
        <span class="badge badge-zerado">Crítico</span>
        <span style="font-size:13px; color:var(--ink);">${d.zerados} produto(s) com estoque zerado.</span>
      </div>
      <div class="flex gap-10" style="margin-bottom:10px; padding:10px 12px; background:var(--amber-bg); border-radius:8px;">
        <span class="badge badge-baixo">Atenção</span>
        <span style="font-size:13px; color:var(--ink);">${d.abaixoMinimo} produto(s) abaixo do estoque mínimo.</span>
      </div>
      <button class="btn btn-outline btn-sm" id="btnVerSugestoes" style="width:100%; justify-content:center; margin-top:4px;">Ver sugestão de compra completa →</button>
    `;
    document.getElementById('btnVerSugestoes').onclick = () => App.goTo('relatorios');
  },
};
