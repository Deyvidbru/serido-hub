const PARTIALS_BASE = "partials/";

document.addEventListener("DOMContentLoaded", () => {
  loadLayout();
});

function fetchWithTimeout(url, ms = 6000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);

  return fetch(url, {
    cache: "no-store",
    signal: controller.signal,
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  })
    .finally(() => clearTimeout(t));
}

async function readResponseSafe(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function loadLayout() {
  const headerContainer = document.getElementById("site-header");
  const footerContainer = document.getElementById("site-footer");

  if (headerContainer) {
    const page = (window.location.pathname.split("/").pop() || "").toLowerCase();

    const publicPages = [
      "login.html",
      "cadastro.html",
      "register.html",
      "signin.html",
      "signup.html",
      "index_public.html",
    ];

    const headerFile = publicPages.includes(page)
      ? `${PARTIALS_BASE}header_public.html`
      : `${PARTIALS_BASE}header_app.html`;

    try {
      headerContainer.innerHTML = "";

      const res = await fetchWithTimeout(headerFile, 6000);

      if (!res.ok) {
        const body = await readResponseSafe(res);
        throw new Error(
          `Falha ao carregar HEADER (${res.status}) em ${headerFile}. ` +
          `Primeiros chars: ${body.slice(0, 120)}`
        );
      }

      const html = await res.text();

      if (!html || html.trim().length < 10) {
        throw new Error(`HEADER vazio ou inválido vindo de ${headerFile}`);
      }

      headerContainer.innerHTML = html;

      try {
        applyAuthToHeader();
      } catch (e) {
        console.error("Erro ao aplicar auth no header:", e);
      }

      if (typeof syncCartBadge === "function") {
        try {
          syncCartBadge();
        } catch (e) {
          console.error("Erro syncCartBadge:", e);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar header:", err);

      headerContainer.innerHTML = `
        <div class="container py-2">
          <div class="alert alert-warning small mb-0">
            Não foi possível carregar o header agora.
            <button class="btn btn-sm btn-outline-dark ms-2" id="btn-retry-header">Tentar novamente</button>
          </div>
        </div>
      `;

      const btn = document.getElementById("btn-retry-header");
      if (btn) btn.onclick = () => loadLayout();
    }
  }

  if (footerContainer) {
    const footerFile = `${PARTIALS_BASE}footer.html`;

    try {
      footerContainer.innerHTML = "";

      const res = await fetchWithTimeout(footerFile, 6000);

      if (!res.ok) {
        const body = await readResponseSafe(res);
        throw new Error(
          `Falha ao carregar FOOTER (${res.status}) em ${footerFile}. ` +
          `Primeiros chars: ${body.slice(0, 120)}`
        );
      }

      const html = await res.text();

      if (!html || html.trim().length < 10) {
        throw new Error(`FOOTER vazio ou inválido vindo de ${footerFile}`);
      }

      footerContainer.innerHTML = html;
    } catch (err) {
      console.error("Erro ao carregar footer:", err);

      footerContainer.innerHTML = `
        <div class="container py-3">
          <div class="text-muted small">
            (Footer indisponível no momento)
          </div>
        </div>
      `;
    }
  }
}

function customizeHeaderForUserType(tipo) {
  const headerEl = document.querySelector(".serido-header");
  const searchForm = document.getElementById("header-search-form");
  const searchMobileBtn = document.getElementById("header-search-mobile-button");
  const secondaryNav = document.getElementById("header-secondary-nav");
  const cartLink = document.querySelector(".serido-header-cart-link");
  const ordersLink = document.getElementById("header-orders-link");

  const isSeller = tipo === "VENDEDOR";

  if (headerEl) {
    headerEl.classList.toggle("seller-mode", isSeller);
  }

  const toToggle = [
    searchForm,
    searchMobileBtn,
    secondaryNav,
    cartLink,
    ordersLink,
  ];

  toToggle.forEach((el) => {
    if (!el) return;
    if (isSeller) {
      el.classList.add("header-hidden");
    } else {
      el.classList.remove("header-hidden");
    }
  });
}

function applyAuthToHeader() {
  const userLink = document.getElementById("header-user-link");
  const greetingSpan = document.getElementById("header-user-greeting");
  const actionSpan = document.getElementById("header-user-action");
  const sellerLink = document.getElementById("header-seller-link");
  const headerLogoutLink = document.getElementById("header-logout-link");

  const menuUserLabel = document.getElementById("menu-user-label");
  const menuBtnLoginLogout = document.getElementById("menu-btn-login-logout");
  const menuItemMinhaLoja = document.getElementById("menu-item-minha-loja");

  if (!userLink || !greetingSpan || !actionSpan) return;

  const rawUser =
    localStorage.getItem("user") || localStorage.getItem("currentUser");
  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");

  if (!rawUser || !token) {
    greetingSpan.textContent = "Olá, visitante";
    actionSpan.textContent = "Entre ou cadastre-se";
    userLink.href = "login.html";

    if (sellerLink) sellerLink.classList.add("d-none");
    if (menuItemMinhaLoja) menuItemMinhaLoja.classList.add("d-none");
    if (menuUserLabel) menuUserLabel.textContent = "visitante";
    if (headerLogoutLink) headerLogoutLink.classList.add("d-none");

    if (menuBtnLoginLogout) {
      menuBtnLoginLogout.textContent = "Entrar ou cadastrar-se";
      menuBtnLoginLogout.classList.remove("btn-outline-danger");
      menuBtnLoginLogout.classList.add("btn-outline-dark");
      menuBtnLoginLogout.onclick = () => {
        window.location.href = "login.html";
      };
    }

    customizeHeaderForUserType("VISITANTE");
    return;
  }

  let user;
  try {
    user = JSON.parse(rawUser);
  } catch {
    clearAuth();
    greetingSpan.textContent = "Olá, visitante";
    actionSpan.textContent = "Entre ou cadastre-se";
    userLink.href = "login.html";

    if (sellerLink) sellerLink.classList.add("d-none");
    if (menuItemMinhaLoja) menuItemMinhaLoja.classList.add("d-none");
    if (menuUserLabel) menuUserLabel.textContent = "visitante";
    if (headerLogoutLink) headerLogoutLink.classList.add("d-none");

    if (menuBtnLoginLogout) {
      menuBtnLoginLogout.textContent = "Entrar ou cadastrar-se";
      menuBtnLoginLogout.classList.remove("btn-outline-danger");
      menuBtnLoginLogout.classList.add("btn-outline-dark");
      menuBtnLoginLogout.onclick = () => {
        window.location.href = "login.html";
      };
    }

    customizeHeaderForUserType("VISITANTE");
    return;
  }

  const primeiroNome =
    typeof user.nome === "string" ? user.nome.split(" ")[0] : "usuário";
  const tipo = user.tipo || "CLIENTE";

  greetingSpan.textContent = `Olá, ${primeiroNome}`;
  actionSpan.textContent = "Minha conta";
  userLink.href = "conta.html";

  const isSeller = tipo === "VENDEDOR";
  if (sellerLink) {
    sellerLink.classList.toggle("d-none", !isSeller);
  }
  if (menuItemMinhaLoja) {
    menuItemMinhaLoja.classList.toggle("d-none", !isSeller);
  }

  if (menuUserLabel) {
    const tipoLabel =
      tipo === "VENDEDOR"
        ? "vendedor"
        : tipo === "ADMIN"
        ? "administrador"
        : "cliente";
    menuUserLabel.textContent = `${primeiroNome} (${tipoLabel})`;
  }

  if (menuBtnLoginLogout) {
    menuBtnLoginLogout.textContent = "Sair";
    menuBtnLoginLogout.classList.remove("btn-outline-dark");
    menuBtnLoginLogout.classList.add("btn-outline-danger");

    menuBtnLoginLogout.onclick = () => {
      if (typeof logout === "function") {
        logout();
      } else {
        clearAuth();
      }

      const offcanvasElement = document.getElementById("menuPrincipalOffcanvas");
      if (
        offcanvasElement &&
        typeof bootstrap !== "undefined" &&
        bootstrap.Offcanvas
      ) {
        let offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasElement);
        if (!offcanvasInstance) {
          offcanvasInstance = new bootstrap.Offcanvas(offcanvasElement);
        }
        offcanvasInstance.hide();
      }

      window.location.href = "index.html";
    };
  }

  if (headerLogoutLink) {
    if (!isSeller) {
      headerLogoutLink.classList.add("d-none");
    } else {
      headerLogoutLink.classList.remove("d-none");
      headerLogoutLink.onclick = (e) => {
        e.preventDefault();
        if (typeof logout === "function") {
          logout();
        } else {
          clearAuth();
        }
        window.location.href = "index.html";
      };
    }
  }

  customizeHeaderForUserType(tipo);

  if (typeof syncCartBadge === "function") {
    syncCartBadge();
  }
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
}
