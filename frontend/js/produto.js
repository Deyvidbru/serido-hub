const API_URL = (window.API_BASE_URL || '/api');

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const produtoId = params.get("id") || params.get("produtoId");

  const container = document.getElementById("produto-container");

  if (!produtoId) {
    if (container) {
      container.innerHTML =
        '<p class="text-danger">Produto não informado. Volte para a lista de produtos.</p>';
    }
    return;
  }

  loadProduto(produtoId);
});

async function loadProduto(produtoId) {
  const container = document.getElementById("produto-container");
  if (!container) return;

  container.innerHTML = "<p>Carregando produto...</p>";

  try {
    const resp = await fetch(`${API_URL}/produtos/${produtoId}`);
    const data = await resp.json();

    if (!resp.ok) {
      container.innerHTML = `<p class="text-danger">Erro ao carregar produto: ${
        data?.message || ""
      }</p>`;
      return;
    }

    renderProduto(container, data);
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<p class="text-danger">Erro de conexão ao carregar produto.</p>';
  }
}

function unwrapProduto(apiData) {
  return apiData?.produto ?? apiData?.data ?? apiData?.result ?? apiData;
}

function pickId(p) {
  const raw =
    p?.id ??
    p?.produtoId ??
    p?.idProduto ??
    p?.id_produto ??
    p?.ID ??
    p?.Id;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function unwrapLoja(p) {
  return p?.loja ?? p?.store ?? null;
}

function pickLojaId(loja, p) {
  const raw =
    loja?.id ?? loja?.lojaId ?? loja?.idLoja ?? p?.lojaId ?? p?.idLoja ?? null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function renderProduto(container, apiData) {
  const p = unwrapProduto(apiData);

  const produtoId = pickId(p);
  if (!produtoId) {
    console.error("❌ Produto sem ID reconhecível. Retorno da API:", apiData);
    container.innerHTML =
      '<p class="text-danger">Erro: produto inválido (sem ID). Abra o console (F12).</p>';
    return;
  }

  const precoNumber = Number(p.preco ?? 0);
  const precoFormatado = precoNumber.toFixed(2).replace(".", ",");

  const estoque = Number(p.estoque ?? 0);

  const loja = unwrapLoja(p);
  const lojaId = pickLojaId(loja, p);
  const lojaNome = loja?.nome ?? p?.lojaNome ?? "";

  const lojaLink = lojaId ? `produtos.html?lojaId=${lojaId}` : "lojas.html";

  container.innerHTML = `
    <div class="row g-4">
      <div class="col-12 col-md-5">
        <div class="card shadow-sm">
          ${
            p.imagemUrl
              ? `<img src="${p.imagemUrl}" class="card-img-top" alt="${p.nome}" />`
              : `
                <div class="card-img-top d-flex align-items-center justify-content-center bg-light" style="height: 260px;">
                  <i class="bi bi-box-seam fs-1 text-muted"></i>
                </div>
              `
          }
        </div>
      </div>

      <div class="col-12 col-md-7">
        <nav class="small mb-2">
          <a href="index.html" class="text-decoration-none">Início</a>
          <span class="text-muted"> / </span>
          <a href="lojas.html" class="text-decoration-none">Lojas</a>
          ${
            lojaNome
              ? `
                <span class="text-muted"> / </span>
                <a href="${lojaLink}" class="text-decoration-none">${lojaNome}</a>
              `
              : ""
          }
        </nav>

        <h1 class="h5 mb-2">${p.nome}</h1>
        ${p.descricao ? `<p class="text-muted">${p.descricao}</p>` : ""}

        <div class="d-flex align-items-baseline gap-3 mb-3">
          <span class="fs-4 fw-bold text-primary">R$ ${precoFormatado}</span>
          ${
            estoque > 0
              ? `<span class="badge bg-success-subtle text-success small">Em estoque (${estoque})</span>`
              : `<span class="badge bg-danger-subtle text-danger small">Indisponível</span>`
          }
        </div>

        ${
          lojaNome
            ? `
              <div class="mb-3 small text-muted">
                Vendido por <a href="${lojaLink}" class="text-decoration-none">${lojaNome}</a>
              </div>
            `
            : ""
        }

        <div class="d-flex align-items-center gap-2 mb-3">
          <label for="produto-quantidade" class="small mb-0">Quantidade:</label>
          <input
            id="produto-quantidade"
            type="number"
            min="1"
            value="1"
            class="form-control form-control-sm"
            style="width: 80px;"
          />
        </div>

        <div class="d-flex flex-wrap gap-2">
          <button
            id="add-to-cart-btn"
            type="button"
            class="btn btn-primary rounded-pill px-4"
            ${estoque > 0 ? "" : "disabled"}
          >
            <i class="bi bi-cart-plus me-1"></i>
            Adicionar ao carrinho
          </button>

          <a href="${lojaLink}" class="btn btn-outline-secondary rounded-pill">
            Ver outros produtos da loja
          </a>
        </div>
      </div>
    </div>
  `;

  const addBtn = document.getElementById("add-to-cart-btn");
  const qtyInput = document.getElementById("produto-quantidade");
  if (!addBtn || !qtyInput || estoque <= 0) return;

  addBtn.addEventListener("click", () => {
    if (typeof window.addToCart !== "function") {
      console.error("❌ addToCart não existe. Confira se js/carrinho.js está sendo carregado antes.");
      alert("Erro: carrinho não carregou (veja o console).");
      return;
    }

    const qty = Number(qtyInput.value || "1");
    const quantidade = Number.isNaN(qty) || qty <= 0 ? 1 : qty;

    console.log("✅ addToCart payload:", {
      id: produtoId,
      nome: p.nome,
      preco: p.preco,
      imagemUrl: p.imagemUrl,
      lojaId,
      lojaNome,
      quantidade,
    });

    window.addToCart({
      id: produtoId,
      nome: p.nome,
      preco: p.preco,
      imagemUrl: p.imagemUrl,
      lojaId,
      lojaNome,
      quantidade,
    });

    const saved = localStorage.getItem("cartItems");
    console.log("📦 cartItems after add:", saved);

    alert("Produto adicionado ao carrinho ✅");
  });
}
