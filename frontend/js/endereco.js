const API_BASES = ["/api/enderecos", "/enderecos"];

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

let addresses = [];
let selectedAddressId = null;

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function buildHttpError(res) {
  const body = await safeJson(res);
  const msg = body?.message || body?.error || `Erro HTTP ${res.status}`;
  return new Error(msg);
}

async function fetchWithAnyBase(path, options = {}) {
  const token = getAuthToken();
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  let lastErr = null;

  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...authHeaders(),
        },
      });

      if (!res.ok) throw await buildHttpError(res);
      return res;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }

  throw lastErr || new Error("Falha ao acessar a API de endereços.");
}

async function fetchAddresses() {
  const res = await fetchWithAnyBase("", { method: "GET" });
  return res.json();
}

async function createAddress(payload) {
  const res = await fetchWithAnyBase("", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}

async function deleteAddress(id) {
  await fetchWithAnyBase(`/${id}`, {
    method: "DELETE",
  });
}

function setFormVisible(visible) {
  const formWrapper = document.getElementById("address-form-wrapper");
  const formHint = document.getElementById("address-form-hidden-hint");
  const closeBtn = document.getElementById("address-form-close-btn");

  if (!formWrapper || !formHint || !closeBtn) return;

  if (visible) {
    formWrapper.classList.remove("d-none");
    formHint.classList.add("d-none");
    closeBtn.classList.remove("d-none");
  } else {
    formWrapper.classList.add("d-none");
    formHint.classList.remove("d-none");
    closeBtn.classList.add("d-none");
  }
}

function renderAddresses() {
  const list = document.getElementById("address-list");
  const empty = document.getElementById("address-empty");
  const continueBtn = document.getElementById("address-continue-btn");
  const hint = document.getElementById("address-select-hint");
  const addBtn = document.getElementById("address-add-toggle-btn");

  if (!list || !empty || !continueBtn || !hint || !addBtn) return;

  if (!addresses.length) {
    list.innerHTML = "";
    empty.classList.remove("d-none");

    continueBtn.disabled = true;
    hint.classList.add("d-none");

    addBtn.classList.add("d-none");
    setFormVisible(true); 
    return;
  }

  empty.classList.add("d-none");
  addBtn.classList.remove("d-none");

  list.innerHTML = addresses
    .map((addr) => {
      const linha1 = [addr.logradouro, addr.numero, addr.bairro].filter(Boolean).join(", ");
      const linha2 = [addr.cidade, addr.uf, addr.cep].filter(Boolean).join(" - ");

      return `
        <label class="border rounded-3 p-3 d-flex gap-3 align-items-start">
          <input
            type="radio"
            name="address"
            class="form-check-input mt-1"
            value="${addr.id}"
            ${addr.id === selectedAddressId ? "checked" : ""}
          />
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <strong>${addr.apelido || "Endereço"}</strong>
              <button
                type="button"
                class="btn btn-link btn-sm text-danger p-0 address-delete-btn"
                data-id="${addr.id}"
                title="Remover"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
            <div class="small">${linha1}</div>
            <div class="small text-muted">${linha2}</div>
          </div>
        </label>
      `;
    })
    .join("");

  continueBtn.disabled = selectedAddressId == null;
  hint.classList.toggle("d-none", selectedAddressId != null);

  bindListEvents();
}

function bindListEvents() {
  document.querySelectorAll("input[name='address']").forEach((radio) => {
    radio.addEventListener("change", () => {
      selectedAddressId = Number(radio.value);
      renderAddresses();
    });
  });

  document.querySelectorAll(".address-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      if (!id) return;

      if (!confirm("Remover este endereço?")) return;

      try {
        await deleteAddress(id);
        addresses = addresses.filter((a) => a.id !== id);
        if (selectedAddressId === id) selectedAddressId = null;
        renderAddresses();
      } catch (e) {
        alert(e.message || "Erro ao remover endereço");
      }
    });
  });
}

function bindForm() {
  const addBtn = document.getElementById("address-add-toggle-btn");
  const closeBtn = document.getElementById("address-form-close-btn");
  const form = document.getElementById("address-form");
  const errorBox = document.getElementById("address-form-error");

  addBtn?.addEventListener("click", () => setFormVisible(true));
  closeBtn?.addEventListener("click", () => setFormVisible(false));

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.textContent = "";

    const payload = {
      apelido: document.getElementById("endereco-apelido").value.trim(),
      destinatario: document.getElementById("endereco-nome").value.trim(),
      telefone: document.getElementById("endereco-telefone").value.trim(),
      cep: document.getElementById("endereco-cep").value.trim(),
      logradouro: document.getElementById("endereco-logradouro").value.trim(),
      numero: document.getElementById("endereco-numero").value.trim(),
      bairro: document.getElementById("endereco-bairro").value.trim(),
      cidade: document.getElementById("endereco-cidade").value.trim(),
      uf: document.getElementById("endereco-estado").value.trim(),
      complemento: document.getElementById("endereco-complemento").value.trim(),
    };

    if (!payload.apelido || !payload.destinatario || !payload.logradouro) {
      if (errorBox) errorBox.textContent = "Preencha apelido, nome do destinatário e rua/avenida.";
      return;
    }

    try {
      const novo = await createAddress(payload);

      addresses.unshift(novo);
      selectedAddressId = novo.id; 

      form.reset();

      if (addresses.length > 0) setFormVisible(false);

      renderAddresses();
    } catch (err) {
      if (errorBox) errorBox.textContent = err.message || "Erro ao salvar endereço";
    }
  });
}

function bindContinue() {
  const btn = document.getElementById("address-continue-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!selectedAddressId) return;

    const selected = addresses.find((a) => a.id === selectedAddressId);
    if (!selected) {
      alert("Endereço selecionado não encontrado. Selecione novamente.");
      return;
    }

    localStorage.setItem("selectedAddress", JSON.stringify(selected));

    localStorage.setItem("checkoutAddressId", String(selectedAddressId));

    window.location.href = "pagamento.html";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = getAuthToken();
  if (!token) {
    alert("Você precisa estar logado para continuar.");
    window.location.href = "login.html";
    return;
  }

  try {
    addresses = await fetchAddresses();

    const principal = addresses.find((a) => a.principal);
    if (principal) selectedAddressId = principal.id;

    renderAddresses();
    bindForm();
    bindContinue();

    if (addresses.length) setFormVisible(false);
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao carregar endereços.");
  }
});
