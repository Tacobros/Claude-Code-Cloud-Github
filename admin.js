const categoryLabels = {
  laliga: "LaLiga",
  premier: "Premier League",
  ligue1: "Ligue 1",
  selecciones: "Selecciones",
  local: "Liga Nacional",
};

let allProducts = [];
let deleteTargetId = null;
let storeSettings = {};

// ===== AUTH =====
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) showApp(session.user);
  else showLogin();
}

function showLogin() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("adminApp").style.display = "none";
}

function showApp(user) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminApp").style.display = "flex";
  document.getElementById("sidebarUser").textContent = user.email;
  loadProducts();
  loadSettings();
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  const err = document.getElementById("loginError");
  err.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Entrando...";

  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPassword").value;

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });

  if (error) {
    err.textContent = "Correo o contraseña incorrectos";
    err.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Entrar";
  } else {
    showApp(data.user);
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await sb.auth.signOut();
  showLogin();
});

// ===== NAVIGATION =====
document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    item.classList.add("active");
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.getElementById(`page${page.charAt(0).toUpperCase() + page.slice(1)}`).classList.add("active");
    document.getElementById("topbarTitle").textContent = item.querySelector("span:last-child").textContent;
    closeSidebar();
  });
});

document.getElementById("sidebarToggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
}

// ===== PRODUCTS =====
async function loadProducts() {
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("productsTable").innerHTML = `<div class="loading">Error al cargar: ${error.message}</div>`;
    return;
  }

  allProducts = data || [];
  renderTable();
}

