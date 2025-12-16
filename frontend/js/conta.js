document.addEventListener("DOMContentLoaded", () => {
  initContaPage();
});

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function getStoredUser() {
  const rawUser = localStorage.getItem("user") || localStorage.getItem("currentUser");
  if (!rawUser) return null;
  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

function saveStoredUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function clearAuth() {
  if (typeof logout === "function") logout();
  else {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
  }
}

function showAlert(message, type = "info") {
  const el = document.getElementById("conta-alert");
  if (!el) return alert(message);

  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove("d-none");

  window.clearTimeout(showAlert._t);
  showAlert._t = window.setTimeout(() => el.classList.add("d-none"), 5000);
}

function setBtnLoading(btn, loading, textIdle) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset._old = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Processando...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = textIdle || btn.dataset._old || btn.innerHTML;
    delete btn.dataset._old;
  }
}

const API_BASES = ["/api"];
const CHECKOUT_SELECTED_ADDRESS_KEY = "checkoutAddressId";

async function fetchWithBases(path, options = {}) {
  const token = getAuthToken();
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  let lastErr = null;

  for (const base of API_BASES) {
    const url = `${base}${path}`;
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404 || res.status === 405) {
        lastErr = new Error(`Rota não encontrada: ${url}`);
        continue;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || body?.error || `Erro HTTP ${res.status}`);
      }

      return res;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }

  throw lastErr || new Error("Falha ao acessar a API.");
}

function initContaPage() {
  const secVisitante = document.getElementById("sec-conta-visitante");
  const secLogado = document.getElementById("sec-conta-logado");

  const user = getStoredUser();
  const token = getAuthToken();

  if (!user || !token) {
    if (secVisitante) secVisitante.classList.remove("d-none");
    if (secLogado) secLogado.classList.add("d-none");
    return;
  }

  if (secVisitante) secVisitante.classList.add("d-none");
  if (secLogado) secLogado.classList.remove("d-none");

  preencherDadosConta(user);
  configurarFormularios(user);
  configurarExclusaoConta();

  initEnderecosConta();
}

function preencherDadosConta(user) {
  const nome = user.nome || "Usuário";
  const email = user.email || "email@exemplo.com";
  const telefone = user.telefone || "Não informado";
  const tipo = (user.tipo || "CLIENTE").toString().toUpperCase();

  const inicial = nome.trim().charAt(0).toUpperCase();

  const nomeEl = document.getElementById("conta-nome");
  const emailEl = document.getElementById("conta-email");
  const telefoneEl = document.getElementById("conta-telefone");
  const avatarInitialEl = document.getElementById("conta-avatar-initial");
  const tipoBadgeEl = document.getElementById("conta-tipo-badge");
  const atalhoMinhaLoja = document.getElementById("conta-atalho-minha-loja");

  if (nomeEl) nomeEl.textContent = nome;
  if (emailEl) emailEl.textContent = email;
  if (telefoneEl) telefoneEl.textContent = telefone;
  if (avatarInitialEl) avatarInitialEl.textContent = inicial || "U";

  if (tipoBadgeEl) {
    let label = "Cliente";
    let classes = ["bg-success-subtle", "text-success-emphasis"];

    if (tipo === "VENDEDOR") {
      label = "Vendedor";
      classes = ["bg-primary-subtle", "text-primary-emphasis"];
    } else if (tipo === "ADMIN") {
      label = "Administrador";
      classes = ["bg-danger-subtle", "text-danger-emphasis"];
    }

    tipoBadgeEl.textContent = label;
    tipoBadgeEl.className = "badge rounded-pill " + classes.join(" ");
  }

  if (atalhoMinhaLoja) {
    if (tipo === "VENDEDOR") atalhoMinhaLoja.classList.remove("d-none");
    else atalhoMinhaLoja.classList.add("d-none");
  }

  const inputTel = document.getElementById("input-telefone");
  const inputEmail = document.getElementById("input-email");
  if (inputTel) inputTel.value = user.telefone || "";
  if (inputEmail) inputEmail.value = user.email || "";
}

