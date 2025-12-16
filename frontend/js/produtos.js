const API_URL = (window.API_BASE_URL || "/api");

let LOJA_ATUAL = null;
const PRODUTOS_MAP = new Map();

console.log("[produtos.js] carregou ✅");

document.addEventListener("DOMContentLoaded", () => {
  console.log("[produtos.js] DOMContentLoaded ✅");

  const params = new URLSearchParams(window.location.search);
  const lojaId = params.get("lojaId");
  console.log("[produtos.js] lojaId =", lojaId);

  if (!lojaId) {
    const grid = document.getElementById("produtosGrid");
    if (grid) {
      grid.innerHTML =
        '<p class="text-danger">Loja não informada. Volte para a lista de lojas.</p>';
    }
    return;
  }

  loadLojaInfo(lojaId);
  loadProdutos(lojaId);

  document.addEventListener("click", (e) => {
    const buyBtn = e.target.closest("[data-buy-now='1']");
    if (buyBtn) {
      const id = Number(buyBtn.getAttribute("data-buy-id"));
      console.log("[produtos.js] click BUY:", id);

      const produto = PRODUTOS_MAP.get(id);
      if (!produto) return;

      addProdutoAoCarrinho(produto);
      window.location.href = "carrinho.html";
      return;
    }

    const addBtn = e.target.closest("[data-add-to-cart='1']");
    if (addBtn) {
      const id = Number(addBtn.getAttribute("data-add-id"));
      console.log("[produtos.js] click ADD:", id);

      const produto = PRODUTOS_MAP.get(id);
      if (!produto) return;

      addProdutoAoCarrinho(produto);
      toastButton(addBtn, "Adicionado");
      return;
    }
  });
});

function safeText(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s ? s : fallback;
}

function getLogoUrl(loja) {
  const placeholder = "https://via.placeholder.com/120x120.png?text=Loja";

  const raw =
    loja?.imagem_logo ||
    loja?.imagemLogo ||
    loja?.logo ||
    loja?.logoUrl ||
    loja?.imagem_url ||
    null;

  if (!raw || typeof raw !== "string") return placeholder;

  const url = raw.trim();
  if (!url) return placeholder;

  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return window.location.protocol + url;

  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${window.location.origin}${normalized}`;
}

function formatPrecoBR(v) {
  const n = Number(v ?? 0);
  return n.toFixed(2).replace(".", ",");
}

function getProdutoImagem(produto) {
  return (
    produto?.imagemUrl ||
    produto?.imagem_url ||
    produto?.imagemPrincipal ||
    produto?.imagem_principal ||
    null
  );
}

function toastButton(btn, text) {
  if (!btn) return;
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="bi bi-check2"></i> ${text}`;
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = old;
  }, 900);
}

async function loadLojaInfo(lojaId) {
  const hero = document.getElementById("loja-hero");
  if (hero) hero.innerHTML = "<p>Carregando dados da loja...</p>";

  try {
    const resp = await fetch(`${API_URL}/lojas/${lojaId}`);
    const data = await resp.json();

    console.log("[produtos.js] loja data =", data);

    if (!resp.ok) {
      if (hero) hero.innerHTML = `<p class="text-danger">Erro ao carregar loja.</p>`;
      return;
    }

    LOJA_ATUAL = data;

    const logo = getLogoUrl(data);
    const telefone = safeText(data?.telefone, "Telefone não informado");
    const endereco = safeText(data?.endereco, "");

    if (hero) {
      hero.innerHTML = `
        <div class="store-hero-card">
          <img class="store-hero-logo" src="${logo}" alt="Logo"
            onerror="this.onerror=null;this.src='https://via.placeholder.com/120x120.png?text=Loja';" />
          <div class="flex-grow-1">
            <h1 class="store-hero-title">${safeText(data?.nome, "Loja")}</h1>
            <p class="store-hero-desc">${safeText(data?.descricao, "Loja parceira do SeridóHub.")}</p>
            <div class="store-hero-meta">
              <span><i class="bi bi-telephone"></i>${telefone}</span>
              <span><i class="bi bi-clock"></i>Consulte a loja</span>
              ${endereco ? `<span><i class="bi bi-geo-alt"></i>${endereco}</span>` : ""}
            </div>
            <div class="mt-3 d-flex gap-2 flex-wrap">
              <a href="lojas.html" class="btn btn-outline-dark btn-sm rounded-pill">
                <i class="bi bi-arrow-left"></i> Voltar
              </a>
            </div>
          </div>
          <div class="store-hero-actions d-none d-md-flex">
            <span class="store-pill"><i class="bi bi-shield-check"></i> Loja verificada</span>
          </div>
        </div>
      `;
    }
  } catch (e) {
    console.error(e);
    if (hero) hero.innerHTML = `<p class="text-danger">Erro de conexão ao carregar loja.</p>`;
  }
}

