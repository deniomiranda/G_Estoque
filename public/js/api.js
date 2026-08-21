/* Camada de comunicação com o backend (API REST em /api/*) */

const Api = {
  async _req(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* sem corpo */ }
    if (!res.ok) {
      const msg = (data && data.erro) ? data.erro : `Erro na requisição (${res.status})`;
      throw new Error(msg);
    }
    return data;
  },

  // Produtos
  listarProdutos(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._req('GET', `/api/produtos${qs ? '?' + qs : ''}`);
  },
  criarProduto(payload) { return this._req('POST', '/api/produtos', payload); },
  atualizarProduto(id, payload) { return this._req('PUT', `/api/produtos/${id}`, payload); },
  removerProduto(id) { return this._req('DELETE', `/api/produtos/${id}`); },
  listarCategorias() { return this._req('GET', '/api/categorias'); },

  // Movimentações
  listarMovimentacoes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._req('GET', `/api/movimentacoes${qs ? '?' + qs : ''}`);
  },
  criarMovimentacao(payload) { return this._req('POST', '/api/movimentacoes', payload); },

  // Dashboard e relatórios
  dashboard() { return this._req('GET', '/api/dashboard'); },
  relatorioSugestaoCompra() { return this._req('GET', '/api/relatorios/sugestao-compra'); },
  relatorioEstoque() { return this._req('GET', '/api/relatorios/estoque'); },
};

/* Utilitários gerais usados por toda a aplicação */
const Fmt = {
  moeda(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },
  numero(v, casas = 2) {
    const n = Number(v) || 0;
    const arred = Math.round(n * 100) / 100;
    return arred % 1 === 0 ? arred.toLocaleString('pt-BR') : arred.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  },
  dataHora(iso) {
    if (!iso) return '—';
    const [datePart, timePart] = iso.split(' ');
    if (!datePart) return iso;
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}${timePart ? ' ' + timePart.slice(0, 5) : ''}`;
  },
  statusLabel(status) {
    return { ok: 'Ok', baixo: 'Estoque baixo', zerado: 'Zerado', excesso: 'Excesso' }[status] || status;
  },
  tipoLabel(tipo) {
    return { entrada: 'Entrada', saida: 'Saída', correcao: 'Correção' }[tipo] || tipo;
  },
  escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
};

function toast(mensagem, tipo = '') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast ${tipo}`.trim();
  el.textContent = mensagem;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .2s'; setTimeout(() => el.remove(), 200); }, 3200);
}

function downloadCsv(nomeArquivo, colunas, linhas) {
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = colunas.map((c) => escape(c.label)).join(';');
  const body = linhas.map((row) => colunas.map((c) => escape(row[c.key])).join(';')).join('\n');
  const csv = '\uFEFF' + header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
