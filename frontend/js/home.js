const API = window.API_BASE_URL;

const LOJAS_ENDPOINT = `${API}/lojas`;
const PRODUTOS_ENDPOINT = `${API}/produtos`;

let catalogoInicializado = false;
let vendedorDashboardInicializado = false;

document.addEventListener("DOMContentLoaded", () => {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

  const badgeTipo = document.getElementById("badge-tipo-usuario");
  const spanNome = document.querySelector(".usuario-nome");
  const heroSubtitle = document.getElementById("hero-subtitle");

  const btnLogin = document.getElementById("btn-login");
  const btnCadastro = document.getElementById("btn-cadastro");
  const btnLogout = document.getElementById("btn-logout");

  const secCatalogo = document.getElementById("catalogo-home");
  const secVendedor = document.getElementById("vendedor-home");

  if (btnLogin) {
    btnLogin.addEventListener("click", () => (window.location.href = "login.html"));
  }

  if (btnCadastro) {
    btnCadastro.addEventListener("click", () => (window.location.href = "cadastro.html"));
  }

  if (btnLogout && typeof logout === "function") {
    btnLogout.addEventListener("click", () => logout());
  }

  if (!user) {
    if (badgeTipo) {
      badgeTipo.textContent = "Visitante";
      badgeTipo.classList.remove("bg-success", "bg-primary", "bg-danger");
      badgeTipo.classList.add("bg-dark");
    }

    if (spanNome) spanNome.textContent = "visitante";

    if (heroSubtitle) {
      heroSubtitle.textContent =
        "Explore as lojas e descubra o SeridóHub. Faça login ou crie uma conta para aproveitar tudo.";
    }

    if (btnLogin) btnLogin.classList.remove("d-none");
    if (btnCadastro) btnCadastro.classList.remove("d-none");
    if (btnLogout) btnLogout.classList.add("d-none");

    if (secVendedor) secVendedor.classList.add("d-none");
    if (secCatalogo) secCatalogo.classList.remove("d-none");

    mostrarBannerPrincipal();
    inicializarCatalogo();
    return;
  }

  const nome = user.nome || "usuário";
  const tipo = (user.tipo || "CLIENTE").toUpperCase();

  if (spanNome) spanNome.textContent = nome;

  if (badgeTipo) {
    badgeTipo.textContent =
      tipo === "VENDEDOR" ? "Vendedor" : tipo === "ADMIN" ? "Administrador" : "Cliente";

    badgeTipo.classList.remove("bg-dark", "bg-danger", "bg-primary", "bg-success");

    if (tipo === "VENDEDOR") badgeTipo.classList.add("bg-primary");
    else if (tipo === "ADMIN") badgeTipo.classList.add("bg-danger");
    else badgeTipo.classList.add("bg-success");
  }

  if (heroSubtitle) {
    heroSubtitle.textContent =
      tipo === "VENDEDOR"
        ? "Gerencie sua loja, acompanhe pedidos e atualize seus produtos no SeridóHub."
        : "Veja as lojas disponíveis e encontre produtos para comprar no SeridóHub.";
  }

  if (btnLogin) btnLogin.classList.add("d-none");
  if (btnCadastro) btnCadastro.classList.add("d-none");
  if (btnLogout) btnLogout.classList.remove("d-none");

  if (tipo === "VENDEDOR") {
    if (secCatalogo) secCatalogo.classList.add("d-none");
    if (secVendedor) secVendedor.classList.remove("d-none");

    ocultarBannerParaVendedor();
    inicializarDashboardVendedor();
  } else {
    if (secVendedor) secVendedor.classList.add("d-none");
    if (secCatalogo) secCatalogo.classList.remove("d-none");

    mostrarBannerPrincipal();
    inicializarCatalogo();
  }
});

function inicializarCatalogo() {
  if (catalogoInicializado) return;
  catalogoInicializado = true;

  carregarLojasCatalogo();
  carregarProdutosCatalogo();
}

