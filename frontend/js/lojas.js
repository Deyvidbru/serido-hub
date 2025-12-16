const API_URL = (window.API_BASE_URL || '/api');

document.addEventListener('DOMContentLoaded', () => {
  carregarLojas();
});

let lojas = [];

function formatarDataCriacao(dataStr) {
  if (!dataStr) return '';
  const d = new Date(dataStr);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${mes}/${ano}`;
}

function getLogoUrl(loja) {
  const placeholder = 'https://via.placeholder.com/120x120.png?text=Loja';

  const raw =
    loja?.imagem_logo ||
    loja?.imagemLogo ||
    loja?.logo ||
    loja?.logoUrl ||
    loja?.imagem_url ||
    null;

  if (!raw || typeof raw !== 'string') return placeholder;

  const url = raw.trim();
  if (!url) return placeholder;

  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return window.location.protocol + url;

  const normalized = url.startsWith('/') ? url : `/${url}`;
  return `${window.location.origin}${normalized}`;
}

function criarCardLoja(loja) {
  const desde = formatarDataCriacao(loja.data_criacao);
  const linkLoja = `produtos.html?lojaId=${loja.id}`;
  const logoSrc = getLogoUrl(loja);

  return `
    <div class="col-12 col-md-6 col-lg-4">
      <article class="card store-card h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-center mb-2">
            <div class="store-logo-wrapper">
              <img
                src="${logoSrc}"
                alt="Logo da loja ${loja.nome}"
                onerror="this.onerror=null;this.src='https://via.placeholder.com/120x120.png?text=Loja';"
              >
            </div>

            <div class="flex-grow-1">
              <div class="d-flex align-items-center justify-content-between">
                <h3 class="store-name mb-0">${loja.nome}</h3>
              </div>

              <div class="store-meta mt-1">
                <i class="bi bi-geo-alt"></i>
                <span>${loja.endereco || 'Endereço não informado'}</span>
              </div>
            </div>
          </div>

          <p class="store-description mb-3">
            ${loja.descricao || 'Loja cadastrada no SeridóHub.'}
          </p>

          <div class="mt-auto">
            <div class="d-flex flex-wrap justify-content-between store-meta mb-2 gap-2">
              <span>
                <i class="bi bi-telephone"></i>
                ${loja.telefone || 'Telefone não informado'}
              </span>
              <span>
                <i class="bi bi-clock-history"></i>
                Consulte a loja
              </span>
            </div>

            <div class="d-flex justify-content-between align-items-center store-meta mb-3">
              <span class="small">
                <i class="bi bi-calendar-check"></i>
                No SeridóHub desde ${desde || '—'}
              </span>
            </div>

            <a href="${linkLoja}" class="btn btn-primary w-100 btn-view-store">
              Ver loja
            </a>
          </div>
        </div>
      </article>
    </div>
  `;
}

function aplicarFiltros(lojasLista, termoBusca, filtroStatus) {
  return lojasLista.filter((loja) => {
    const texto = (loja.nome + ' ' + (loja.descricao || '')).toLowerCase();
    if (termoBusca && !texto.includes(termoBusca.toLowerCase())) return false;

    if (filtroStatus === 'todos') return true;
    if (filtroStatus === 'aprovado') return loja.status === 'aprovado';
    if (filtroStatus === 'pendente') return loja.status === 'pendente';

    return true;
  });
}

function renderizarLojas(lojasLista) {
  const grid = document.getElementById('storesGrid');
  const empty = document.getElementById('storesEmpty');
  const count = document.getElementById('storesCount');

  if (!grid) return;

  if (!lojasLista.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('d-none');
    if (count) count.textContent = '0 lojas encontradas';
    return;
  }

  if (empty) empty.classList.add('d-none');
  grid.innerHTML = lojasLista.map(criarCardLoja).join('');
  if (count) count.textContent = `${lojasLista.length} loja(s) encontrada(s)`;
}

function atualizarLista() {
  const termoBusca = document.getElementById('searchInput')?.value.trim() || '';
  const filtroStatus = document.getElementById('statusFilter')?.value || 'todos';
  const filtradas = aplicarFiltros(lojas, termoBusca, filtroStatus);
  renderizarLojas(filtradas);
}

async function carregarLojas() {
  const grid = document.getElementById('storesGrid');
  const empty = document.getElementById('storesEmpty');
  const count = document.getElementById('storesCount');

  if (grid) grid.innerHTML = '<p>Carregando lojas...</p>';
  if (empty) empty.classList.add('d-none');
  if (count) count.textContent = '';

  try {
    const resp = await fetch(`${API_URL}/lojas`);
    const data = await resp.json();

    if (!resp.ok) {
      if (grid) {
        grid.innerHTML = `<p class="text-danger">Erro ao carregar lojas: ${data.message || ''}</p>`;
      }
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      lojas = [];
      renderizarLojas(lojas);
      return;
    }

    lojas = data.map((loja) => ({
      ...loja,

      status: loja.status ?? 'aprovado',

      imagem_logo: loja.imagem_logo ?? loja.imagemLogo ?? loja.logoUrl ?? loja.logo ?? null,
      endereco: loja.endereco ?? '',
      telefone: loja.telefone ?? '',
      data_criacao: loja.data_criacao ?? new Date().toISOString(),
    }));

    atualizarLista();
  } catch (err) {
    console.error(err);
    if (grid) {
      grid.innerHTML = '<p class="text-danger">Erro de conexão com o servidor.</p>';
    }
  }

  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const refreshBtn = document.getElementById('refreshBtn');

  if (searchInput) searchInput.addEventListener('input', atualizarLista);
  if (statusFilter) statusFilter.addEventListener('change', atualizarLista);
  if (refreshBtn) refreshBtn.addEventListener('click', carregarLojas);
}
