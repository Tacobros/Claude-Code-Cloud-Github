const DEFAULT_CATEGORIES = {
  laliga: "LaLiga",
  premier: "Premier League",
  ligue1: "Ligue 1",
  selecciones: "Selecciones",
  local: "Liga Nacional",
};

let allProducts = [];
let deleteTargetId = null;
let storeSettings = {};
let customCategories = [];
let currentImageUrl = null;

function getCategoryLabel(cat) {
  return DEFAULT_CATEGORIES[cat] || cat;
}

function populateCategorySelects() {
  const customOptions = customCategories.map(
    (c) => `<option value="${c}">${c}</option>`
  ).join("");

  const pCat = document.getElementById("pCategory");
  [...pCat.options].filter((o) => !DEFAULT_CATEGORIES[o.value] && o.value !== "").forEach((o) => o.remove());
  pCat.insertAdjacentHTML("beforeend", customOptions);

  const filterSel = document.getElementById("adminFilter");
  const defaultFilterOptions = `
    <option value="all">Todas las categorías</option>
    ${Object.entries(DEFAULT_CATEGORIES).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}
  `;
  filterSel.innerHTML = defaultFilterOptions + customOptions;
}

// ===== IMAGE UPLOAD =====
function setImagePreview(url) {
  const preview = document.getElementById("imagePreview");
  const placeholder = document.getElementById("imageUploadPlaceholder");
  const removeBtn = document.getElementById("btnRemoveImage");
  if (url) {
    preview.src = url;
    preview.style.display = "block";
    placeholder.style.display = "none";
    removeBtn.style.display = "inline-block";
    currentImageUrl = url;
  } else {
    preview.src = "";
    preview.style.display = "none";
    placeholder.style.display = "flex";
    removeBtn.style.display = "none";
    currentImageUrl = null;
  }
}

document.getElementById("imageUploadArea").addEventListener("click", () => {
  document.getElementById("pImage").click();
});

document.getElementById("pImage").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast("La imagen no puede superar 2MB", "error");
    return;
  }
  const { data: { user } } = await sb.auth.getUser();
  const ext = file.name.split(".").pop();
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("product-images").upload(path, file, { upsert: true });
  if (error) { showToast("Error al subir imagen: " + error.message, "error"); return; }
  const { data } = sb.storage.from("product-images").getPublicUrl(path);
  setImagePreview(data.publicUrl);
  showToast("Imagen subida ✓", "success");
});

document.getElementById("btnRemoveImage").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("pImage").value = "";
  setImagePreview(null);
});

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
      <td class="td-emoji">${p.image_url ? `<img src="${p.image_url}" class="td-img" alt="" />` : (p.emoji || "📦")}</td>
      <td class="td-name">
        <strong>${p.name}</strong>
        <small>Q${p.price} GTQ · ${(p.sizes || []).join(", ")}</small>
      </td>
      <td><span class="badge badge-${p.category}">${getCategoryLabel(p.category)}</span></td>
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
  setImagePreview(null);
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
  setImagePreview(p.image_url || null);

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
    image_url: currentImageUrl,
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
    customCategories = data.custom_categories || [];
    populateCategorySelects();
    renderCustomCategories();
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
    custom_categories: customCategories,
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

// ===== CUSTOM CATEGORIES =====
function renderCustomCategories() {
  const list = document.getElementById("customCategoriesList");
  if (customCategories.length === 0) {
    list.innerHTML = `<p class="hint" style="margin:0">Aún no tienes categorías personalizadas.</p>`;
    return;
  }
  list.innerHTML = customCategories.map((c, i) => `
    <span class="category-chip">
      ${c}
      <button type="button" onclick="removeCategory(${i})" title="Eliminar">✕</button>
    </span>
  `).join("");
}

function removeCategory(index) {
  customCategories.splice(index, 1);
  renderCustomCategories();
  populateCategorySelects();
}

document.getElementById("btnAddCategory").addEventListener("click", () => {
  const input = document.getElementById("newCategoryInput");
  const name = input.value.trim();
  if (!name) return;
  if (customCategories.includes(name) || Object.values(DEFAULT_CATEGORIES).includes(name)) {
    showToast("Esa categoría ya existe", "error");
    return;
  }
  customCategories.push(name);
  input.value = "";
  renderCustomCategories();
  populateCategorySelects();
});

document.getElementById("newCategoryInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("btnAddCategory").click(); }
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