async function loadProdutos(lojaId) {
  const grid = document.getElementById("produtosGrid");
  const count = document.getElementById("produtosCount");
  const empty = document.getElementById("produtosEmpty");

  if (!grid) return;

  grid.innerHTML = "<p>Carregando produtos...</p>";

  try {
    const resp = await fetch(`${API_URL}/lojas/${lojaId}/produtos`);
    const data = await resp.json();

    console.log("[produtos.js] produtos data =", data);

    if (!resp.ok) {
      grid.innerHTML = `<p class="text-danger">Erro ao carregar produtos.</p>`;
      return;
    }

    if (!Array.isArray(data) || !data.length) {
      grid.innerHTML = "";
      if (empty) empty.classList.remove("d-none");
      if (count) count.textContent = "0 produto(s)";
      return;
    }

    if (empty) empty.classList.add("d-none");
    if (count) count.textContent = `${data.length} produto(s)`;

    PRODUTOS_MAP.clear();
    data.forEach((p) => PRODUTOS_MAP.set(Number(p.id), p));

    grid.innerHTML = data.map(criarCardProduto).join("");
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<p class="text-danger">Erro de conexão ao carregar produtos.</p>`;
  }
}

function criarCardProduto(produto) {
  const nome = safeText(produto?.nome, "Produto");
  const desc = safeText(produto?.descricao, "Sem descrição.");
  const img = getProdutoImagem(produto);
  const preco = produto?.preco ?? 0;

  return `
    <div class="col-12 col-sm-6 col-md-4 col-lg-3">
      <article class="product-card h-100">
        ${
          img
            ? `<img src="${img}" class="product-image" alt="${nome}">`
            : `<div class="product-image-placeholder"><i class="bi bi-box-seam fs-1"></i></div>`
        }

        <div class="p-3 d-flex flex-column h-100">
          <h3 class="product-title text-truncate">${nome}</h3>
          <p class="product-desc line-clamp-2">${desc}</p>

          <div class="mt-auto d-grid gap-2">
            <div class="d-flex align-items-center justify-content-between">
              <span class="product-price">R$ ${formatPrecoBR(preco)}</span>
              <a href="produto.html?produtoId=${produto.id}" class="btn btn-outline-primary btn-sm rounded-pill">
                Ver
              </a>
            </div>

            <button type="button"
              class="btn btn-primary btn-sm rounded-pill"
              data-add-to-cart="1"
              data-add-id="${produto.id}">
              <i class="bi bi-cart-plus"></i> Adicionar ao carrinho
            </button>

            <button type="button"
              class="btn btn-outline-dark btn-sm rounded-pill"
              data-buy-now="1"
              data-buy-id="${produto.id}">
              <i class="bi bi-lightning-charge"></i> Comprar agora
            </button>
          </div>
        </div>
      </article>
    </div>
  `;
}

function addProdutoAoCarrinho(produto) {
  const item = {
    id: produto.id,
    nome: safeText(produto?.nome, "Produto"),
    preco: Number(produto?.preco ?? 0) || 0,
    imagemUrl: getProdutoImagem(produto) || null,
    lojaId: LOJA_ATUAL?.id != null ? Number(LOJA_ATUAL.id) : null,
    lojaNome: safeText(LOJA_ATUAL?.nome, ""),
    quantidade: 1,
  };

  console.log("[produtos.js] item para carrinho =", item);
  console.log("[produtos.js] typeof addToCart =", typeof window.addToCart);

  if (typeof window.addToCart === "function") {
    window.addToCart(item);
  } else if (typeof addToCart === "function") {
    addToCart(item);
  } else {
    console.error("[produtos.js] addToCart NÃO existe. carrinho.js não carregou?");
  }
}

(function ensureFooterSpace() {
  const root = document.documentElement;

  function setFooterHeight() {
    const host = document.getElementById("site-footer");
    if (!host) return;

    const footerEl = host.querySelector("footer") || host.firstElementChild || host;

    const h = footerEl?.offsetHeight || 0;
    if (h > 0) {
      root.style.setProperty("--footer-h", `${h}px`);
    }
  }

  setFooterHeight();
  window.addEventListener("load", setFooterHeight);
  window.addEventListener("resize", setFooterHeight);

  const host = document.getElementById("site-footer");
  if (host) {
    const obs = new MutationObserver(() => setFooterHeight());
    obs.observe(host, { childList: true, subtree: true });
  }
})();
