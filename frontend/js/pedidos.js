const API_BASE = window.API_BASE_URL || "/api";

let usuario = null;
let modo = 'CLIENTE'; 
let todosPedidos = [];
let pedidosFiltrados = [];
let pedidoAtual = null;

document.addEventListener('DOMContentLoaded', () => {
  usuario = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  if (!usuario || !usuario.id) {
    alert('Você precisa estar logado para ver seus pedidos.');
    window.location.href = 'login.html';
    return;
  }

  modo = usuario.tipo === 'VENDEDOR' ? 'VENDEDOR' : 'CLIENTE';

  ajustarLayoutPorModo();
  configurarFiltros();
  carregarPedidos();
});

function ajustarLayoutPorModo() {
  const title = document.getElementById('pedidos-title');
  const subtitle = document.getElementById('pedidos-subtitle');
  const badgeVendedor = document.getElementById('badge-vendedor');

  if (modo === 'VENDEDOR') {
    title.textContent = 'Pedidos recebidos';
    subtitle.textContent = 'Gerencie os pedidos feitos na sua loja.';
    badgeVendedor.classList.remove('d-none');
  } else {
    title.textContent = 'Meus pedidos';
    subtitle.textContent = 'Acompanhe o status dos seus pedidos.';
    badgeVendedor.classList.add('d-none');
  }
}

function authHeaders() {
  const token =
    (typeof getToken === 'function' && getToken()) ||
    localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function carregarPedidos() {
  setEstado('loading');

  const endpoint =
    modo === 'VENDEDOR'
      ? `${API_BASE}/pedidos/minha-loja`
      : `${API_BASE}/pedidos/meus`;

  try {
    const res = await fetch(endpoint, { headers: authHeaders() });

    if (res.status === 204) {
      todosPedidos = [];
      pedidosFiltrados = [];
      setEstado('empty');
      return;
    }

    if (!res.ok) throw new Error('Erro ao buscar pedidos');

    todosPedidos = await res.json();
    pedidosFiltrados = [...todosPedidos];

    aplicarFiltros();
  } catch (err) {
    console.error(err);
    setEstado('error');
  }
}

function setEstado(state) {
  const loading = document.getElementById('pedidos-loading');
  const empty = document.getElementById('pedidos-empty');
  const error = document.getElementById('pedidos-error');
  const list = document.getElementById('pedidos-list');

  loading?.classList.add('d-none');
  empty?.classList.add('d-none');
  error?.classList.add('d-none');
  list?.classList.add('d-none');

  if (state === 'loading') loading?.classList.remove('d-none');
  if (state === 'empty') empty?.classList.remove('d-none');
  if (state === 'error') error?.classList.remove('d-none');
  if (state === 'list') list?.classList.remove('d-none');
}

function configurarFiltros() {
  document.getElementById('filtro-busca')?.addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-status')?.addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-ordenacao')?.addEventListener('change', aplicarFiltros);

  document.getElementById('btn-limpar-filtros')?.addEventListener('click', () => {
    const busca = document.getElementById('filtro-busca');
    const status = document.getElementById('filtro-status');
    const ord = document.getElementById('filtro-ordenacao');
    if (busca) busca.value = '';
    if (status) status.value = '';
    if (ord) ord.value = 'mais-recentes';
    aplicarFiltros();
  });
}

function aplicarFiltros() {
  const termo = (document.getElementById('filtro-busca')?.value || '').toLowerCase();
  const status = document.getElementById('filtro-status')?.value || '';
  const ordenacao = document.getElementById('filtro-ordenacao')?.value || 'mais-recentes';

  let lista = [...todosPedidos];

  if (termo) {
    lista = lista.filter((p) => {
      const texto = `${p.id} ${p.loja?.nome || ''} ${p.cliente?.nome || ''}`.toLowerCase();
      return texto.includes(termo);
    });
  }

  if (status) {
    lista = lista.filter((p) => String(p.status) === String(status));
  }

  lista.sort((a, b) => {
    const va = Number(a.valorTotal ?? 0) || 0;
    const vb = Number(b.valorTotal ?? 0) || 0;

    if (ordenacao === 'maior-valor') return vb - va;
    if (ordenacao === 'menor-valor') return va - vb;

    const da = new Date(a.dataCriacao || a.createdAt || Date.now());
    const db = new Date(b.dataCriacao || b.createdAt || Date.now());
    if (ordenacao === 'mais-antigos') return da - db;
    return db - da;
  });

  pedidosFiltrados = lista;

  if (!lista.length) setEstado('empty');
  else {
    renderLista();
    setEstado('list');
  }
}