function getAuthHeaders() {
  const token =
    (typeof getToken === "function" && getToken()) ||
    localStorage.getItem("token") ||
    null;

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitials(nome) {
  const n = String(nome || "").trim();
  return n ? n.charAt(0).toUpperCase() : "S";
}

async function carregarLojasCatalogo() {
  const loadingEl = document.getElementById("lojas-loading");
  const emptyEl = document.getElementById("lojas-empty");
  const errorEl = document.getElementById("lojas-error");
  const gridEl = document.getElementById("lojas-grid");

  if (!gridEl) return;

  if (loadingEl) loadingEl.classList.remove("d-none");
  if (emptyEl) emptyEl.classList.add("d-none");
  if (errorEl) errorEl.classList.add("d-none");
  gridEl.innerHTML = "";

  try {
    const res = await fetch(LOJAS_ENDPOINT, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Falha ao buscar lojas");

    const lojas = await res.json();

    if (!lojas || lojas.length === 0) {
      if (loadingEl) loadingEl.classList.add("d-none");
      if (emptyEl) emptyEl.classList.remove("d-none");
      return;
    }

    gridEl.innerHTML = lojas
      .map((loja) => {
        const id = loja.id;
        const nome = loja.nome || "Loja";
        const descricao = loja.descricao || "Loja parceira do SeridóHub.";
        const imagem = loja.imagemLogo || loja.imagem_logo || null;

        const nomeSafe = escapeHtml(nome);
        const descSafe = escapeHtml(descricao);

        return `
          <div class="col-6 col-md-4 col-lg-3">
            <div class="card h-100 product-card">
              <div class="ratio ratio-4x3 product-thumb">
                ${
                  imagem
                    ? `<img src="${escapeHtml(imagem)}" alt="${nomeSafe}" class="img-fluid rounded-top object-fit-cover" />`
                    : `<div class="d-flex align-items-center justify-content-center w-100 h-100 bg-light rounded-top">
                         <div class="text-center">
                           <div class="fw-bold fs-1 text-muted">${getInitials(nome)}</div>
                           <div class="small text-muted"><i class="bi bi-shop me-1"></i>Loja</div>
                         </div>
                       </div>`
                }
              </div>

              <div class="card-body d-flex flex-column">
                <h3 class="h6 mb-1 text-truncate" title="${nomeSafe}">
                  <i class="bi bi-shop me-1"></i>${nomeSafe}
                </h3>

                <p class="small text-muted mb-2 text-truncate" title="${descSafe}">
                  ${descSafe}
                </p>

                <div class="mt-auto">
                  ${
                    id
                      ? `<a href="produtos.html?lojaId=${encodeURIComponent(id)}" class="btn btn-outline-primary btn-sm rounded-pill w-100">
                           Ver loja
                         </a>`
                      : ""
                  }
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    if (loadingEl) loadingEl.classList.add("d-none");
  } catch (err) {
    console.error("Erro ao carregar lojas:", err);
    if (loadingEl) loadingEl.classList.add("d-none");
    if (errorEl) errorEl.classList.remove("d-none");
  }
}

async function carregarProdutosCatalogo() {
  const loadingEl = document.getElementById("produtos-loading");
  const emptyEl = document.getElementById("produtos-empty");
  const errorEl = document.getElementById("produtos-error");
  const gridEl = document.getElementById("produtos-grid");

  if (!gridEl) return;

  if (loadingEl) loadingEl.classList.remove("d-none");
  if (emptyEl) emptyEl.classList.add("d-none");
  if (errorEl) errorEl.classList.add("d-none");
  gridEl.innerHTML = "";

  try {
    const res = await fetch(PRODUTOS_ENDPOINT, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Falha ao buscar produtos");

    const produtos = await res.json();

    if (!produtos || produtos.length === 0) {
      if (loadingEl) loadingEl.classList.add("d-none");
      if (emptyEl) emptyEl.classList.remove("d-none");
      return;
    }

    gridEl.innerHTML = produtos
      .map((produto) => {
        const id = produto.id;
        const nome = produto.nome || "Produto";
        const descricao = produto.descricao || "";
        const preco = formatarPreco(produto.preco);
        const imagem =
          produto.imagemUrl || produto.imagem_principal || "assets/placeholder-product.png";

        const nomeSafe = escapeHtml(nome);
        const descSafe = escapeHtml(descricao);
        const imgSafe = escapeHtml(imagem);

        return `
          <div class="col-6 col-md-4 col-lg-3">
            <div class="card h-100 product-card position-relative">
              <div class="ratio ratio-4x3 product-thumb">
                <img
                  src="${imgSafe}"
                  alt="${nomeSafe}"
                  class="img-fluid rounded-top object-fit-cover"
                />
              </div>

              <div class="card-body d-flex flex-column">
                <h3 class="h6 mb-1 text-truncate" title="${nomeSafe}">
                  <i class="bi bi-bag me-1"></i>${nomeSafe}
                </h3>

                ${
                  descSafe
                    ? `<p class="small text-muted mb-2 text-truncate" title="${descSafe}">
                         ${descSafe}
                       </p>`
                    : ""
                }

                <div class="mt-auto">
                  <div class="fw-bold mb-2">${preco}</div>
                  ${
                    id
                      ? `<a href="produto.html?id=${id}" class="btn btn-outline-primary btn-sm rounded-pill w-100">
                           Ver produto
                         </a>`
                      : ""
                  }
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    if (loadingEl) loadingEl.classList.add("d-none");
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
    if (loadingEl) loadingEl.classList.add("d-none");
    if (errorEl) errorEl.classList.remove("d-none");
  }
}

function ocultarBannerParaVendedor() {
  const promoBanner = document.getElementById("promo-banner");
  if (promoBanner) promoBanner.classList.add("d-none");
}

function mostrarBannerPrincipal() {
  const promoBanner = document.getElementById("promo-banner");
  if (promoBanner) promoBanner.classList.remove("d-none");
}

async function inicializarDashboardVendedor() {
  if (vendedorDashboardInicializado) return;
  vendedorDashboardInicializado = true;

  const blocoSemLoja = document.getElementById("vendedor-sem-loja");
  const blocoComLoja = document.getElementById("vendedor-com-loja");

  if (!blocoSemLoja || !blocoComLoja) {
    console.warn("Blocos do dashboard do vendedor não encontrados.");
    return;
  }

  const possuiLoja = await vendedorPossuiAlgumaLoja();

  if (possuiLoja) {
    blocoSemLoja.classList.add("d-none");
    blocoComLoja.classList.remove("d-none");
  } else {
    blocoSemLoja.classList.remove("d-none");
    blocoComLoja.classList.add("d-none");
  }

  configurarAtalhosDashboard();
}

async function vendedorPossuiAlgumaLoja() {
  try {
    const res = await fetch(`${LOJAS_ENDPOINT}/minhas`, { headers: getAuthHeaders() });

    if (res.status === 404 || res.status === 204) return false;
    if (!res.ok) throw new Error("Falha ao buscar lojas do vendedor");

    const data = await res.json();

    if (Array.isArray(data)) return data.length > 0;
    if (data && typeof data === "object") return true;

    return false;
  } catch (err) {
    console.warn("Não foi possível verificar lojas do vendedor:", err);
    return false;
  }
}

function configurarAtalhosDashboard() {
  const btnCadastroLoja = document.getElementById("btn-dashboard-cadastrar-loja");
  const btnMinhasLojas = document.getElementById("btn-dashboard-minhas-lojas");
  const btnProdutosUnificado = document.getElementById("btn-dashboard-produtos-unificado");
  const btnPedidos = document.getElementById("btn-dashboard-pedidos");

  if (btnCadastroLoja) {
    btnCadastroLoja.addEventListener("click", () => (window.location.href = "minha_loja.html"));
  }

  if (btnMinhasLojas) {
    btnMinhasLojas.addEventListener("click", () => (window.location.href = "minha_loja.html"));
  }

  if (btnProdutosUnificado) {
    btnProdutosUnificado.addEventListener("click", () => (window.location.href = "meus_produtos.html"));
  }

  if (btnPedidos) {
    btnPedidos.addEventListener("click", () => (window.location.href = "meus_pedidos.html"));
  }
}

function formatarPreco(valor) {
  if (typeof valor === "number") {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  const num = Number(valor);
  if (Number.isNaN(num)) return "R$ --";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
