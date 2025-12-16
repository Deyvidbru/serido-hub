const API = window.API_BASE_URL;

function getSearchTerm() {
  const params = new URLSearchParams(window.location.search);
  const term = params.get('q');
  return term ? term.trim() : '';
}

async function fetchJson(path) {
  const url = path.startsWith("http") ? path : `${API}${path}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error('Erro ao buscar:', url, res.status);
    throw new Error('Erro na API');
  }
  return res.json();
}

function formatCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function createLojaCard(loja) {
  const col = document.createElement('div');
  col.className = 'col-12 col-md-6 col-lg-4';

  const a = document.createElement('a');
  a.href = `produtos.html?lojaId=${loja.id}`; 
  a.className = 'card h-100 text-decoration-none text-dark shadow-sm';

  const body = document.createElement('div');
  body.className = 'card-body';

  const img = document.createElement('img');
  img.src =
    loja.imagem_logo ||
    loja.logoUrl ||
    loja.logo ||
    'https://via.placeholder.com/260x120.png?text=Loja';
  img.alt = loja.nome || 'Loja';
  img.className = 'mb-3 rounded';
  img.style.width = '100%';
  img.style.height = '120px';
  img.style.objectFit = 'cover';
  body.appendChild(img);

  const title = document.createElement('h3');
  title.className = 'h6 mb-1';
  title.textContent = loja.nome || 'Loja sem nome';
  body.appendChild(title);

  if (loja.descricao) {
    const p = document.createElement('p');
    p.className = 'text-muted small mb-0';
    p.textContent = loja.descricao;
    body.appendChild(p);
  }

  a.appendChild(body);
  col.appendChild(a);
  return col;
}

function createProdutoCard(produto) {
  const col = document.createElement('div');
  col.className = 'col-6 col-md-4 col-lg-3';

  const a = document.createElement('a');
  a.href = `produto.html?id=${produto.id}`;
  a.className = 'card h-100 text-decoration-none text-dark shadow-sm';

  if (produto.imagemUrl || produto.imagem) {
    const img = document.createElement('img');
    img.src = produto.imagemUrl || produto.imagem;
    img.alt = produto.nome || 'Produto';
    img.className = 'card-img-top';
    img.style.height = '180px';
    img.style.objectFit = 'cover';
    a.appendChild(img);
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.className = 'h6 mb-1';
  title.textContent = produto.nome || 'Produto sem nome';
  body.appendChild(title);

  if (produto.loja && produto.loja.nome) {
    const lojaP = document.createElement('p');
    lojaP.className = 'text-muted small mb-1';
    lojaP.textContent = produto.loja.nome;
    body.appendChild(lojaP);
  }

  if (produto.preco != null) {
    const priceP = document.createElement('p');
    priceP.className = 'fw-bold mb-0';
    priceP.textContent = formatCurrency(produto.preco);
    body.appendChild(priceP);
  }

  a.appendChild(body);
  col.appendChild(a);
  return col;
}

async function carregarResultadosBusca() {
  const term = getSearchTerm();

  const loadingEl = document.getElementById('search-loading');
  const resultsEl = document.getElementById('search-results');
  const emptyEl = document.getElementById('search-empty');
  const noTermEl = document.getElementById('search-no-term');
  const termTextEl = document.getElementById('search-term-text');

  if (!term) {
    if (loadingEl) loadingEl.classList.add('d-none');
    if (noTermEl) noTermEl.classList.remove('d-none');
    return;
  }

  if (termTextEl) {
    termTextEl.textContent = `"${term}"`;
  }

  try {
    const encoded = encodeURIComponent(term);

    const [lojas, produtos] = await Promise.all([
      fetchJson(`/lojas?search=${encoded}`),
      fetchJson(`/produtos?search=${encoded}`),
    ]);

    if (loadingEl) loadingEl.classList.add('d-none');

    const hasLojas = Array.isArray(lojas) && lojas.length > 0;
    const hasProdutos = Array.isArray(produtos) && produtos.length > 0;

    if (!hasLojas && !hasProdutos) {
      if (emptyEl) emptyEl.classList.remove('d-none');
      return;
    }

    if (resultsEl) resultsEl.classList.remove('d-none');

    if (hasLojas) {
      const secLojas = document.getElementById('results-lojas');
      const listLojas = document.getElementById('results-lojas-list');
      if (secLojas && listLojas) {
        secLojas.classList.remove('d-none');
        listLojas.innerHTML = '';
        lojas.forEach((loja) => listLojas.appendChild(createLojaCard(loja)));
      }
    }

    if (hasProdutos) {
      const secProdutos = document.getElementById('results-produtos');
      const listProdutos = document.getElementById('results-produtos-list');
      if (secProdutos && listProdutos) {
        secProdutos.classList.remove('d-none');
        listProdutos.innerHTML = '';
        produtos.forEach((p) =>
          listProdutos.appendChild(createProdutoCard(p))
        );
      }
    }
  } catch (err) {
    console.error('Erro ao carregar resultados da busca:', err);
    if (loadingEl) loadingEl.classList.add('d-none');
    if (emptyEl) emptyEl.classList.remove('d-none');
  }
}

document.addEventListener('DOMContentLoaded', carregarResultadosBusca);
