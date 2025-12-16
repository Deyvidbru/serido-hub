const API_URL = (window.API_BASE_URL || '/api');

const SELECTED_ADDRESS_KEY = "selectedAddress";
const PAYMENT_SELECTION_KEY = "selectedPayment";
const LAST_ORDER_KEY = "lastOrder";

document.addEventListener("DOMContentLoaded", () => {
  const address = loadSelectedAddress();
  const cartItems = getCart();

  if (!cartItems.length) {
    alert("Seu carrinho está vazio. Adicione itens antes de pagar.");
    window.location.href = "carrinho.html";
    return;
  }

  if (!address) {
    alert("Selecione um endereço antes de escolher o pagamento.");
    window.location.href = "endereco.html";
    return;
  }

  renderAddress(address);
  renderTotals(cartItems);
  setupPaymentForm();
  setupContinueButton();
});

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function getStoredUser() {
  const raw =
    localStorage.getItem("user") || localStorage.getItem("currentUser");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadSelectedAddress() {
  const raw = localStorage.getItem(SELECTED_ADDRESS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getCart() {
  const possibleKeys = [
    "carrinho",
    "cart",
    "cartItems",
    "shoppingCart",
    "itensCarrinho",
  ];

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.itens)) return parsed.itens;
      if (parsed && Array.isArray(parsed.items)) return parsed.items;
    } catch {}
  }

  return [];
}

function clearCart() {
  const possibleKeys = [
    "carrinho",
    "cart",
    "cartItems",
    "shoppingCart",
    "itensCarrinho",
  ];
  possibleKeys.forEach((k) => localStorage.removeItem(k));
}

function formatBRL(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcSubtotal(cartItems) {
  let subtotal = 0;
  (cartItems || []).forEach((item) => {
    const qtd = Number(item.quantidade ?? item.qtd ?? item.qty ?? 0) || 0;
    const preco =
      Number(item.preco ?? item.precoUnitario ?? item.price) ||
      Number(item?.produto?.preco ?? item?.product?.preco) ||
      0;

    subtotal += preco * qtd;
  });
  return subtotal;
}

function showError(msg) {
  const errorBox = document.getElementById("payment-error");
  if (errorBox) errorBox.textContent = msg || "";
}

function setLoading(isLoading) {
  const btn = document.getElementById("payment-continue-btn");
  if (!btn) return;

  btn.disabled = isLoading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;

  btn.textContent = isLoading
    ? "Finalizando pagamento Pix..."
    : btn.dataset.originalText || "Confirmar pagamento e finalizar";
}

function renderAddress(address) {
  const container = document.getElementById("payment-address");
  if (!container) return;

  const linha1 = [address.logradouro, address.numero, address.bairro]
    .filter(Boolean)
    .join(", ");

  const linha2 = [address.cidade, address.uf || address.estado, address.cep]
    .filter(Boolean)
    .join(" - ");

  container.innerHTML = `
    <div class="small">
      <div><strong>${address.apelido || "Endereço"}</strong></div>
      <div>${address.destinatario || ""}</div>
      <div>${linha1}</div>
      <div class="text-muted">${linha2}</div>
      ${
        address.complemento
          ? `<div class="text-muted">${address.complemento}</div>`
          : ""
      }
    </div>
  `;
}

function renderTotals(cartItems) {
  const subtotalSpan = document.getElementById("payment-subtotal");
  const totalSpan = document.getElementById("payment-total");

  const subtotal = calcSubtotal(cartItems);

  if (subtotalSpan) subtotalSpan.textContent = formatBRL(subtotal);
  if (totalSpan) totalSpan.textContent = formatBRL(subtotal);
}

function setupPaymentForm() {
  const form = document.getElementById("payment-form");
  if (!form) return;

  const pixRadio = form.querySelector(
    'input[name="paymentMethod"][value="PIX"]'
  );
  if (pixRadio) pixRadio.checked = true;

  localStorage.setItem(
    PAYMENT_SELECTION_KEY,
    JSON.stringify({ metodo: "PIX" })
  );
}

function buildCheckoutPayload({ cartItems, address }) {
  const itens = (cartItems || [])
    .map((item) => {
      const produtoId =
        Number(item.produtoId ?? item.idProduto ?? item.productId ?? item.id) ||
        Number(item?.produto?.id ?? item?.product?.id) ||
        null;

      const quantidade =
        Number(item.quantidade ?? item.qtd ?? item.qty ?? 0) || 0;

      return { produtoId, quantidade };
    })
    .filter((x) => x.produtoId && x.quantidade > 0);

  return {
    enderecoId: Number(address.id),
    itens,
  };
}

async function finalizarCheckoutPix(payload) {
  const token = getAuthToken();
  if (!token) throw new Error("Você precisa estar logado.");

  const res = await fetch(`${API_URL}/checkout/pix`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const msg =
      data?.message ||
      `Erro ao finalizar pagamento Pix (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return data;
}

function setupContinueButton() {
  const btn = document.getElementById("payment-continue-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    showError("");

    const user = getStoredUser();
    const token = getAuthToken();
    if (!user || !token) {
      alert("Você precisa estar logado para finalizar.");
      window.location.href = "login.html";
      return;
    }

    const address = loadSelectedAddress();
    const cartItems = getCart();

    if (!cartItems.length) {
      showError("Seu carrinho está vazio.");
      return;
    }

    if (!address?.id) {
      showError("Endereço inválido.");
      return;
    }

    const payload = buildCheckoutPayload({ cartItems, address });

    if (!payload.itens.length) {
      showError("Itens inválidos no carrinho.");
      return;
    }

    setLoading(true);

    try {
      const result = await finalizarCheckoutPix(payload);

      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(result));

      clearCart();

      window.location.href = "finalizacao.html";
    } catch (err) {
      console.error(err);
      showError(err?.message || "Erro inesperado ao finalizar.");
    } finally {
      setLoading(false);
    }
  });
}
