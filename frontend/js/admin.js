const API_BASE = window.API_BASE_URL;

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
}

function authHeaders() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function showAlert(message, type = "info") {
  const el = document.getElementById("admin-alert");
  if (!el) {
    alert(message);
    return;
  }

  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove("d-none");

  window.clearTimeout(showAlert._t);
  showAlert._t = window.setTimeout(() => el.classList.add("d-none"), 5000);
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function formatPreco(preco) {
  if (preco === null || preco === undefined) return "-";
  const n = Number(String(preco).replace(",", "."));
  if (!Number.isFinite(n)) return String(preco);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isAdminUser(user) {
  const tipo = String(user?.tipo || "").toUpperCase();
  const email = String(user?.email || "").toLowerCase();
  return tipo === "ADMIN" || email === "admin";
}

async function fetchMeEnsureAdmin() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "login.html";
    return false;
  }

  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  const data = await safeJson(res);

  if (!res.ok) {
    showAlert(data?.message || "Sessão inválida. Faça login novamente.", "danger");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return false;
  }

  const user = data?.user;
  if (!isAdminUser(user)) {
    showAlert("Acesso restrito ao administrador.", "danger");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

function openEditModal(title, bodyHtml, onSave) {
  const modalEl = document.getElementById("adminEditModal");
  const titleEl = document.getElementById("adminEditModalTitle");
  const bodyEl = document.getElementById("adminEditModalBody");
  const saveBtn = document.getElementById("adminEditModalSave");

  if (!modalEl || !titleEl || !bodyEl || !saveBtn) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;

  saveBtn.onclick = async () => {
    try {
      await onSave();
    } catch (e) {
      console.error(e);
      showAlert("Erro ao salvar. Veja o console.", "danger");
    }
  };

  if (window.bootstrap?.Modal) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  } else {
    showAlert("Bootstrap não carregou ainda. Recarregue a página.", "warning");
  }
}

function closeEditModal() {
  const modalEl = document.getElementById("adminEditModal");
  if (!modalEl) return;

  if (window.bootstrap?.Modal) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();
  }
}

let usuariosCache = [];

