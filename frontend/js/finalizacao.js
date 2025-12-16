const LAST_ORDER_KEY = "lastOrder";

document.addEventListener("DOMContentLoaded", () => {
  const raw = localStorage.getItem(LAST_ORDER_KEY);

  if (!raw) {
    alert("Nenhum pedido encontrado.");
    window.location.href = "index.html";
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    alert("Erro ao carregar dados do pedido.");
    window.location.href = "index.html";
    return;
  }

  const pedidos = Array.isArray(data?.pedidos)
    ? data.pedidos
    : Array.isArray(data)
    ? data
    : [];

  if (!pedidos.length) {
    alert("Nenhum pedido gerado.");
    window.location.href = "index.html";
    return;
  }

  renderPedidos(pedidos);

  localStorage.removeItem(LAST_ORDER_KEY);
});

function renderPedidos(pedidos) {
  const container = document.getElementById("orders-container");
  if (!container) return;

  container.innerHTML = "";

  pedidos.forEach((pedido) => {
    const lojaNome = pedido?.loja?.nome || "Loja";
    const status = formatStatus(pedido.status);
    const valor = formatBRL(pedido.valorTotal);
    const pedidoId = pedido.id;

    const card = document.createElement("div");
    card.className = "card order-card mb-3 shadow-sm";

    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="card-title mb-0">${lojaNome}</h5>
          <span class="badge bg-info text-dark">${status}</span>
        </div>

        <div class="mb-2 text-muted">
          Pedido #${pedidoId}
        </div>

        <div class="fw-bold">
          Total: ${valor}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function formatStatus(status) {
  switch (status) {
    case "PENDENTE":
      return "Pendente";
    case "PREPARO":
      return "Em preparo";
    case "A_CAMINHO":
      return "Saiu para entrega";
    case "ENTREGUE":
      return "Entregue";
    case "CANCELADO":
      return "Cancelado";
    default:
      return status || "—";
  }
}

function formatBRL(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
