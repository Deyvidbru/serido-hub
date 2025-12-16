
   const BUILD_ID = "meus_produtos_debug_2025-12-16_01";
   console.log("✅ meus_produtos.js carregado:", BUILD_ID, new Date().toISOString());
   
   const API = window.API_BASE_URL || "/api";
   
   let PRODUTOS_VENDEDOR = [];
   let TOKEN_ATUAL = null;
   
   let LOAD_CALLS = 0;
   let LAST_LOAD_AT = 0;
   
   function $(id) {
     return document.getElementById(id);
   }
   
   function escapeHtml(str) {
     if (!str) return "";
     return String(str)
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
   }
   
   function showAlertHtml(html, type = "danger") {
     const alertBox = $("produtos-vendedor-alert");
     if (!alertBox) {
       console.error("Sem #produtos-vendedor-alert no DOM");
       alert(html.replace(/<[^>]*>/g, " "));
       return;
     }
     alertBox.innerHTML = `<div class="alert alert-${type}">${html}</div>`;
   }
   
   function showDebugPanel(payload) {
     const alertBox = $("produtos-vendedor-alert");
     if (!alertBox) return;
   
     const pretty = escapeHtml(JSON.stringify(payload, null, 2));
   
     alertBox.innerHTML = `
       <div class="alert alert-danger">
         <div class="d-flex justify-content-between align-items-center">
           <strong>Erro detectado (DEBUG)</strong>
           <span class="badge text-bg-dark">${escapeHtml(BUILD_ID)}</span>
         </div>
         <div class="small mt-2">Veja detalhes abaixo (copie e me envie se precisar):</div>
         <pre class="mt-2 p-2 bg-light border rounded small" style="max-height: 300px; overflow:auto;">${pretty}</pre>
       </div>
     `;
   }
   
   function setLoadingState(msg = "Carregando produtos...") {
     const list = $("produtos-vendedor-list");
     const empty = $("produtos-vendedor-empty");
     const countSpan = $("produtos-vendedor-count");
   
     if (empty) empty.classList.add("d-none");
     if (countSpan) countSpan.textContent = "";
   
     if (list) {
       list.innerHTML = `
         <div class="list-group-item text-muted d-flex align-items-center gap-2">
           <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
           <span>${escapeHtml(msg)}</span>
         </div>
       `;
     }
   }
   
   function setEmptyState() {
     const list = $("produtos-vendedor-list");
     const empty = $("produtos-vendedor-empty");
     const countSpan = $("produtos-vendedor-count");
   
     if (list) list.innerHTML = "";
     if (countSpan) countSpan.textContent = "(nenhum produto cadastrado ainda)";
     if (empty) empty.classList.remove("d-none");
   }
   
   async function safeReadText(res) {
     try {
       return await res.text();
     } catch {
       return "";
     }
   }
   
   async function safeJson(res) {
     try {
       return await res.json();
     } catch {
       return null;
     }
   }
   
   function headersToObject(headers) {
     try {
       const obj = {};
       for (const [k, v] of headers.entries()) obj[k] = v;
       return obj;
     } catch {
       return {};
     }
   }
   
   window.addEventListener("error", (ev) => {
     console.error("❌ window.error:", ev?.message, ev?.error);
     showDebugPanel({
       where: "window.error",
       message: ev?.message || "Erro não identificado",
       filename: ev?.filename,
       lineno: ev?.lineno,
       colno: ev?.colno,
       stack: ev?.error?.stack,
       build: BUILD_ID,
     });
   });
   
   window.addEventListener("unhandledrejection", (ev) => {
     console.error("❌ unhandledrejection:", ev?.reason);
     showDebugPanel({
       where: "unhandledrejection",
       reason: String(ev?.reason),
       stack: ev?.reason?.stack,
       build: BUILD_ID,
     });
   });
   
   document.addEventListener("DOMContentLoaded", () => {
     console.log("DOM pronto:", location.href);
   
     if (typeof getCurrentUser !== "function" || typeof getToken !== "function") {
       showDebugPanel({
         where: "bootstrap",
         error: "getCurrentUser/getToken não disponíveis",
         hint: "auth.js não carregou? ou carregou depois? ver ordem dos scripts no HTML.",
         build: BUILD_ID,
         scripts: Array.from(document.scripts).map((s) => s.src || "[inline]"),
       });
       return;
     }
   
     const user = getCurrentUser();
     const token = getToken();
     TOKEN_ATUAL = token;
   
     console.log("user/token:", user, token ? "(token ok)" : "(sem token)");
   
     if (!user || !token) {
       showAlertHtml("Você precisa estar logado para acessar esta página.", "warning");
       setTimeout(() => (window.location.href = "login.html"), 1500);
       return;
     }
   
     if (String(user.tipo).toUpperCase() !== "VENDEDOR") {
       showAlertHtml("Apenas usuários do tipo <strong>Vendedor</strong> podem gerenciar produtos.", "danger");
       setTimeout(() => (window.location.href = "index.html"), 2000);
       return;
     }
   
     try {
       initProdutosPage(token);
       setupPreviewInput();
     } catch (err) {
       console.error("Erro ao inicializar página:", err);
       showDebugPanel({
         where: "initProdutosPage/setupPreviewInput",
         error: String(err),
         stack: err?.stack,
         build: BUILD_ID,
       });
     }
   });
   
   function initProdutosPage(token) {
     setupModalNovoProduto();
     setupFormProduto(token);
     setupFiltros();
   
     carregarProdutos(token);
   }
   
   function setupPreviewInput() {
     const urlInput = $("produto-imagem");
     const img = $("produto-preview-img");
     const placeholder = $("produto-preview-placeholder");
   
     if (!urlInput || !img || !placeholder) return;
   
     const updatePreview = () => {
       const url = urlInput.value.trim();
   
       if (!url) {
         img.src = "";
         img.classList.add("d-none");
         placeholder.classList.remove("d-none");
         return;
       }
   
       img.onload = () => {
         img.classList.remove("d-none");
         placeholder.classList.add("d-none");
       };
   
       img.onerror = () => {
         img.src = "";
         img.classList.add("d-none");
         placeholder.classList.remove("d-none");
       };
   
       img.src = url;
     };
   
     urlInput.addEventListener("input", updatePreview);
     urlInput.addEventListener("change", updatePreview);
     updatePreview();
   }
   
   function setupModalNovoProduto() {
     const btnNovo = $("btn-abrir-modal-produto");
     const form = $("produto-form");
     const titulo = $("produtoModalLabel");
     const erro = $("produto-error");
     const sucesso = $("produto-success");
     const ativoInput = $("produto-ativo");
   
     if (!btnNovo || !form) return;
   
     btnNovo.addEventListener("click", () => {
       form.reset();
       const idInput = $("produto-id");
       if (idInput) idInput.value = "";
       if (titulo) titulo.textContent = "Novo produto";
       if (erro) erro.textContent = "";
       if (sucesso) sucesso.textContent = "";
       if (ativoInput) ativoInput.checked = true;
   
       const imagemInput = $("produto-imagem");
       if (imagemInput) imagemInput.dispatchEvent(new Event("change"));
     });
   }
   
   function setupFormProduto(token) {
     const form = $("produto-form");
     const errorBox = $("produto-error");
     const successBox = $("produto-success");
   
     if (!form) return;
   
     form.addEventListener("submit", async (e) => {
       e.preventDefault();
       if (errorBox) errorBox.textContent = "";
       if (successBox) successBox.textContent = "";
   
       const idInput = $("produto-id");
   
       const nome = $("produto-nome")?.value.trim() || "";
       const descricao = $("produto-descricao")?.value.trim() || "";
       const precoStr = $("produto-preco")?.value.trim() || "";
       const estoqueStr = $("produto-estoque")?.value.trim() || "";
       const categoriaSelect = $("produto-categoria") || null;
       const imagemUrl = $("produto-imagem")?.value.trim() || "";
       const ativoInput = $("produto-ativo");
   
       if (!nome) {
         if (errorBox) errorBox.textContent = "Informe o nome do produto.";
         return;
       }
   
       const preco = Number(precoStr.replace(",", "."));
       if (!preco || Number.isNaN(preco) || preco <= 0) {
         if (errorBox) errorBox.textContent = "Informe um preço válido.";
         return;
       }
   
       const estoque = parseInt(estoqueStr, 10);
       if (Number.isNaN(estoque) || estoque < 0) {
         if (errorBox) errorBox.textContent = "Informe um estoque válido (zero ou maior).";
         return;
       }
   
       const idCategoria = categoriaSelect ? categoriaSelect.value || null : null;
       const ativo = ativoInput ? !!ativoInput.checked : true;
   
       const payload = {
         nome,
         descricao: descricao || undefined,
         preco,
         estoque,
         imagemUrl: imagemUrl || undefined,
         idCategoria: idCategoria || undefined,
         ativo,
       };
   
       const produtoId = idInput ? idInput.value.trim() : "";
       const isEdicao = !!produtoId;
   
       const url = isEdicao ? `${API}/produtos/${produtoId}` : `${API}/produtos`;
   
       try {
         const resp = await fetch(url, {
           method: isEdicao ? "PUT" : "POST",
           cache: "no-store",
           headers: {
             "Content-Type": "application/json",
             Authorization: `Bearer ${token}`,
             "Cache-Control": "no-cache",
             Pragma: "no-cache",
             "X-Debug-Build": BUILD_ID,
           },
           body: JSON.stringify(payload),
         });
   
         const txt = await safeReadText(resp);
         let data = null;
         try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt }; }
   
         if (!resp.ok) {
           const msg =
             (data && data.message) ||
             `Erro HTTP ${resp.status} ao ${isEdicao ? "atualizar" : "cadastrar"} produto.`;
           if (errorBox) errorBox.textContent = msg;
   
           showDebugPanel({
             where: "submitProduto",
             url,
             method: isEdicao ? "PUT" : "POST",
             status: resp.status,
             statusText: resp.statusText,
             responseHeaders: headersToObject(resp.headers),
             responseBody: data,
             payloadSent: payload,
             build: BUILD_ID,
           });
           return;
         }
   
         if (successBox) {
           successBox.textContent = isEdicao
             ? "Produto atualizado com sucesso!"
             : "Produto cadastrado com sucesso!";
         }
   
         setTimeout(() => {
           const modalEl = $("produtoModal");
           if (modalEl && typeof bootstrap !== "undefined" && bootstrap.Modal) {
             const modalInstance = bootstrap.Modal.getInstance(modalEl);
             if (modalInstance) modalInstance.hide();
           }
         }, 250);
   
         carregarProdutos(token);
       } catch (err) {
         console.error(err);
         if (errorBox) errorBox.textContent = "Erro de conexão com o servidor.";
   
         showDebugPanel({
           where: "submitProduto catch",
           url,
           error: String(err),
           stack: err?.stack,
           build: BUILD_ID,
         });
       }
     });
   }
   
   async function carregarProdutos(token) {
     LOAD_CALLS += 1;
     const now = Date.now();
   
     if (LOAD_CALLS > 6 && now - LAST_LOAD_AT < 4000) {
       showDebugPanel({
         where: "anti-loop",
         message: "carregarProdutos() está sendo chamado repetidamente (loop).",
         LOAD_CALLS,
         LAST_LOAD_AT,
         now,
         hint: "Procure outro script chamando init/carregarProdutos (layout.js, includes, ou script duplicado no HTML).",
         build: BUILD_ID,
       });
       return;
     }
     LAST_LOAD_AT = now;
   
     setLoadingState(`Carregando produtos... (chamada #${LOAD_CALLS})`);
   
     const url = `${API}/produtos/minha-loja`;
   
     try {
       const resp = await fetch(url, {
         method: "GET",
         cache: "no-store",
         headers: {
           Authorization: `Bearer ${token}`,
           "Cache-Control": "no-cache",
           Pragma: "no-cache",
           "X-Debug-Build": BUILD_ID,
         },
       });
   
       const txt = await safeReadText(resp);
       let data = null;
       try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt }; }
   
       console.log("GET minha-loja:", {
         url,
         status: resp.status,
         ok: resp.ok,
         dataPreview: data,
       });
   
       if (!resp.ok) {
         const msg = (data && data.message) || `Erro HTTP ${resp.status} ao carregar produtos.`;
         showAlertHtml(`${escapeHtml(msg)}<br><small class="text-muted">URL: ${escapeHtml(url)}</small>`, "danger");
   
         showDebugPanel({
           where: "carregarProdutos",
           url,
           status: resp.status,
           statusText: resp.statusText,
           responseHeaders: headersToObject(resp.headers),
           responseBody: data,
           build: BUILD_ID,
         });
         return;
       }
   
       const loja = data?.loja || null;
       const produtos = Array.isArray(data?.produtos) ? data.produtos : null;
   
       if (!loja) {
         showDebugPanel({
           where: "carregarProdutos - schema",
           error: "Resposta OK, mas campo 'loja' veio nulo/ausente.",
           responseBody: data,
           build: BUILD_ID,
         });
       }
   
       if (!produtos) {
         showDebugPanel({
           where: "carregarProdutos - schema",
           error: "Resposta OK, mas 'produtos' não é um array.",
           responseBody: data,
           build: BUILD_ID,
         });
         return;
       }
   
       PRODUTOS_VENDEDOR = produtos;
   
       const countSpan = $("produtos-vendedor-count");
       if (countSpan) {
         countSpan.textContent = PRODUTOS_VENDEDOR.length
           ? `(${PRODUTOS_VENDEDOR.length} produto(s))`
           : "(nenhum produto cadastrado ainda)";
       }
   
       preencherCategoriasFiltroEForm(PRODUTOS_VENDEDOR);
   
       if (!PRODUTOS_VENDEDOR.length) {
         setEmptyState();
         showAlertHtml(
           `Sua loja (${escapeHtml(loja?.nome || "sem nome")}) ainda não tem produtos cadastrados.`,
           "info"
         );
         return;
       }
   
       aplicarFiltrosEListagem(loja);
   
       const alertBox = $("produtos-vendedor-alert");
       if (alertBox) alertBox.innerHTML = "";
     } catch (err) {
       console.error(err);
       showDebugPanel({
         where: "carregarProdutos catch",
         url,
         error: String(err),
         stack: err?.stack,
         build: BUILD_ID,
       });
     }
   }
   
   
   function preencherCategoriasFiltroEForm(produtos) {
     const filtroSelect = $("filtro-categoria-produto");
     const formSelect = $("produto-categoria");
   
     if (!filtroSelect && !formSelect) return;
   
     const categoriasMap = new Map();
   
     (produtos || []).forEach((p) => {
       const idCat = p.idCategoria ?? p.id_categoria ?? p.categoriaId ?? null;
       const nomeCat =
         (p.categoria && p.categoria.nome) ||
         p.categoriaNome ||
         p.nomeCategoria ||
         null;
   
       if (idCat && !categoriasMap.has(idCat)) {
         categoriasMap.set(idCat, nomeCat || `Categoria ${idCat}`);
       }
     });
   
     const opcoes = Array.from(categoriasMap.entries());
   
     const preencher = (select, incluirTodas) => {
       if (!select) return;
   
       const valorAtual = select.value;
       select.innerHTML = "";
   
       const optBase = document.createElement("option");
       optBase.value = "";
       optBase.textContent = incluirTodas
         ? "Todas as categorias"
         : "Selecione uma categoria";
       select.appendChild(optBase);
   
       opcoes.forEach(([id, nome]) => {
         const opt = document.createElement("option");
         opt.value = id;
         opt.textContent = nome;
         select.appendChild(opt);
       });
   
       if (valorAtual && select.querySelector(`option[value="${valorAtual}"]`)) {
         select.value = valorAtual;
       }
     };
   
     preencher(filtroSelect, true);
     preencher(formSelect, false);
   }
   
   function setupFiltros() {
     const buscaInput = $("filtro-busca-produto");
     const categoriaSelect = $("filtro-categoria-produto");
     const statusSelect = $("filtro-status-produto");
     const btnLimpar = $("btn-limpar-filtros-produto");
     const list = $("produtos-vendedor-list");
   
     if (buscaInput)
       buscaInput.addEventListener("input", () => aplicarFiltrosEListagem());
     if (categoriaSelect)
       categoriaSelect.addEventListener("change", () => aplicarFiltrosEListagem());
     if (statusSelect)
       statusSelect.addEventListener("change", () => aplicarFiltrosEListagem());
   
     if (btnLimpar) {
       btnLimpar.addEventListener("click", () => {
         if (buscaInput) buscaInput.value = "";
         if (categoriaSelect) categoriaSelect.value = "";
         if (statusSelect) statusSelect.value = "";
         aplicarFiltrosEListagem();
       });
     }
   
     if (list) {
       list.addEventListener("click", (ev) => {
         const editarBtn = ev.target.closest(".produto-editar-btn");
         const removerBtn = ev.target.closest(".produto-remover-btn");
   
         if (editarBtn) {
           const id = editarBtn.getAttribute("data-id");
           abrirEdicaoProduto(id);
         } else if (removerBtn) {
           const id = removerBtn.getAttribute("data-id");
           removerProduto(id);
         }
       });
     }
   }
   
   function aplicarFiltrosEListagem(lojaFromFetch = null) {
     const list = $("produtos-vendedor-list");
     const empty = $("produtos-vendedor-empty");
     const buscaInput = $("filtro-busca-produto");
     const categoriaSelect = $("filtro-categoria-produto");
     const statusSelect = $("filtro-status-produto");
   
     if (!list) return;
   
     if (empty && PRODUTOS_VENDEDOR.length) empty.classList.add("d-none");
   
     const textoBusca = (buscaInput?.value || "").trim().toLowerCase();
     const categoriaFiltro = categoriaSelect?.value || "";
     const statusFiltro = statusSelect?.value || "";
   
     const filtrados = (PRODUTOS_VENDEDOR || []).filter((p) => {
       if (textoBusca) {
         const nome = (p.nome || "").toLowerCase();
         const desc = (p.descricao || "").toLowerCase();
         if (!nome.includes(textoBusca) && !desc.includes(textoBusca)) return false;
       }
   
       if (categoriaFiltro) {
         const idCat = p.idCategoria ?? p.id_categoria ?? p.categoriaId ?? "";
         if (String(idCat) !== String(categoriaFiltro)) return false;
       }
   
       if (statusFiltro) {
         const ativo = !!p.ativo;
         if (statusFiltro === "ativo" && !ativo) return false;
         if (statusFiltro === "inativo" && ativo) return false;
       }
   
       return true;
     });
   
     if (!filtrados.length) {
       list.innerHTML = `
         <div class="list-group-item small text-muted">
           Nenhum produto encontrado com os filtros atuais.
         </div>
       `;
       return;
     }
   
     list.innerHTML = filtrados
       .map((p) => {
         const precoNumber = Number(p.preco || 0);
         const precoFmt = precoNumber.toFixed(2).replace(".", ",");
   
         const estoque = p.estoque ?? 0;
   
         const categoriaNome =
           (p.categoria && p.categoria.nome) ||
           p.categoriaNome ||
           p.nomeCategoria ||
           "";
   
         const idCat = p.idCategoria ?? p.id_categoria ?? p.categoriaId ?? "";
         const imagemUrl = p.imagemUrl || p.imagem_principal || "";
         const ativo = !!p.ativo;
   
         const statusBadgeClass = ativo
           ? "bg-success-subtle text-success"
           : "bg-secondary-subtle text-secondary";
         const statusText = ativo ? "Ativo" : "Inativo";
   
         return `
           <div class="list-group-item produto-item d-flex align-items-center justify-content-between gap-3" data-id="${p.id}">
             <div class="d-flex align-items-center gap-3 flex-grow-1">
               <div class="produto-thumb rounded flex-shrink-0">
                 ${
                   imagemUrl
                     ? `<img src="${imagemUrl}" alt="${escapeHtml(p.nome || "")}">`
                     : `<i class="bi bi-box-seam text-muted"></i>`
                 }
               </div>
               <div class="produto-info-texto">
                 <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                   <strong class="produto-nome">${escapeHtml(p.nome || "")}</strong>
                   ${
                     categoriaNome
                       ? `<span class="badge bg-light text-muted produto-categoria-badge" data-categoria-id="${idCat}">
                            ${escapeHtml(categoriaNome)}
                          </span>`
                       : ""
                   }
                 </div>
                 ${
                   p.descricao
                     ? `<div class="small text-muted produto-descricao">
                          ${escapeHtml(p.descricao)}
                        </div>`
                     : ""
                 }
               </div>
             </div>
             <div class="text-end small produto-info-acoes">
               <div>
                 <span class="text-muted d-block">Preço</span>
                 <div class="fw-semibold produto-preco">R$ ${precoFmt}</div>
               </div>
               <div class="mt-1">
                 <span class="text-muted d-block">Estoque</span>
                 <div class="fw-semibold produto-estoque">${estoque} unid.</div>
               </div>
               <div class="mt-1">
                 <span class="badge rounded-pill produto-status-badge ${statusBadgeClass}">
                   ${statusText}
                 </span>
               </div>
               <div class="mt-2 d-flex justify-content-end gap-1">
                 <button type="button" class="btn btn-outline-secondary btn-sm produto-editar-btn" data-id="${p.id}">
                   Editar
                 </button>
                 <button type="button" class="btn btn-outline-danger btn-sm produto-remover-btn" data-id="${p.id}">
                   Remover
                 </button>
               </div>
             </div>
           </div>
         `;
       })
       .join("");
   }
   
   function abrirEdicaoProduto(id) {
     if (!id) return;
   
     const produto = (PRODUTOS_VENDEDOR || []).find((p) => String(p.id) === String(id));
     if (!produto) return;
   
     const titulo = $("produtoModalLabel");
     const idInput = $("produto-id");
     const nomeInput = $("produto-nome");
     const descInput = $("produto-descricao");
     const precoInput = $("produto-preco");
     const estoqueInput = $("produto-estoque");
     const categoriaSelect = $("produto-categoria");
     const imagemInput = $("produto-imagem");
     const ativoInput = $("produto-ativo");
     const errorBox = $("produto-error");
     const successBox = $("produto-success");
   
     if (errorBox) errorBox.textContent = "";
     if (successBox) successBox.textContent = "";
   
     if (titulo) titulo.textContent = "Editar produto";
     if (idInput) idInput.value = produto.id;
     if (nomeInput) nomeInput.value = produto.nome || "";
     if (descInput) descInput.value = produto.descricao || "";
   
     if (precoInput) {
       const precoNumber = Number(produto.preco || 0);
       precoInput.value = precoNumber.toString().replace(".", ",");
     }
   
     if (estoqueInput) {
       estoqueInput.value = produto.estoque != null ? String(produto.estoque) : "0";
     }
   
     const idCat = produto.idCategoria ?? produto.id_categoria ?? produto.categoriaId ?? "";
     if (categoriaSelect) categoriaSelect.value = idCat || "";
   
     const imagemUrl = produto.imagemUrl || produto.imagem_principal || "";
     if (imagemInput) imagemInput.value = imagemUrl;
   
     if (ativoInput) ativoInput.checked = !!produto.ativo;
   
     if (imagemInput) imagemInput.dispatchEvent(new Event("change"));
   
     const modalEl = $("produtoModal");
     if (modalEl && typeof bootstrap !== "undefined" && bootstrap.Modal) {
       const instance = bootstrap.Modal.getOrCreateInstance(modalEl);
       instance.show();
     }
   }
   
   async function removerProduto(id) {
     if (!id) return;
     if (!window.confirm("Tem certeza que deseja remover este produto?")) return;
   
     const url = `${API}/produtos/${id}`;
   
     try {
       const resp = await fetch(url, {
         method: "DELETE",
         cache: "no-store",
         headers: {
           Authorization: `Bearer ${TOKEN_ATUAL}`,
           "Cache-Control": "no-cache",
           Pragma: "no-cache",
           "X-Debug-Build": BUILD_ID,
         },
       });
   
       const txt = await safeReadText(resp);
       let data = null;
       try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt }; }
   
       if (!resp.ok) {
         const msg = (data && data.message) || `Erro HTTP ${resp.status} ao remover produto.`;
         alert(msg);
   
         showDebugPanel({
           where: "removerProduto",
           url,
           status: resp.status,
           responseBody: data,
           build: BUILD_ID,
         });
         return;
       }
   
       PRODUTOS_VENDEDOR = (PRODUTOS_VENDEDOR || []).filter((p) => String(p.id) !== String(id));
       aplicarFiltrosEListagem();
     } catch (err) {
       console.error(err);
       alert("Erro de conexão ao remover produto.");
   
       showDebugPanel({
         where: "removerProduto catch",
         url,
         error: String(err),
         stack: err?.stack,
         build: BUILD_ID,
       });
     }
   }
   