async function loadUsuarios() {
  const tbody = document.getElementById("usuarios-tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Carregando...</td></tr>`;

  const res = await fetch(`${API_BASE}/admin/usuarios`, { headers: authHeaders() });
  const data = await safeJson(res);

  if (!res.ok) {
    showAlert(data?.message || "Erro ao carregar usuários", "danger");
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Falha ao carregar</td></tr>`;
    return;
  }

  usuariosCache = data?.usuarios || [];
  renderUsuarios();
}

function renderUsuarios() {
  const tbody = document.getElementById("usuarios-tbody");
  const q = (document.getElementById("usuarios-search")?.value || "").toLowerCase().trim();
  if (!tbody) return;

  const rows = usuariosCache
    .filter((u) => {
      if (!q) return true;
      return (
        String(u.nome || "").toLowerCase().includes(q) ||
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.tipo || "").toLowerCase().includes(q)
      );
    })
    .map((u) => {
      const statusOn = !!u.status;
      const statusHtml = statusOn
        ? `<span class="admin-pill"><i class="bi bi-check2-circle"></i> Ativo</span>`
        : `<span class="admin-pill off"><i class="bi bi-x-circle"></i> Inativo</span>`;

      const disableDanger = String(u.email).toLowerCase() === "admin";

      return `
        <tr>
          <td>${u.id}</td>
          <td>${u.nome ?? "-"}</td>
          <td>${u.email ?? "-"}</td>
          <td><span class="badge admin-badge-soft">${u.tipo}</span></td>
          <td>${statusHtml}</td>
          <td class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" data-action="edit-user" data-id="${u.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" data-action="toggle-user" data-id="${u.id}" ${disableDanger ? "disabled" : ""}>
              ${statusOn ? '<i class="bi bi-slash-circle"></i>' : '<i class="bi bi-check-circle"></i>'}
            </button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete-user" data-id="${u.id}" ${disableDanger ? "disabled" : ""}>
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows || `<tr><td colspan="6" class="text-center text-muted py-4">Nenhum usuário</td></tr>`;
}

async function updateUsuario(id, payload) {
  const res = await fetch(`${API_BASE}/admin/usuarios/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    showAlert(data?.message || "Erro ao atualizar usuário", "danger");
    return false;
  }
  showAlert("Usuário atualizado!", "success");
  return true;
}

async function toggleUsuarioStatus(id, status) {
  const res = await fetch(`${API_BASE}/admin/usuarios/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    showAlert(data?.message || "Erro ao alterar status", "danger");
    return false;
  }
  showAlert("Status atualizado!", "success");
  return true;
}

async function deleteUsuario(id) {
  if (!confirm("Tem certeza que deseja excluir este usuário?")) return false;

  const res = await fetch(`${API_BASE}/admin/usuarios/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    showAlert(data?.message || "Erro ao excluir usuário", "danger");
    return false;
  }
  showAlert("Usuário excluído!", "success");
  return true;
}

let lojasCache = [];

async function loadLojas() {
  const tbody = document.getElementById("lojas-tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Carregando...</td></tr>`;

  const res = await fetch(`${API_BASE}/admin/lojas`, { headers: authHeaders() });
  const data = await safeJson(res);

  if (!res.ok) {
    showAlert(data?.message || "Erro ao carregar lojas", "danger");
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Falha ao carregar</td></tr>`;
    return;
  }

  lojasCache = data?.lojas || [];
  renderLojas();
}

function renderLojas() {
  const tbody = document.getElementById("lojas-tbody");
  const q = (document.getElementById("lojas-search")?.value || "").toLowerCase().trim();
  if (!tbody) return;

  const rows = lojasCache
    .filter((l) => !q || String(l.nome || "").toLowerCase().includes(q))
    .map((l) => {
      const dono = l.dono ? `${l.dono.nome} (#${l.dono.id})` : "-";
      return `
        <tr>
          <td>${l.id}</td>
          <td>${l.nome ?? "-"}</td>
          <td><span class="badge admin-badge-soft">${l.status ?? "-"}</span></td>
          <td>${dono}</td>
          <td class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" data-action="edit-loja" data-id="${l.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete-loja" data-id="${l.id}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows || `<tr><td colspan="5" class="text-center text-muted py-4">Nenhuma loja</td></tr>`;
}

async function updateLoja(id, payload) {
  const res = await fetch(`${API_BASE}/admin/lojas/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    showAlert(data?.message || "Erro ao atualizar loja", "danger");
    return false;
  }
  showAlert("Loja atualizada!", "success");
  return true;
}

async function deleteLoja(id) {
  if (!confirm("Tem certeza que deseja excluir/inativar esta loja?")) return false;

  const res = await fetch(`${API_BASE}/admin/lojas/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    showAlert(data?.message || "Erro ao excluir/inativar loja", "danger");
    return false;
  }

  showAlert(
    data?.softDeleted ? "Loja inativada (há pedidos vinculados)." : "Loja excluída!",
    data?.softDeleted ? "warning" : "success"
  );
  return true;
}

let produtosCache = [];

async function loadProdutos() {
  const tbody = document.getElementById("produtos-tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Carregando...</td></tr>`;

  const res = await fetch(`${API_BASE}/admin/produtos`, { headers: authHeaders() });
  const data = await safeJson(res);

  if (!res.ok) {
    showAlert(data?.message || "Erro ao carregar produtos", "danger");
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Falha ao carregar</td></tr>`;
    return;
  }

  produtosCache = data?.produtos || [];
  renderProdutos();
}

function renderProdutos() {
  const tbody = document.getElementById("produtos-tbody");
  const q = (document.getElementById("produtos-search")?.value || "").toLowerCase().trim();
  if (!tbody) return;

  const rows = produtosCache
    .filter((p) => !q || String(p.nome || "").toLowerCase().includes(q))
    .map((p) => {
      const ativo = !!p.ativo;
      const ativoHtml = ativo
        ? `<span class="admin-pill"><i class="bi bi-check2-circle"></i> Sim</span>`
        : `<span class="admin-pill off"><i class="bi bi-x-circle"></i> Não</span>`;

      return `
        <tr>
          <td>${p.id}</td>
          <td>${p.nome ?? "-"}</td>
          <td>${p.loja?.nome ? `${p.loja.nome} (#${p.loja.id})` : "-"}</td>
          <td>${formatPreco(p.preco)}</td>
          <td>${ativoHtml}</td>
          <td class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" data-action="edit-produto" data-id="${p.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" data-action="toggle-produto" data-id="${p.id}">
              ${ativo ? '<i class="bi bi-slash-circle"></i>' : '<i class="bi bi-check-circle"></i>'}
            </button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete-produto" data-id="${p.id}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows || `<tr><td colspan="6" class="text-center text-muted py-4">Nenhum produto</td></tr>`;
}

async function updateProduto(id, payload) {
  const res = await fetch(`${API_BASE}/admin/produtos/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    showAlert(data?.message || "Erro ao atualizar produto", "danger");
    return false;
  }
  showAlert("Produto atualizado!", "success");
  return true;
}

async function toggleProdutoAtivo(id, ativo) {
  const ok = await updateProduto(id, { ativo });
  return ok;
}

async function deleteProduto(id) {
  if (!confirm("Tem certeza que deseja excluir/desativar este produto?")) return false;

  const res = await fetch(`${API_BASE}/admin/produtos/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    showAlert(data?.message || "Erro ao excluir/desativar produto", "danger");
    return false;
  }

  showAlert(
    data?.softDeleted ? "Produto desativado (já existe em pedidos)." : "Produto excluído!",
    data?.softDeleted ? "warning" : "success"
  );
  return true;
}

function bindLogout() {
  document.getElementById("admin-logout-btn")?.addEventListener("click", () => {
    if (typeof window.logout === "function") window.logout();
    else {
      localStorage.clear();
      window.location.href = "login.html";
    }
  });
}

function bindSearchAndRefresh() {
  document.getElementById("usuarios-refresh")?.addEventListener("click", loadUsuarios);
  document.getElementById("usuarios-search")?.addEventListener("input", renderUsuarios);

  document.getElementById("lojas-refresh")?.addEventListener("click", loadLojas);
  document.getElementById("lojas-search")?.addEventListener("input", renderLojas);

  document.getElementById("produtos-refresh")?.addEventListener("click", loadProdutos);
  document.getElementById("produtos-search")?.addEventListener("input", renderProdutos);
}

function bindTableActions() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = Number(btn.getAttribute("data-id"));

    if (action === "toggle-user") {
      const u = usuariosCache.find((x) => x.id === id);
      if (!u) return;
      if (await toggleUsuarioStatus(id, !u.status)) await loadUsuarios();
      return;
    }
    if (action === "delete-user") {
      if (await deleteUsuario(id)) await loadUsuarios();
      return;
    }
    if (action === "edit-user") {
      const u = usuariosCache.find((x) => x.id === id);
      if (!u) return;

      openEditModal(
        `Editar usuário #${id}`,
        `
          <div class="mb-2">
            <label class="form-label">Nome</label>
            <input id="edit-user-nome" class="form-control" value="${u.nome ?? ""}">
          </div>
          <div class="mb-2">
            <label class="form-label">Email</label>
            <input id="edit-user-email" class="form-control" value="${u.email ?? ""}">
          </div>
          <div class="mb-2">
            <label class="form-label">Telefone</label>
            <input id="edit-user-telefone" class="form-control" value="${u.telefone ?? ""}">
          </div>
          <div class="mb-2">
            <label class="form-label">Tipo</label>
            <select id="edit-user-tipo" class="form-select">
              <option value="CLIENTE" ${String(u.tipo).toUpperCase()==="CLIENTE"?"selected":""}>CLIENTE</option>
              <option value="VENDEDOR" ${String(u.tipo).toUpperCase()==="VENDEDOR"?"selected":""}>VENDEDOR</option>
              <option value="ADMIN" ${String(u.tipo).toUpperCase()==="ADMIN"?"selected":""}>ADMIN</option>
            </select>
          </div>
          <div class="mb-2">
            <label class="form-label">Status</label>
            <select id="edit-user-status" class="form-select">
              <option value="true" ${u.status ? "selected" : ""}>Ativo</option>
              <option value="false" ${!u.status ? "selected" : ""}>Inativo</option>
            </select>
          </div>
        `,
        async () => {
          const payload = {
            nome: document.getElementById("edit-user-nome")?.value?.trim(),
            email: document.getElementById("edit-user-email")?.value?.trim(),
            telefone: document.getElementById("edit-user-telefone")?.value?.trim() || null,
            tipo: document.getElementById("edit-user-tipo")?.value,
            status: document.getElementById("edit-user-status")?.value === "true",
          };
          if (await updateUsuario(id, payload)) {
            closeEditModal();
            await loadUsuarios();
          }
        }
      );
      return;
    }

    if (action === "delete-loja") {
      if (await deleteLoja(id)) await loadLojas();
      return;
    }
    if (action === "edit-loja") {
      const l = lojasCache.find((x) => x.id === id);
      if (!l) return;

      openEditModal(
        `Editar loja #${id}`,
        `
          <div class="mb-2">
            <label class="form-label">Nome</label>
            <input id="edit-loja-nome" class="form-control" value="${l.nome ?? ""}">
          </div>
          <div class="mb-2">
            <label class="form-label">Descrição</label>
            <textarea id="edit-loja-descricao" class="form-control" rows="3">${l.descricao ?? ""}</textarea>
          </div>
          <div class="mb-2">
            <label class="form-label">Status</label>
            <select id="edit-loja-status" class="form-select">
              <option value="PENDENTE" ${String(l.status).toUpperCase()==="PENDENTE"?"selected":""}>PENDENTE</option>
              <option value="APROVADA" ${String(l.status).toUpperCase()==="APROVADA"?"selected":""}>APROVADA</option>
              <option value="INATIVA" ${String(l.status).toUpperCase()==="INATIVA"?"selected":""}>INATIVA</option>
            </select>
          </div>
        `,
        async () => {
          const payload = {
            nome: document.getElementById("edit-loja-nome")?.value?.trim(),
            descricao: document.getElementById("edit-loja-descricao")?.value?.trim() || null,
            status: document.getElementById("edit-loja-status")?.value,
          };
          if (await updateLoja(id, payload)) {
            closeEditModal();
            await loadLojas();
          }
        }
      );
      return;
    }

    if (action === "toggle-produto") {
      const p = produtosCache.find((x) => x.id === id);
      if (!p) return;
      if (await toggleProdutoAtivo(id, !p.ativo)) await loadProdutos();
      return;
    }
    if (action === "delete-produto") {
      if (await deleteProduto(id)) await loadProdutos();
      return;
    }
    if (action === "edit-produto") {
      const p = produtosCache.find((x) => x.id === id);
      if (!p) return;

      openEditModal(
        `Editar produto #${id}`,
        `
          <div class="mb-2">
            <label class="form-label">Nome</label>
            <input id="edit-prod-nome" class="form-control" value="${p.nome ?? ""}">
          </div>
          <div class="mb-2">
            <label class="form-label">Preço</label>
            <input id="edit-prod-preco" class="form-control" value="${p.preco ?? ""}" placeholder="19.90">
          </div>
          <div class="mb-2">
            <label class="form-label">Estoque</label>
            <input id="edit-prod-estoque" type="number" class="form-control" value="${p.estoque ?? 0}">
          </div>
          <div class="mb-2">
            <label class="form-label">Ativo</label>
            <select id="edit-prod-ativo" class="form-select">
              <option value="true" ${p.ativo ? "selected" : ""}>Sim</option>
              <option value="false" ${!p.ativo ? "selected" : ""}>Não</option>
            </select>
          </div>
        `,
        async () => {
          const payload = {
            nome: document.getElementById("edit-prod-nome")?.value?.trim(),
            preco: document.getElementById("edit-prod-preco")?.value?.trim() || undefined,
            estoque: Number(document.getElementById("edit-prod-estoque")?.value || 0),
            ativo: document.getElementById("edit-prod-ativo")?.value === "true",
          };
          if (await updateProduto(id, payload)) {
            closeEditModal();
            await loadProdutos();
          }
        }
      );
      return;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("[Admin] init...");

    const ok = await fetchMeEnsureAdmin();
    if (!ok) return;

    bindLogout();
    bindSearchAndRefresh();
    bindTableActions();

    await loadUsuarios();
    await loadLojas();
    await loadProdutos();

    console.log("[Admin] loaded.");
  } catch (err) {
    console.error(err);
    showAlert(`Erro no painel admin: ${err?.message || err}`, "danger");
  }
});