function renderTable() {
  const search = document.getElementById("adminSearch").value.toLowerCase();
  const cat = document.getElementById("adminFilter").value;

  const filtered = allProducts.filter((p) => {
    const matchCat = cat === "all" || p.category === cat;
    const matchSearch = !search || p.name.toLowerCase().includes(search) || (p.description || "").toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  const countEl = document.getElementById("productCount");
  countEl.textContent = `${allProducts.length} productos en tu catálogo`;

  if (filtered.length === 0) {
    document.getElementById("productsTable").innerHTML = `<div class="loading">No se encontraron productos.</div>`;
    return;
  }

  const rows = filtered.map((p) => `
    <tr>
      <td class="td-emoji">${p.emoji || "📦"}</td>
      <td class="td-name">
        <strong>${p.name}</strong>
        <small>Q${p.price} GTQ · ${(p.sizes || []).join(", ")}</small>
      </td>
      <td><span class="badge badge-${p.category}">${categoryLabels[p.category] || p.category}</span></td>
      <td class="${p.available ? 'status-on' : 'status-off'}">${p.available ? "✓ Visible" : "✗ Oculto"}</td>
      <td class="td-actions">
        <button class="btn-edit" onclick="openEditModal(${p.id})">Editar</button>
        <button class="btn-delete" onclick="askDelete(${p.id})">Eliminar</button>
      </td>
    </tr>
  `).join("");

  document.getElementById("productsTable").innerHTML = `
    <table>
      <thead>
        <tr>
          <th style="width:52px"></th>
          <th>Producto</th>
          <th>Liga</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

document.getElementById("adminSearch").addEventListener("input", renderTable);
document.getElementById("adminFilter").addEventListener("change", renderTable);

// ===== PRODUCT FORM MODAL =====
function openAddModal() {
  document.getElementById("productModalTitle").textContent = "Nuevo producto";
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("pAvailable").checked = true;
  document.getElementById("formError").style.display = "none";
  document.getElementById("productModalOverlay").classList.add("open");
}

function openEditModal(id) {
  const p = allProducts.find((x) => x.id === id);
  if (!p) return;

  document.getElementById("productModalTitle").textContent = "Editar producto";
  document.getElementById("productId").value = p.id;
  document.getElementById("pName").value = p.name || "";
  document.getElementById("pCategory").value = p.category || "";
  document.getElementById("pPrice").value = p.price || "";
  document.getElementById("pDesc").value = p.description || "";
  document.getElementById("pEmoji").value = p.emoji || "";
  document.getElementById("pBadge").value = p.badge || "";
  document.getElementById("pAvailable").checked = p.available !== false;

  document.querySelectorAll(".size-toggle input").forEach((cb) => {
    cb.checked = (p.sizes || []).includes(cb.value);
  });

  document.getElementById("formError").style.display = "none";
  document.getElementById("productModalOverlay").classList.add("open");
}

function closeProductModal() {
  document.getElementById("productModalOverlay").classList.remove("open");
}

document.getElementById("btnAddProduct").addEventListener("click", openAddModal);
document.getElementById("productModalClose").addEventListener("click", closeProductModal);
document.getElementById("cancelProductBtn").addEventListener("click", closeProductModal);
document.getElementById("productModalOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("productModalOverlay")) closeProductModal();
});

document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("saveProductBtn");
  const err = document.getElementById("formError");
  err.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Guardando...";

  const sizes = [...document.querySelectorAll(".size-toggle input:checked")].map((cb) => cb.value);

  const payload = {
    name: document.getElementById("pName").value.trim(),
    category: document.getElementById("pCategory").value,
    price: parseInt(document.getElementById("pPrice").value),
    description: document.getElementById("pDesc").value.trim(),
    emoji: document.getElementById("pEmoji").value.trim() || "⚽",
    badge: document.getElementById("pBadge").value || null,
    available: document.getElementById("pAvailable").checked,
    sizes,
  };

  const id = document.getElementById("productId").value;
  let error;

  if (id) {
    const res = await sb.from("products").update(payload).eq("id", id);
    error = res.error;
  } else {
    const { data: { user } } = await sb.auth.getUser();
    const res = await sb.from("products").insert({ ...payload, user_id: user.id });
    error = res.error;
  }

  btn.disabled = false;
  btn.textContent = "Guardar producto";

  if (error) {
    err.textContent = "Error al guardar: " + error.message;
    err.style.display = "block";
    return;
  }

  closeProductModal();
  showToast(id ? "Producto actualizado ✓" : "Producto agregado ✓", "success");
  loadProducts();
});

// ===== DELETE =====
function askDelete(id) {
  deleteTargetId = id;
  document.getElementById("deleteOverlay").classList.add("open");
}

document.getElementById("cancelDelete").addEventListener("click", () => {
  deleteTargetId = null;
  document.getElementById("deleteOverlay").classList.remove("open");
});

document.getElementById("confirmDelete").addEventListener("click", async () => {
  if (!deleteTargetId) return;
  document.getElementById("deleteOverlay").classList.remove("open");
  const { error } = await sb.from("products").delete().eq("id", deleteTargetId);
  deleteTargetId = null;
  if (error) { showToast("Error al eliminar", "error"); return; }
  showToast("Producto eliminado", "success");
  loadProducts();
});

// ===== SETTINGS =====
async function loadSettings() {
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from("stores").select("*").eq("user_id", user.id).single();

  if (data) {
    storeSettings = data;
    document.getElementById("storeName").value = data.name || "";
    document.getElementById("storeWhatsapp").value = data.whatsapp || "";
    document.getElementById("storeDesc").value = data.description || "";
    document.getElementById("storeEmoji").value = data.emoji || "⚽";
    document.getElementById("storeAccent").value = data.accent_color || "#e94560";
    document.getElementById("storeAccentHex").textContent = data.accent_color || "#e94560";
    updateSettingsPreview();
  }
}

function updateSettingsPreview() {
  const name = document.getElementById("storeName").value || "Mi tienda";
  const emoji = document.getElementById("storeEmoji").value || "⚽";
  const color = document.getElementById("storeAccent").value;
  document.getElementById("previewName").textContent = name;
  document.getElementById("previewEmoji").textContent = emoji;
  document.getElementById("previewHeader").style.background = color;
}

document.getElementById("storeName").addEventListener("input", updateSettingsPreview);
document.getElementById("storeEmoji").addEventListener("input", updateSettingsPreview);
document.getElementById("storeAccent").addEventListener("input", (e) => {
  document.getElementById("storeAccentHex").textContent = e.target.value;
  updateSettingsPreview();
});

document.getElementById("btnSaveSettings").addEventListener("click", async () => {
  const { data: { user } } = await sb.auth.getUser();
  const btn = document.getElementById("btnSaveSettings");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  const payload = {
    user_id: user.id,
    name: document.getElementById("storeName").value.trim(),
    whatsapp: document.getElementById("storeWhatsapp").value.trim(),
    description: document.getElementById("storeDesc").value.trim(),
    emoji: document.getElementById("storeEmoji").value.trim() || "⚽",
    accent_color: document.getElementById("storeAccent").value,
  };

  const { error } = storeSettings?.id
    ? await sb.from("stores").update(payload).eq("id", storeSettings.id)
    : await sb.from("stores").insert(payload);

  btn.disabled = false;
  btn.textContent = "Guardar cambios";

  if (error) { showToast("Error al guardar: " + error.message, "error"); return; }
  showToast("Configuración guardada ✓", "success");
  loadSettings();
});

document.getElementById("btnCopyLink").addEventListener("click", () => {
  const link = document.getElementById("catalogLink").textContent;
  navigator.clipboard.writeText(link).then(() => showToast("Enlace copiado ✓", "success"));
});

// ===== TOAST =====
function showToast(msg, type = "") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ===== KEYBOARD =====
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeProductModal();
    document.getElementById("deleteOverlay").classList.remove("open");
  }
});

init();