function configurarFormularios(user) {
  const formTel = document.getElementById("form-telefone");
  const formEmail = document.getElementById("form-email");
  const formSenha = document.getElementById("form-senha");

  if (formTel) {
    formTel.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = formTel.querySelector("button[type='submit']");
      const input = document.getElementById("input-telefone");
      if (!input) return;

      const telefone = input.value.trim();

      setBtnLoading(btn, true);
      try {
        const res = await fetchWithBases("/usuarios/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telefone }),
        });
        const updated = await res.json();

        user.telefone = updated.telefone ?? telefone;
        // opcionalmente atualiza email/tipo também:
        if (updated.email) user.email = updated.email;
        if (updated.tipo) user.tipo = updated.tipo;

        saveStoredUser(user);
        preencherDadosConta(user);
        showAlert("Telefone atualizado!", "success");
      } catch (err) {
        showAlert(err?.message || "Erro ao atualizar telefone.", "danger");
      } finally {
        setBtnLoading(btn, false, "Atualizar telefone");
      }
    });
  }

  if (formEmail) {
    formEmail.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = formEmail.querySelector("button[type='submit']");
      const input = document.getElementById("input-email");
      if (!input) return;

      const email = input.value.trim();
      if (!email) return showAlert("Informe um e-mail válido.", "warning");

      setBtnLoading(btn, true);
      try {
        const res = await fetchWithBases("/usuarios/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const updated = await res.json();

        user.email = updated.email ?? email;
        if (updated.telefone !== undefined) user.telefone = updated.telefone;
        if (updated.tipo) user.tipo = updated.tipo;

        saveStoredUser(user);
        preencherDadosConta(user);
        showAlert("E-mail atualizado!", "success");
      } catch (err) {
        showAlert(err?.message || "Erro ao atualizar e-mail.", "danger");
      } finally {
        setBtnLoading(btn, false, "Atualizar e-mail");
      }
    });
  }

  if (formSenha) {
    formSenha.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = formSenha.querySelector("button[type='submit']");
      const atualEl = document.getElementById("input-senha-atual");
      const novaEl = document.getElementById("input-senha-nova");

      const senhaAtual = (atualEl?.value || "").trim();
      const senhaNova = (novaEl?.value || "").trim();

      if (!senhaAtual || !senhaNova) return showAlert("Preencha senha atual e nova.", "warning");
      if (senhaNova.length < 6) return showAlert("A nova senha deve ter pelo menos 6 caracteres.", "warning");

      setBtnLoading(btn, true);
      try {
        await fetchWithBases("/usuarios/me/senha", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senhaAtual, senhaNova }),
        });

        if (atualEl) atualEl.value = "";
        if (novaEl) novaEl.value = "";

        showAlert("Senha atualizada!", "success");
      } catch (err) {
        showAlert(err?.message || "Erro ao atualizar senha.", "danger");
      } finally {
        setBtnLoading(btn, false, "Atualizar senha");
      }
    });
  }
}

function configurarExclusaoConta() {
  const btnExcluir = document.getElementById("btn-excluir-conta");
  if (!btnExcluir) return;

  btnExcluir.addEventListener("click", async () => {
    const confirma = confirm("Tem certeza que deseja excluir sua conta? Esta ação é permanente e não pode ser desfeita.");
    if (!confirma) return;

    setBtnLoading(btnExcluir, true);
    try {
      await fetchWithBases("/usuarios/me", { method: "DELETE" });

      clearAuth();
      alert("Conta excluída com sucesso.");
      window.location.href = "index.html";
    } catch (err) {
      showAlert(err?.message || "Erro ao excluir conta.", "danger");
    } finally {
      setBtnLoading(btnExcluir, false, "Excluir minha conta");
    }
  });
}