function renderLista() {
  const list = document.getElementById('pedidos-list');
  if (!list) return;

  list.innerHTML = '';

  pedidosFiltrados.forEach((pedido) => {
    const vis = getStatusVisual(pedido.status);

    const card = document.createElement('div');
    card.className = 'card pedido-card shadow-sm mb-3';

    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>Pedido #${pedido.id}</strong>
          <span class="badge fs-6 ${vis.classe}">
            ${vis.label}
          </span>
        </div>

        <div class="text-muted small mb-2">
          ${pedido.loja?.nome || ''}
        </div>

        <div class="fw-bold fs-5 mb-3">
          ${formatBRL(pedido.valorTotal)}
        </div>

        <button class="btn btn-outline-primary btn-sm">
          Ver detalhes
        </button>
      </div>
    `;

    card.querySelector('button').onclick = () => abrirModal(pedido.id);
    list.appendChild(card);
  });
}

async function abrirModal(pedidoId) {
  try {
    const res = await fetch(`${API_BASE}/pedidos/${pedidoId}`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error('Erro ao buscar pedido');

    pedidoAtual = await res.json();
    preencherModal(pedidoAtual);

    new bootstrap.Modal(document.getElementById('modal-pedido')).show();
  } catch (err) {
    console.error(err);
    alert('Erro ao abrir pedido.');
  }
}

function preencherModal(p) {
  document.getElementById('modal-pedido-codigo').textContent = `#${p.id}`;
  document.getElementById('modal-loja-nome').textContent = p.loja?.nome || '—';
  document.getElementById('modal-endereco-entrega').textContent = p.enderecoEntrega || '—';
  document.getElementById('modal-pagamento-total').textContent = formatBRL(p.valorTotal);

  const formaRaw = p.formaPagamento || p.forma_pagamento || 'PIX';
  document.getElementById('modal-pagamento-forma').textContent = formatFormaPagamento(formaRaw);

  const statusPagamento =
    p.pagamento?.status ||
    (String(formaRaw).toUpperCase().includes('PIX') ? 'PAGO (simulado)' : '—');

  document.getElementById('modal-pagamento-status').textContent = statusPagamento;

  const clienteBox = document.getElementById('modal-cliente-box');
  if (modo === 'VENDEDOR') {
    clienteBox?.classList.remove('d-none');
    document.getElementById('modal-cliente-nome').textContent = p.cliente?.nome || '—';
    document.getElementById('modal-cliente-contato').textContent =
      p.cliente?.telefone || p.cliente?.email || '—';
  } else {
    clienteBox?.classList.add('d-none');
  }

  const ul = document.getElementById('modal-itens-lista');
  if (ul) {
    const itens = getItensDoPedido(p);

    if (!itens.length) {
      ul.innerHTML = `<li class="text-muted">Nenhum item encontrado neste pedido.</li>`;
      console.warn('Pedido sem itens no JSON:', p);
    } else {
      ul.innerHTML = itens
        .map((i) => {
          const nome = i?.produto?.nome || i?.nome || i?.nomeProduto || 'Produto';
          const qtd = Number(i?.quantidade ?? i?.qtd ?? 0) || 0;
          const subtotal = Number(i?.subtotal ?? 0) || 0;
          return `
            <li class="d-flex justify-content-between">
              <span>${qtd}x ${escapeHtml(nome)}</span>
              <span>${formatBRL(subtotal)}</span>
            </li>
          `;
        })
        .join('');
    }
  }

  const vis = getStatusVisual(p.status);
  document.getElementById('modal-status-atual').innerHTML = `
    <span class="badge fs-6 ${vis.classe}">${vis.label}</span>
  `;

  const btnCancelar = document.getElementById('btn-cancelar-pedido');
  const entregue = String(p.status).toUpperCase() === 'ENTREGUE';

  if (btnCancelar) {
    btnCancelar.disabled = entregue;
    btnCancelar.title = entregue ? 'Pedidos entregues não podem ser cancelados.' : '';
    btnCancelar.onclick = entregue ? null : cancelarPedido;
  }

  document.getElementById('modal-status-editor')?.classList.toggle('d-none', modo !== 'VENDEDOR');
  document.getElementById('modal-status-readonly')?.classList.toggle('d-none', modo === 'VENDEDOR');

  const selectStatus = document.getElementById('modal-status-select');
  if (selectStatus) selectStatus.value = p.status;

  document.getElementById('btn-salvar-status').onclick = salvarStatus;
}

async function salvarStatus() {
  const status = document.getElementById('modal-status-select')?.value;
  if (!status) return;

  await fetch(`${API_BASE}/pedidos/${pedidoAtual.id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });

  await carregarPedidos();
}

async function cancelarPedido() {
  if (!confirm('Deseja realmente cancelar este pedido?')) return;

  await fetch(`${API_BASE}/pedidos/${pedidoAtual.id}/cancelar`, {
    method: 'PATCH',
    headers: authHeaders(),
  });

  await carregarPedidos();
}

function formatBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatFormaPagamento(forma) {
  const f = String(forma || '').toUpperCase();
  if (f.includes('PIX')) return 'Pix';
  if (f.includes('CART')) return 'Cartão';
  if (f.includes('DINHEIRO')) return 'Dinheiro';
  return forma || '—';
}

function getStatusVisual(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PENDENTE':
      return { label: 'Pendente', classe: 'bg-warning text-dark' };
    case 'PREPARO':
      return { label: 'Em preparo', classe: 'bg-info text-dark' };
    case 'A_CAMINHO':
      return { label: 'Saiu para entrega', classe: 'bg-primary' };
    case 'ENTREGUE':
      return { label: 'Entregue', classe: 'bg-success' };
    case 'CANCELADO':
      return { label: 'Cancelado', classe: 'bg-danger' };
    default:
      return { label: status || '—', classe: 'bg-secondary' };
  }
}

function getItensDoPedido(p) {
  if (Array.isArray(p.itens)) return p.itens;
  if (Array.isArray(p.itensPedido)) return p.itensPedido;
  if (Array.isArray(p.itens_pedido)) return p.itens_pedido;
  if (p?.data?.itens && Array.isArray(p.data.itens)) return p.data.itens;

  return [];
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
