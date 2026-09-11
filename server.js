/**
 * Sistema de Controle de Estoque - Servidor
 * -------------------------------------------------
 * Backend 100% em Node.js nativo (sem dependências externas).
 * Usa o módulo nativo `node:sqlite` (disponível a partir do Node 22.5+).
 * Banco de dados: BD/bd.db
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DB_DIR = path.join(ROOT_DIR, 'BD');
const DB_PATH = path.join(DB_DIR, 'bd.db');
const PID_FILE = path.join(ROOT_DIR, 'servidor.pid');

// Grava o PID do processo em um arquivo, para que o servidor possa ser
// encerrado corretamente mesmo quando roda oculto (sem nenhuma janela visível).
fs.writeFileSync(PID_FILE, String(process.pid));
function limparArquivoPid() {
  try { fs.unlinkSync(PID_FILE); } catch (e) { /* já removido ou inacessível */ }
}
process.on('exit', limparArquivoPid);
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

// ---------------------------------------------------------------------------
// Inicialização do banco de dados
// ---------------------------------------------------------------------------
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS produtos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo          TEXT UNIQUE NOT NULL,
  nome            TEXT NOT NULL,
  categoria       TEXT DEFAULT '',
  unidade         TEXT DEFAULT 'UN',
  fornecedor      TEXT DEFAULT '',
  estoque_atual   REAL NOT NULL DEFAULT 0,
  estoque_minimo  REAL NOT NULL DEFAULT 0,
  estoque_maximo  REAL NOT NULL DEFAULT 0,
  preco_custo     REAL NOT NULL DEFAULT 0,
  preco_venda     REAL NOT NULL DEFAULT 0,
  localizacao     TEXT DEFAULT '',
  ativo           INTEGER NOT NULL DEFAULT 1,
  criado_em       TEXT DEFAULT (datetime('now','localtime')),
  atualizado_em   TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS movimentacoes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id        INTEGER NOT NULL REFERENCES produtos(id),
  tipo              TEXT NOT NULL CHECK (tipo IN ('entrada','saida','correcao')),
  quantidade        REAL NOT NULL,
  estoque_anterior  REAL NOT NULL,
  estoque_novo      REAL NOT NULL,
  documento         TEXT DEFAULT '',
  observacao        TEXT DEFAULT '',
  data              TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_mov_produto ON movimentacoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_mov_data ON movimentacoes(data);
CREATE INDEX IF NOT EXISTS idx_prod_nome ON produtos(nome);
`);

// Seed opcional: se banco vazio, cria alguns produtos de exemplo para facilitar os testes
const countRow = db.prepare('SELECT COUNT(*) AS c FROM produtos').get();
if (countRow.c === 0) {
  const seed = db.prepare(`INSERT INTO produtos
    (codigo, nome, categoria, unidade, fornecedor, estoque_atual, estoque_minimo, estoque_maximo, preco_custo, preco_venda, localizacao)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const produtosExemplo = [
    ['P0001', 'Parafuso Sextavado M8', 'Ferragens', 'CX', 'Fornecedor Industrial LTDA', 120, 50, 300, 0.35, 0.80, 'A1-01'],
    ['P0002', 'Luva de Proteção Nitrílica', 'EPI', 'PAR', 'SafeWork EPIs', 8, 20, 100, 4.20, 9.90, 'B2-05'],
    ['P0003', 'Óleo Lubrificante 1L', 'Insumos', 'UN', 'Lubrimax Distribuidora', 0, 10, 60, 12.50, 24.90, 'C1-02'],
    ['P0004', 'Fita Isolante 20m', 'Elétrico', 'UN', 'ElétricaTotal', 45, 15, 80, 3.10, 6.50, 'A3-04'],
    ['P0005', 'Caixa de Papelão Grande', 'Embalagens', 'UN', 'PackBox Embalagens', 200, 100, 500, 1.80, 3.20, 'D1-01'],
  ];
  for (const p of produtosExemplo) seed.run(...p);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(new Error('JSON inválido no corpo da requisição'));
      }
    });
    req.on('error', reject);
  });
}