function initEnderecosConta() {
  const btnAdd = document.getElementById("btn-add-endereco");
  const list = document.getElementById("conta-endereco-list");
  const empty = document.getElementById("conta-endereco-empty");
  const loading = document.getElementById("conta-endereco-loading");

  const modalEl = document.getElementById("modalEndereco");
  const form = document.getElementById("conta-endereco-form");
  const errorBox = document.getElementById("conta-endereco-form-error");

  if (!btnAdd || !list || !empty || !loading || !modalEl || !form) return;

  if (typeof bootstrap === "undefined" || !bootstrap.Modal) {
    console.warn("Bootstrap Modal não encontrado. Endereços (modal) não serão abertos.");
    return;
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  let addresses = [];

  btnAdd.addEventListener("click", () => {
    clearEnderecoForm();
    modal.show();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.textContent = "";

    const payload = readEnderecoForm();
    const id = payload.id;

    if (!payload.apelido || !payload.destinatario || !payload.logradouro) {
      if (errorBox) errorBox.textContent = "Preencha apelido, destinatário e rua/avenida.";
      return;
    }

    try {
      if (!id) {
        await apiCreateEndereco(payload);
      } else {
        await apiUpdateEndereco(id, payload);
        if (payload.principal === true) await apiSetPrincipal(id);
      }

      addresses = await apiListEnderecos();

      const principal = addresses.find((a) => a.principal);
      if (principal?.id) localStorage.setItem(CHECKOUT_SELECTED_ADDRESS_KEY, String(principal.id));
      else localStorage.removeItem(CHECKOUT_SELECTED_ADDRESS_KEY);

      modal.hide();
      renderAddressList();
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Erro ao salvar endereço.";
      if (errorBox) errorBox.textContent = msg;
    }
  });

  (async () => {
    try {
      loading.classList.remove("d-none");
      empty.classList.add("d-none");

      addresses = await apiListEnderecos();
      renderAddressList();

      const principal = addresses.find((a) => a.principal);
      if (principal?.id) localStorage.setItem(CHECKOUT_SELECTED_ADDRESS_KEY, String(principal.id));
    } catch (err) {
      console.error(err);
      empty.classList.remove("d-none");
      empty.textContent = "Não foi possível carregar seus endereços agora.";
    } finally {
      loading.classList.add("d-none");
    }
  })();

  function renderAddressList() {
    list.innerHTML = "";

    if (!addresses || addresses.length === 0) {
      empty.classList.remove("d-none");
      return;
    }

    empty.classList.add("d-none");

    const sorted = [...addresses].sort((a, b) => {
      const ap = a.principal ? 1 : 0;
      const bp = b.principal ? 1 : 0;
      if (bp !== ap) return bp - ap;
      return Number(b.id) - Number(a.id);
    });

    list.innerHTML = sorted
      .map((addr) => {
        const linha1 = [addr.logradouro, addr.numero, addr.bairro].filter(Boolean).join(", ");
        const linha2 = [addr.cidade, addr.uf, addr.cep].filter(Boolean).join(" - ");

        return `
          <div class="border rounded-3 p-3">
            <div class="d-flex align-items-start justify-content-between gap-3">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <strong>${escapeHtml(addr.apelido || "Endereço")}</strong>
                  ${
                    addr.principal
                      ? `<span class="badge bg-primary-subtle text-primary-emphasis rounded-pill">Principal</span>`
                      : ""
                  }
                </div>

                <div class="small text-muted mb-1">
                  ${addr.destinatario ? escapeHtml(addr.destinatario) : ""}
                </div>

                <div class="small">
                  ${escapeHtml(linha1)}
                </div>
                <div class="small text-muted">
                  ${escapeHtml(linha2)}
                  ${
                    addr.complemento
                      ? `<br/><span>${escapeHtml(addr.complemento)}</span>`
                      : ""
                  }
                </div>
              </div>

              <div class="d-flex flex-column gap-2">
                ${
                  !addr.principal
                    ? `<button class="btn btn-outline-primary btn-sm rounded-pill btn-set-principal" data-id="${addr.id}">
                        Definir principal
                      </button>`
                    : `<button class="btn btn-outline-secondary btn-sm rounded-pill" disabled>
                        Principal
                      </button>`
                }

                <button class="btn btn-outline-dark btn-sm rounded-pill btn-edit-endereco" data-id="${addr.id}">
                  <i class="bi bi-pencil-square me-1"></i> Editar
                </button>

                <button class="btn btn-outline-danger btn-sm rounded-pill btn-delete-endereco" data-id="${addr.id}">
                  <i class="bi bi-trash me-1"></i> Remover
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll(".btn-edit-endereco").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const addr = addresses.find((a) => Number(a.id) === id);
        if (!addr) return;

        fillEnderecoForm(addr);
        modal.show();
      });
    });

    list.querySelectorAll(".btn-delete-endereco").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-id"));
        if (!id) return;

        if (!confirm("Deseja remover este endereço?")) return;

        try {
          await apiDeleteEndereco(id);
          addresses = await apiListEnderecos();

          const principal = addresses.find((a) => a.principal);
          if (principal?.id) localStorage.setItem(CHECKOUT_SELECTED_ADDRESS_KEY, String(principal.id));
          else localStorage.removeItem(CHECKOUT_SELECTED_ADDRESS_KEY);

          renderAddressList();
        } catch (err) {
          alert(err?.message || "Erro ao remover endereço.");
        }
      });
    });

    list.querySelectorAll(".btn-set-principal").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-id"));
        if (!id) return;

        try {
          await apiSetPrincipal(id);
          addresses = await apiListEnderecos();

          const principal = addresses.find((a) => a.principal);
          if (principal?.id) localStorage.setItem(CHECKOUT_SELECTED_ADDRESS_KEY, String(principal.id));

          renderAddressList();
        } catch (err) {
          alert(err?.message || "Erro ao definir endereço principal.");
        }
      });
    });
  }

  function clearEnderecoForm() {
    const fields = [
      "endereco-id",
      "endereco-apelido",
      "endereco-destinatario",
      "endereco-telefone",
      "endereco-cep",
      "endereco-logradouro",
      "endereco-numero",
      "endereco-bairro",
      "endereco-cidade",
      "endereco-uf",
      "endereco-complemento",
    ];

    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const principal = document.getElementById("endereco-principal");
    if (principal) principal.checked = false;

    if (errorBox) errorBox.textContent = "";
  }

  function fillEnderecoForm(addr) {
    setValue("endereco-id", addr.id);
    setValue("endereco-apelido", addr.apelido || "");
    setValue("endereco-destinatario", addr.destinatario || "");
    setValue("endereco-telefone", addr.telefone || "");
    setValue("endereco-cep", addr.cep || "");
    setValue("endereco-logradouro", addr.logradouro || "");
    setValue("endereco-numero", addr.numero || "");
    setValue("endereco-bairro", addr.bairro || "");
    setValue("endereco-cidade", addr.cidade || "");
    setValue("endereco-uf", addr.uf || "");
    setValue("endereco-complemento", addr.complemento || "");

    const principal = document.getElementById("endereco-principal");
    if (principal) principal.checked = !!addr.principal;
  }

  function readEnderecoForm() {
    return {
      id: getNumber("endereco-id"),
      apelido: getValue("endereco-apelido"),
      destinatario: getValue("endereco-destinatario"),
      telefone: getValue("endereco-telefone"),
      cep: getValue("endereco-cep"),
      logradouro: getValue("endereco-logradouro"),
      numero: getValue("endereco-numero"),
      bairro: getValue("endereco-bairro"),
      cidade: getValue("endereco-cidade"),
      uf: getValue("endereco-uf"),
      complemento: getValue("endereco-complemento"),
      principal: isChecked("endereco-principal"),
    };
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function getNumber(id) {
    const v = getValue(id);
    if (!v) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  function isChecked(id) {
    const el = document.getElementById(id);
    return !!el?.checked;
  }
}

async function apiListEnderecos() {
  const res = await fetchWithBases(`/enderecos`, { method: "GET" });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function apiCreateEndereco(payload) {
  const body = {
    apelido: payload.apelido,
    destinatario: payload.destinatario,
    telefone: payload.telefone || null,
    cep: payload.cep || null,
    logradouro: payload.logradouro,
    numero: payload.numero || null,
    bairro: payload.bairro || null,
    cidade: payload.cidade || null,
    uf: payload.uf ? String(payload.uf).trim().toUpperCase() : null,
    complemento: payload.complemento || null,
    principal: payload.principal === true,
  };

  const res = await fetchWithBases(`/enderecos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return await res.json();
}

async function apiUpdateEndereco(id, payload) {
  const body = {
    apelido: payload.apelido,
    destinatario: payload.destinatario,
    telefone: payload.telefone || null,
    cep: payload.cep || null,
    logradouro: payload.logradouro,
    numero: payload.numero || null,
    bairro: payload.bairro || null,
    cidade: payload.cidade || null,
    uf: payload.uf ? String(payload.uf).trim().toUpperCase() : null,
    complemento: payload.complemento || null,
    principal: payload.principal === true,
  };

  const res = await fetchWithBases(`/enderecos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return await res.json();
}

async function apiDeleteEndereco(id) {
  await fetchWithBases(`/enderecos/${id}`, { method: "DELETE" });
  return true;
}

async function apiSetPrincipal(id) {
  const res = await fetchWithBases(`/enderecos/${id}/principal`, { method: "PATCH" });
  return await res.json().catch(() => true);
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
