/* Núcleo da aplicação: navegação entre telas, busca global e controle de modais */

const App = {
  currentView: 'dashboard',
  produtosCache: [],

  init() {
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => this.goTo(btn.dataset.view));
    });
    document.getElementById('btnGoDashboard').addEventListener('click', () => this.goTo('dashboard'));

    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => Modal.close(btn.dataset.close));
    });
    document.querySelectorAll('.modal-overlay').forEach((ov) => {
      ov.addEventListener('click', (e) => { if (e.target === ov) Modal.close(ov.id); });
    });

    document.getElementById('btnNovaMovimentacaoTop').addEventListener('click', () => Movimentacoes.abrirModal());
    document.getElementById('btnNovaMovimentacao').addEventListener('click', () => Movimentacoes.abrirModal());
    document.getElementById('btnNovoProduto').addEventListener('click', () => Produtos.abrirModalNovo());

    this.initGlobalSearch();
    this.goTo('dashboard');
  },

  goTo(view) {
    this.currentView = view;
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');

    if (view === 'dashboard') Dashboard.carregar();
    if (view === 'produtos') Produtos.carregar();
    if (view === 'movimentacoes') Movimentacoes.carregar();
    if (view === 'relatorios') Relatorios.carregar();
  },

  initGlobalSearch() {
    const input = document.getElementById('globalSearch');
    const box = document.getElementById('searchResults');
    let timer = null;

    input.addEventListener('input', () => {
      clearTimeout(timer);
      const termo = input.value.trim();
      if (!termo) { box.classList.remove('open'); return; }
      timer = setTimeout(async () => {
        try {
          const produtos = await Api.listarProdutos({ search: termo });
          this.renderGlobalResults(produtos.slice(0, 8), box);
        } catch (e) { /* silencioso */ }
      }, 200);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrap')) box.classList.remove('open');
    });
  },

  renderGlobalResults(produtos, box) {
    if (!produtos.length) {
      box.innerHTML = `<div class="search-empty">Nenhum produto encontrado</div>`;
    } else {
      box.innerHTML = produtos.map((p) => `
        <div class="search-result-item" data-id="${p.id}">
          <div>
            <div class="sri-name">${Fmt.escapeHtml(p.nome)}</div>
            <div class="sri-meta">${Fmt.escapeHtml(p.codigo)} · ${Fmt.escapeHtml(p.categoria || 'Sem categoria')}</div>
          </div>
          <span class="badge badge-${p.status_estoque}">${Fmt.statusLabel(p.status_estoque)}</span>
        </div>
      `).join('');
      box.querySelectorAll('.search-result-item').forEach((item) => {
        item.addEventListener('click', () => {
          box.classList.remove('open');
          document.getElementById('globalSearch').value = '';
          this.goTo('produtos');
          setTimeout(() => Produtos.abrirModalEdicao(Number(item.dataset.id)), 80);
        });
      });
    }
    box.classList.add('open');
  },
};

const Modal = {
  open(id) { document.getElementById(id).classList.add('open'); },
  close(id) { document.getElementById(id).classList.remove('open'); },
};

document.addEventListener('DOMContentLoaded', () => App.init());
