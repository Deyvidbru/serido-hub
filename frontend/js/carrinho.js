const CART_KEY = "cartItems";

function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function getCartCount() {
  const items = getCart();
  return items.reduce((sum, item) => sum + Number(item?.quantidade || 0), 0);
}

function syncCartBadge() {
  const badge = document.getElementById("cart-count-badge");
  if (!badge) return;
  badge.textContent = String(getCartCount());
}

function addToCart(item) {
  if (!item || item.id == null) return;

  const id = Number(item.id);
  if (Number.isNaN(id)) return;

  const cart = getCart();
  const existing = cart.find((p) => Number(p.id) === id);

  const qtyToAdd =
    item.quantidade && Number(item.quantidade) > 0 ? Number(item.quantidade) : 1;

  if (existing) {
    existing.quantidade = Number(existing.quantidade || 0) + qtyToAdd;
  } else {
    cart.push({
      id,
      nome: item.nome || "Produto",
      preco: Number(item.preco) || 0,
      imagemUrl: item.imagemUrl || null,
      lojaId: item.lojaId != null ? Number(item.lojaId) : null,
      lojaNome: item.lojaNome || "",
      quantidade: qtyToAdd,
    });
  }

  saveCart(cart);
  syncCartBadge();
}

function updateCartItemQuantity(productId, newQty) {
  const id = Number(productId);
  if (Number.isNaN(id)) return;

  const cart = getCart();
  const item = cart.find((p) => Number(p.id) === id);
  if (!item) return;

  const qty = Number(newQty);
  if (Number.isNaN(qty) || qty <= 0) {
    removeFromCart(id);
    return;
  }

  item.quantidade = qty;
  saveCart(cart);
  syncCartBadge();
}

function removeFromCart(productId) {
  const id = Number(productId);
  if (Number.isNaN(id)) return;

  const cart = getCart().filter((p) => Number(p.id) !== id);
  saveCart(cart);
  syncCartBadge();
}

function clearCart() {
  saveCart([]);
  syncCartBadge();
}

document.addEventListener("DOMContentLoaded", () => {
  syncCartBadge();

  renderCart();

  const clearBtn = document.getElementById("cart-clear-btn");
  const checkoutBtn = document.getElementById("cart-checkout-btn");

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearCart();
      renderCart();
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      const items = getCart();

      if (!items.length) {
        alert("Seu carrinho está vazio.");
        return;
      }

      const token =
        localStorage.getItem("token") || localStorage.getItem("authToken");

      if (!token) {
        alert("Você precisa estar logado para finalizar a compra.");
        window.location.href = "login.html";
        return;
      }

      window.location.href = "endereco.html";
    });
  }
});

function renderCart() {
  const items = getCart();
  const emptyDiv = document.getElementById("cart-empty");
  const contentDiv = document.getElementById("cart-content");
  const itemsContainer = document.getElementById("cart-items");
  const subtotalSpan = document.getElementById("cart-subtotal");
  const totalSpan = document.getElementById("cart-total");

  if (!itemsContainer || !subtotalSpan || !totalSpan) return;

  if (!items.length) {
    if (emptyDiv) emptyDiv.classList.remove("d-none");
    if (contentDiv) contentDiv.classList.add("d-none");
    itemsContainer.innerHTML = "";
    subtotalSpan.textContent = "R$ 0,00";
    totalSpan.textContent = "R$ 0,00";
    return;
  }

  if (emptyDiv) emptyDiv.classList.add("d-none");
  if (contentDiv) contentDiv.classList.remove("d-none");

  let subtotal = 0;

  itemsContainer.innerHTML = items
    .map((item) => {
      const preco = Number(item.preco) || 0;
      const qty = Number(item.quantidade) || 0;

      const itemTotal = preco * qty;
      subtotal += itemTotal;

      const precoFormatado = preco.toFixed(2).replace(".", ",");
      const totalFormatado = itemTotal.toFixed(2).replace(".", ",");

      return `
        <div class="d-flex align-items-center gap-3 border-bottom py-3 cart-item" data-id="${item.id}">
          <div class="flex-shrink-0">
            ${
              item.imagemUrl
                ? `<img src="${item.imagemUrl}" alt="${item.nome}" class="rounded" style="width:72px;height:72px;object-fit:cover;">`
                : `
                  <div class="rounded bg-light d-flex align-items-center justify-content-center" style="width:72px;height:72px;">
                    <i class="bi bi-box-seam text-muted"></i>
                  </div>
                `
            }
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between">
              <div>
                <div class="fw-semibold">${item.nome}</div>
                ${
                  item.lojaNome
                    ? `<div class="small text-muted">Vendido por ${item.lojaNome}</div>`
                    : ""
                }
              </div>
              <button type="button" class="btn btn-link btn-sm text-danger p-0 cart-remove-btn" title="Remover">
                <i class="bi bi-trash"></i>
              </button>
            </div>

            <div class="d-flex justify-content-between align-items-center mt-2">
              <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-outline-secondary btn-sm cart-qty-decrease">-</button>
                <input
                  type="number"
                  min="1"
                  value="${qty}"
                  class="form-control form-control-sm cart-qty-input"
                  style="width: 70px;"
                />
                <button type="button" class="btn btn-outline-secondary btn-sm cart-qty-increase">+</button>
              </div>
              <div class="text-end">
                <div class="small text-muted">R$ ${precoFormatado} un.</div>
                <div class="fw-semibold">R$ ${totalFormatado}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const subtotalFormatado = subtotal.toFixed(2).replace(".", ",");
  subtotalSpan.textContent = `R$ ${subtotalFormatado}`;
  totalSpan.textContent = `R$ ${subtotalFormatado}`; 

  itemsContainer.querySelectorAll(".cart-item").forEach((row) => {
    const id = Number(row.getAttribute("data-id"));
    if (Number.isNaN(id)) return;

    const input = row.querySelector(".cart-qty-input");
    const btnDec = row.querySelector(".cart-qty-decrease");
    const btnInc = row.querySelector(".cart-qty-increase");
    const btnRemove = row.querySelector(".cart-remove-btn");

    if (input) {
      input.addEventListener("change", () => {
        const qty = Number(input.value);
        updateCartItemQuantity(id, qty);
        renderCart();
      });
    }

    if (btnDec && input) {
      btnDec.addEventListener("click", () => {
        const qty = Number(input.value) || 1;
        updateCartItemQuantity(id, qty - 1);
        renderCart();
      });
    }

    if (btnInc && input) {
      btnInc.addEventListener("click", () => {
        const qty = Number(input.value) || 1;
        updateCartItemQuantity(id, qty + 1);
        renderCart();
      });
    }

    if (btnRemove) {
      btnRemove.addEventListener("click", () => {
        removeFromCart(id);
        renderCart();
      });
    }
  });
}