function statusEstoque(p) {
  if (p.estoque_atual <= 0) return 'zerado';
  if (p.estoque_atual <= p.estoque_minimo) return 'baixo';
  if (p.estoque_maximo > 0 && p.estoque_atual > p.estoque_maximo) return 'excesso';
  return 'ok';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Proibido'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // fallback para index.html (SPA)
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
        if (err2) { res.writeHead(404); res.end('Não encontrado'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Rotas da API
// ---------------------------------------------------------------------------
async function handleApi(req, res, url) {
  const parts = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
  const method = req.method;
  const q = url.searchParams;

  try {
    // ---------- PRODUTOS ----------
    if (parts[0] === 'produtos' && !parts[1] && method === 'GET') {
      const search = (q.get('search') || '').trim().toLowerCase();
      const categoria = q.get('categoria') || '';
      const status = q.get('status') || 'todos';
      const incluirInativos = q.get('inativos') === '1';

      let rows = db.prepare('SELECT * FROM produtos ORDER BY nome COLLATE NOCASE').all();
      if (!incluirInativos) rows = rows.filter(p => p.ativo === 1);
      if (search) {
        rows = rows.filter(p =>
          p.nome.toLowerCase().includes(search) ||
          p.codigo.toLowerCase().includes(search) ||
          (p.categoria || '').toLowerCase().includes(search) ||
          (p.fornecedor || '').toLowerCase().includes(search)
        );
      }
      if (categoria) rows = rows.filter(p => p.categoria === categoria);
      rows = rows.map(p => ({ ...p, status_estoque: statusEstoque(p) }));
      if (status !== 'todos') rows = rows.filter(p => p.status_estoque === status);

      return sendJson(res, 200, rows);
    }

    if (parts[0] === 'produtos' && !parts[1] && method === 'POST') {
      const b = await readBody(req);
      const erros = validarProduto(b);
      if (erros.length) return sendJson(res, 400, { erro: erros.join(' ') });
      try {
        const stmt = db.prepare(`INSERT INTO produtos
          (codigo, nome, categoria, unidade, fornecedor, estoque_atual, estoque_minimo, estoque_maximo, preco_custo, preco_venda, localizacao)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
        const info = stmt.run(
          b.codigo.trim(), b.nome.trim(), (b.categoria || '').trim(), (b.unidade || 'UN').trim(),
          (b.fornecedor || '').trim(), Number(b.estoque_atual) || 0, Number(b.estoque_minimo) || 0,
          Number(b.estoque_maximo) || 0, Number(b.preco_custo) || 0, Number(b.preco_venda) || 0,
          (b.localizacao || '').trim()
        );
        const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(info.lastInsertRowid);
        return sendJson(res, 201, produto);
      } catch (e) {
        if (String(e.message).includes('UNIQUE')) return sendJson(res, 400, { erro: 'Já existe um produto com este código.' });
        throw e;
      }
    }

    if (parts[0] === 'produtos' && parts[1] && method === 'PUT') {
      const id = Number(parts[1]);
      const existente = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
      if (!existente) return sendJson(res, 404, { erro: 'Produto não encontrado.' });
      const b = await readBody(req);
      const erros = validarProduto(b);
      if (erros.length) return sendJson(res, 400, { erro: erros.join(' ') });
      try {
        db.prepare(`UPDATE produtos SET
          codigo=?, nome=?, categoria=?, unidade=?, fornecedor=?,
          estoque_minimo=?, estoque_maximo=?, preco_custo=?, preco_venda=?, localizacao=?,
          atualizado_em = datetime('now','localtime')
          WHERE id=?`).run(
          b.codigo.trim(), b.nome.trim(), (b.categoria || '').trim(), (b.unidade || 'UN').trim(),
          (b.fornecedor || '').trim(), Number(b.estoque_minimo) || 0, Number(b.estoque_maximo) || 0,
          Number(b.preco_custo) || 0, Number(b.preco_venda) || 0, (b.localizacao || '').trim(), id
        );
        const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
        return sendJson(res, 200, produto);
      } catch (e) {
        if (String(e.message).includes('UNIQUE')) return sendJson(res, 400, { erro: 'Já existe um produto com este código.' });
        throw e;
      }
    }

    if (parts[0] === 'produtos' && parts[1] && method === 'DELETE') {
      const id = Number(parts[1]);
      const existente = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
      if (!existente) return sendJson(res, 404, { erro: 'Produto não encontrado.' });
      db.prepare("UPDATE produtos SET ativo = 0, atualizado_em = datetime('now','localtime') WHERE id = ?").run(id);
      return sendJson(res, 200, { ok: true });
    }

    // ---------- CATEGORIAS ----------
    if (parts[0] === 'categorias' && method === 'GET') {
      const rows = db.prepare("SELECT DISTINCT categoria FROM produtos WHERE categoria != '' AND ativo = 1 ORDER BY categoria COLLATE NOCASE").all();
      return sendJson(res, 200, rows.map(r => r.categoria));
    }

    // ---------- MOVIMENTAÇÕES ----------
    if (parts[0] === 'movimentacoes' && !parts[1] && method === 'GET') {
      const produtoId = q.get('produto_id');
      const tipo = q.get('tipo') || '';
      const dataInicio = q.get('data_inicio') || '';
      const dataFim = q.get('data_fim') || '';
      const search = (q.get('search') || '').trim().toLowerCase();
      const limit = Number(q.get('limit')) || 500;

      let rows = db.prepare(`
        SELECT m.*, p.nome AS produto_nome, p.codigo AS produto_codigo, p.unidade AS produto_unidade
        FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id
        ORDER BY m.data DESC, m.id DESC
      `).all();

      if (produtoId) rows = rows.filter(r => String(r.produto_id) === String(produtoId));
      if (tipo) rows = rows.filter(r => r.tipo === tipo);
      if (dataInicio) rows = rows.filter(r => r.data >= dataInicio);
      if (dataFim) rows = rows.filter(r => r.data <= dataFim + ' 23:59:59');
      if (search) rows = rows.filter(r =>
        r.produto_nome.toLowerCase().includes(search) ||
        r.produto_codigo.toLowerCase().includes(search) ||
        (r.observacao || '').toLowerCase().includes(search)
      );

      return sendJson(res, 200, rows.slice(0, limit));
    }

    if (parts[0] === 'movimentacoes' && !parts[1] && method === 'POST') {
      const b = await readBody(req);
      const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(Number(b.produto_id));
      if (!produto) return sendJson(res, 400, { erro: 'Produto inválido.' });
      if (!['entrada', 'saida', 'correcao'].includes(b.tipo)) return sendJson(res, 400, { erro: 'Tipo de movimentação inválido.' });

      const quantidadeInformada = Number(b.quantidade);
      if (isNaN(quantidadeInformada) || (b.tipo !== 'correcao' && quantidadeInformada <= 0)) {
        return sendJson(res, 400, { erro: 'Informe uma quantidade válida.' });
      }
      if (b.tipo === 'correcao' && (!b.observacao || !b.observacao.trim())) {
        return sendJson(res, 400, { erro: 'O campo observação é obrigatório para correção de estoque.' });
      }

      const estoqueAnterior = produto.estoque_atual;
      let estoqueNovo, quantidadeMovimentada;

      if (b.tipo === 'entrada') {
        quantidadeMovimentada = quantidadeInformada;
        estoqueNovo = estoqueAnterior + quantidadeInformada;
      } else if (b.tipo === 'saida') {
        if (quantidadeInformada > estoqueAnterior) {
          return sendJson(res, 400, { erro: `Estoque insuficiente. Disponível: ${estoqueAnterior} ${produto.unidade}.` });
        }
        quantidadeMovimentada = -quantidadeInformada;
        estoqueNovo = estoqueAnterior - quantidadeInformada;
      } else {
        // correção: quantidadeInformada é o novo valor CONTADO de estoque
        if (quantidadeInformada < 0) return sendJson(res, 400, { erro: 'O estoque contado não pode ser negativo.' });
        estoqueNovo = quantidadeInformada;
        quantidadeMovimentada = estoqueNovo - estoqueAnterior;
      }

      db.prepare(`INSERT INTO movimentacoes
        (produto_id, tipo, quantidade, estoque_anterior, estoque_novo, documento, observacao)
        VALUES (?,?,?,?,?,?,?)`).run(
        produto.id, b.tipo, quantidadeMovimentada, estoqueAnterior, estoqueNovo,
        (b.documento || '').trim(), (b.observacao || '').trim()
      );
      db.prepare("UPDATE produtos SET estoque_atual = ?, atualizado_em = datetime('now','localtime') WHERE id = ?").run(estoqueNovo, produto.id);

      const produtoAtualizado = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto.id);
      return sendJson(res, 201, { ok: true, produto: produtoAtualizado });
    }

    // ---------- DASHBOARD ----------
    if (parts[0] === 'dashboard' && method === 'GET') {
      const produtos = db.prepare('SELECT * FROM produtos WHERE ativo = 1').all();
      const totalProdutos = produtos.length;
      const valorTotalEstoque = produtos.reduce((s, p) => s + p.estoque_atual * p.preco_custo, 0);
      const valorTotalVenda = produtos.reduce((s, p) => s + p.estoque_atual * p.preco_venda, 0);
      const abaixoMinimo = produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length;
      const zerados = produtos.filter(p => p.estoque_atual <= 0).length;
      const excesso = produtos.filter(p => p.estoque_maximo > 0 && p.estoque_atual > p.estoque_maximo).length;

      const hoje = new Date().toISOString().slice(0, 10);
      const movHoje = db.prepare('SELECT tipo, COUNT(*) as c FROM movimentacoes WHERE data >= ? GROUP BY tipo').all(hoje);
      const movHojeObj = { entrada: 0, saida: 0, correcao: 0 };
      for (const m of movHoje) movHojeObj[m.tipo] = m.c;

      // últimos 7 dias de movimentação (para gráfico)
      const ultimos7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const diaStr = d.toISOString().slice(0, 10);
        const entradas = db.prepare("SELECT COALESCE(SUM(quantidade),0) as v FROM movimentacoes WHERE tipo='entrada' AND date(data) = ?").get(diaStr).v;
        const saidas = db.prepare("SELECT COALESCE(SUM(-quantidade),0) as v FROM movimentacoes WHERE tipo='saida' AND date(data) = ?").get(diaStr).v;
        ultimos7.push({ dia: diaStr, entradas, saidas });
      }

      const categorias = {};
      for (const p of produtos) {
        const cat = p.categoria || 'Sem categoria';
        categorias[cat] = (categorias[cat] || 0) + p.estoque_atual * p.preco_custo;
      }

      const ultimasMovimentacoes = db.prepare(`
        SELECT m.*, p.nome as produto_nome, p.codigo as produto_codigo
        FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id
        ORDER BY m.data DESC, m.id DESC LIMIT 8
      `).all();

      return sendJson(res, 200, {
        totalProdutos, valorTotalEstoque, valorTotalVenda,
        abaixoMinimo, zerados, excesso,
        movHoje: movHojeObj, ultimos7, categorias, ultimasMovimentacoes
      });
    }

    // ---------- RELATÓRIOS ----------
    if (parts[0] === 'relatorios' && parts[1] === 'sugestao-compra' && method === 'GET') {
      const produtos = db.prepare('SELECT * FROM produtos WHERE ativo = 1').all();
      const sugestoes = produtos
        .filter(p => p.estoque_atual <= p.estoque_minimo)
        .map(p => {
          const sugerido = Math.max(p.estoque_maximo - p.estoque_atual, 0);
          return {
            ...p,
            quantidade_sugerida: sugerido,
            custo_estimado: sugerido * p.preco_custo,
            urgencia: p.estoque_atual <= 0 ? 'critica' : 'atencao',
          };
        })
        .sort((a, b) => (a.urgencia === b.urgencia ? b.custo_estimado - a.custo_estimado : a.urgencia === 'critica' ? -1 : 1));
      return sendJson(res, 200, sugestoes);
    }

    if (parts[0] === 'relatorios' && parts[1] === 'estoque' && method === 'GET') {
      const produtos = db.prepare('SELECT * FROM produtos WHERE ativo = 1 ORDER BY nome COLLATE NOCASE').all();
      const rows = produtos.map(p => ({ ...p, status_estoque: statusEstoque(p), valor_total: p.estoque_atual * p.preco_custo }));
      return sendJson(res, 200, rows);
    }

    return sendJson(res, 404, { erro: 'Rota de API não encontrada.' });
  } catch (e) {
    console.error(e);
    return sendJson(res, 500, { erro: 'Erro interno do servidor: ' + e.message });
  }
}

function validarProduto(b) {
  const erros = [];
  if (!b.codigo || !b.codigo.trim()) erros.push('Código é obrigatório.');
  if (!b.nome || !b.nome.trim()) erros.push('Nome é obrigatório.');
  if (b.estoque_minimo !== undefined && Number(b.estoque_minimo) < 0) erros.push('Estoque mínimo não pode ser negativo.');
  if (b.estoque_maximo !== undefined && Number(b.estoque_maximo) < 0) erros.push('Estoque máximo não pode ser negativo.');
  if (Number(b.estoque_maximo) > 0 && Number(b.estoque_minimo) > Number(b.estoque_maximo)) {
    erros.push('Estoque mínimo não pode ser maior que o estoque máximo.');
  }
  return erros;
}

// ---------------------------------------------------------------------------
// Servidor HTTP
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    return handleApi(req, res, url);
  }
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log('==============================================');
  console.log('  Sistema de Controle de Estoque');
  console.log(`  Servidor rodando em: http://localhost:${PORT}`);
  console.log(`  Banco de dados: ${DB_PATH}`);
  console.log('==============================================');
});
