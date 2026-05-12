function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function updateCatalogLink(slug) {
  const host = window.location.hostname;
  let url;
  if (slug) {
    // pages.dev y localhost siempre usan ?s= (no soportan subdominios)
    if (host.endsWith(".pages.dev") || host === "localhost" || host === "127.0.0.1") {
      url = `${window.location.origin}/index.html?s=${slug}`;
    } else {
      // Dominio personalizado: formato subdominio
      const parts = host.split(".");
      const rootDomain = parts.length >= 3 ? parts.slice(1).join(".") : host;
      url = `https://${slug}.${rootDomain}/`;
    }
  }

  const el = document.getElementById("catalogLink");
  if (el) el.textContent = url || "— ingresa un slug para ver tu enlace —";

  // Keep sidebar "Ver catálogo" link in sync
  const sidebarLink = document.querySelector('.nav-item[data-catalog]');
  if (sidebarLink && slug) {
    sidebarLink.href = `index.html?s=${slug}`;
  }
}

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
let currentImageUrls = [];
let currentPlan = 'free';

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
function renderImageGrid() {
  const grid = document.getElementById("imageGrid");
  if (currentImageUrls.length === 0) { grid.innerHTML = ""; return; }
  grid.innerHTML = currentImageUrls.map((url, i) => `
    <div class="image-thumb">
      <img src="${url}" alt="" />
      <button type="button" class="image-thumb-remove" onclick="removeImage(${i})" title="Eliminar">✕</button>
      ${i === 0 ? '<span class="thumb-primary-badge">Principal</span>' : ""}
    </div>
  `).join("");
}

function removeImage(index) {
  currentImageUrls.splice(index, 1);
  renderImageGrid();
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
  currentImageUrls.push(data.publicUrl);
  e.target.value = "";
  renderImageGrid();
  showToast("Imagen agregada ✓", "success");
});

// ===== AUTH =====
async function init() {
  // If URL has auth error in hash (e.g. expired OTP), go to login
  if (window.location.hash.includes('error=')) {
    history.replaceState({}, '', window.location.pathname);
    showLogin();
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (session) showApp(session.user);
  else showLogin();
}

function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('upgraded') === '1') {
    history.replaceState({}, '', window.location.pathname);
    showToast('¡Pago completado! Tu plan se actualizará en unos momentos.', 'success');
    setTimeout(() => loadSettings(), 4000);
  }
  if (params.get('page') === 'plan') {
    history.replaceState({}, '', window.location.pathname);
    document.querySelector('.nav-item[data-page="plan"]')?.click();
  }
  const checkoutPlan = params.get('checkout') || localStorage.getItem('pendingPlan');
  if (checkoutPlan && (checkoutPlan === 'starter' || checkoutPlan === 'pro')) {
    localStorage.removeItem('pendingPlan');
    history.replaceState({}, '', window.location.pathname);
    showToast(`Iniciando pago del plan ${checkoutPlan}…`);
    setTimeout(() => upgradePlan(checkoutPlan), 1500);
  }
}

function showLogin() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("adminApp").style.display = "none";
}

async function showApp(user) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminApp").style.display = "flex";
  document.getElementById("sidebarUser").textContent = user.email;

  // Create store from registration if email confirmation was required
  const pending = localStorage.getItem("pendingStore");
  if (pending) {
    const { name, slug, whatsapp } = JSON.parse(pending);
    const { data: existing } = await sb.from("stores").select("id").eq("user_id", user.id).maybeSingle();
    if (!existing) {
      await sb.from("stores").insert({ user_id: user.id, name, slug, whatsapp });
    }
    localStorage.removeItem("pendingStore");
  } else {
    // Check if user has a store at all; if not, send to registration
    const { data: existing } = await sb.from("stores").select("id").eq("user_id", user.id).maybeSingle();
    if (!existing) {
      await sb.auth.signOut();
      window.location.href = "register.html?error=no_store";
      return;
    }
  }

  loadProducts(user);
  loadSettings(user);
  initDesignUploads();
  initEmojiPicker();
  initGalleryUploads();
  handleUrlParams();
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
async function loadProducts(user) {
  if (!user) {
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) { showLogin(); return; }
    user = u;
  }
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
    enforcePlanLimits();
    return;
  }

  const rows = filtered.map((p) => `
    <tr>
      <td class="td-emoji">${(p.image_urls && p.image_urls.length > 0) ? `<img src="${p.image_urls[0]}" class="td-img" alt="" />` : p.image_url ? `<img src="${p.image_url}" class="td-img" alt="" />` : "📦"}</td>
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
  enforcePlanLimits();
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
  currentImageUrls = [];
  renderImageGrid();
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
  document.getElementById("pBadge").value = p.badge || "";
  document.getElementById("pAvailable").checked = p.available !== false;
  currentImageUrls = [...(p.image_urls || [])];
  if (!currentImageUrls.length && p.image_url) currentImageUrls = [p.image_url];
  renderImageGrid();

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

  // Verificar límite de plan antes de guardar
  const isNew = !document.getElementById("productId").value;
  const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;
  if (isNew && allProducts.length >= limits.maxProducts) {
    showToast(`Límite de ${limits.maxProducts} productos alcanzado. Actualiza tu plan para agregar más.`, 'error');
    return;
  }

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
    badge: document.getElementById("pBadge").value || null,
    available: document.getElementById("pAvailable").checked,
    sizes,
    image_urls: currentImageUrls,
    image_url: currentImageUrls[0] || null,
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
async function loadSettings(user) {
  if (!user) {
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) { showLogin(); return; }
    user = u;
  }
  const { data } = await sb.from("stores").select("*").eq("user_id", user.id).single();

  // Set slug URL prefix: subdomain format on platform, ?s= param locally
  const host = window.location.hostname;
  const parts = host.split(".");
  const rootDomain = parts.length >= 3 ? parts.slice(1).join(".") : host;
  const slugPrefixEl = document.getElementById("slugPrefix");
  if (slugPrefixEl) slugPrefixEl.textContent = parts.length >= 2 ? `https://` : window.location.origin + "/index.html?s=";

  if (!data) {
    currentPlan = 'free';
    loadPlanPage();
    return;
  }

  if (data) {
    storeSettings = data;
    document.getElementById("storeName").value = data.name || "";
    document.getElementById("storeSlug").value = data.slug || "";
    updateCatalogLink(data.slug || "");
    document.getElementById("storeWhatsapp").value = data.whatsapp || "";
    document.getElementById("storeWaMessage").value = data.wa_message || "";
    document.getElementById("storeDesc").value = data.description || "";
    document.getElementById("storeAccent").value = data.accent_color || "#e94560";
    document.getElementById("storeAccentHex").textContent = data.accent_color || "#e94560";
    document.getElementById("storeHeroBadge").value = data.hero_badge || "";
    document.getElementById("storeHeroTitle").value = data.hero_title || "";
    document.getElementById("storeHeroSubtitle").value = data.hero_subtitle || "";
    document.getElementById("catalogTitle").value = data.catalog_title || "";
    document.getElementById("catalogSubtitle").value = data.catalog_subtitle || "";
    document.getElementById("ctaTitle").value = data.cta_title || "";
    document.getElementById("ctaDesc").value = data.cta_desc || "";
    document.getElementById("storeLogoUrl").value = data.logo_url || "";
    document.getElementById("storeHeroImageUrl").value = data.hero_image_url || "";
    document.getElementById("aboutTitle").value = data.about_title || "";
    document.getElementById("about1Icon").value = data.about1_icon || "";
    document.getElementById("about1Title").value = data.about1_title || "";
    document.getElementById("about1Desc").value = data.about1_desc || "";
    document.getElementById("about2Icon").value = data.about2_icon || "";
    document.getElementById("about2Title").value = data.about2_title || "";
    document.getElementById("about2Desc").value = data.about2_desc || "";
    document.getElementById("about3Icon").value = data.about3_icon || "";
    document.getElementById("about3Title").value = data.about3_title || "";
    document.getElementById("about3Desc").value = data.about3_desc || "";
    document.getElementById("about4Icon").value = data.about4_icon || "";
    document.getElementById("about4Title").value = data.about4_title || "";
    document.getElementById("about4Desc").value = data.about4_desc || "";
    document.getElementById("stat1Value").value = data.stat1_value || "";
    document.getElementById("stat1Label").value = data.stat1_label || "";
    document.getElementById("stat2Value").value = data.stat2_value || "";
    document.getElementById("stat2Label").value = data.stat2_label || "";
    document.getElementById("stat3Value").value = data.stat3_value || "";
    document.getElementById("stat3Label").value = data.stat3_label || "";
    document.getElementById("stat4Value").value = data.stat4_value || "";
    document.getElementById("stat4Label").value = data.stat4_label || "";

    if (data.logo_url) {
      const container = document.getElementById("logoPreviewContainer");
      container.innerHTML = `<img src="${data.logo_url}" style="max-height:56px;max-width:100%;object-fit:contain;border-radius:4px;" />`;
    }
    if (data.hero_image_url) {
      const container = document.getElementById("heroPreviewContainer");
      container.innerHTML = `<img src="${data.hero_image_url}" style="max-height:56px;max-width:100%;object-fit:cover;border-radius:4px;" />`;
    }

    customCategories = data.custom_categories || [];
    document.getElementById("showGallery").checked = data.show_gallery || false;
    document.getElementById("gallery1Img").value = data.gallery1_img || "";
    document.getElementById("gallery1Title").value = data.gallery1_title || "";
    document.getElementById("gallery2Img").value = data.gallery2_img || "";
    document.getElementById("gallery2Title").value = data.gallery2_title || "";
    document.getElementById("gallery3Img").value = data.gallery3_img || "";
    document.getElementById("gallery3Title").value = data.gallery3_title || "";
    document.getElementById("gallery4Img").value = data.gallery4_img || "";
    document.getElementById("gallery4Title").value = data.gallery4_title || "";
    // Update gallery previews
    [1,2,3,4].forEach((n) => {
      const url = data[`gallery${n}_img`];
      if (url) {
        const preview = document.getElementById(`galleryPreview${n}`);
        if (preview) preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`;
      }
    });
    // Update emoji buttons
    [1,2,3,4].forEach((n) => {
      const icon = data[`about${n}_icon`];
      if (icon) {
        const btn = document.getElementById(`emojiBtn${n}`);
        if (btn) btn.textContent = icon;
      }
    });
    populateCategorySelects();
    renderCustomCategories();
    updateSettingsPreview();
    currentPlan = data.plan || 'free';
    loadPlanPage();
    enforcePlanLimits();
  }
}

const PLAN_LIMITS = {
  free:    { maxProducts: 5,  features: [] },
  starter: { maxProducts: 50, features: ['logo','color','categories','gallery','about','stats','waMessage','heroExtras'] },
  pro:     { maxProducts: Infinity, features: ['logo','color','categories','gallery','about','stats','waMessage','heroExtras'] },
};

function enforcePlanLimits() {
  const plan = currentPlan;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const isPaid = plan === 'starter' || plan === 'pro';

  // Actualizar contador de productos con límite
  const countEl = document.getElementById("productCount");
  if (countEl) {
    const max = limits.maxProducts === Infinity ? '∞' : limits.maxProducts;
    countEl.textContent = `${allProducts.length} / ${max} productos`;
  }

  // Bloquear botón "Agregar producto" si se llegó al límite
  const addBtn = document.getElementById("btnAddProduct");
  if (addBtn) {
    const atLimit = allProducts.length >= limits.maxProducts;
    addBtn.disabled = atLimit;
    addBtn.title = atLimit ? `Límite de ${limits.maxProducts} productos en plan ${plan}. Actualiza tu plan para agregar más.` : '';
    if (atLimit) {
      addBtn.textContent = `Límite alcanzado (${limits.maxProducts})`;
    } else {
      addBtn.textContent = '+ Agregar producto';
    }
  }

  // Secciones bloqueadas en free: logo, color, mensaje WA, hero extras, categorías, galería, about, stats
  const lockedSections = [
    { id: 'logoUploadArea',    feature: 'logo' },
    { id: 'heroUploadArea',    feature: 'heroExtras' },
    { id: 'storeAccent',       feature: 'color' },
    { id: 'storeWaMessage',    feature: 'waMessage' },
    { id: 'storeHeroBadge',    feature: 'heroExtras' },
    { id: 'storeHeroSubtitle', feature: 'heroExtras' },
    { id: 'customCategoriesList', feature: 'categories' },
    { id: 'newCategoryInput',  feature: 'categories' },
    { id: 'btnAddCategory',    feature: 'categories' },
    { id: 'showGallery',       feature: 'gallery' },
    { id: 'galleryUpload1',    feature: 'gallery' },
    { id: 'galleryUpload2',    feature: 'gallery' },
    { id: 'galleryUpload3',    feature: 'gallery' },
    { id: 'galleryUpload4',    feature: 'gallery' },
    { id: 'gallery1Title',     feature: 'gallery' },
    { id: 'gallery2Title',     feature: 'gallery' },
    { id: 'gallery3Title',     feature: 'gallery' },
    { id: 'gallery4Title',     feature: 'gallery' },
    { id: 'about1Title',       feature: 'about' },
    { id: 'about2Title',       feature: 'about' },
    { id: 'about3Title',       feature: 'about' },
    { id: 'about4Title',       feature: 'about' },
    { id: 'stat1Value',        feature: 'stats' },
    { id: 'stat2Value',        feature: 'stats' },
    { id: 'stat3Value',        feature: 'stats' },
    { id: 'stat4Value',        feature: 'stats' },
  ];

  lockedSections.forEach(({ id, feature }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const locked = !isPaid;
    el.disabled = locked;
    if (locked) {
      el.classList.add('plan-locked');
      el.title = 'Disponible en plan Starter o Pro';
    } else {
      el.classList.remove('plan-locked');
      el.title = '';
    }
  });

  // Mostrar/ocultar banners de upgrade en settings cards que tienen features bloqueadas
  applyLockOverlays(isPaid);
}

function applyLockOverlays(isPaid) {
  // Secciones completas que mostrar con overlay de candado si es free
  const lockedCards = [
    'settingsCardLogo',
    'settingsCardColor',
    'settingsCardAbout',
    'settingsCardStats',
    'settingsCardGallery',
  ];

  lockedCards.forEach(id => {
    const card = document.getElementById(id);
    if (!card) return;
    let overlay = card.querySelector('.plan-lock-overlay');
    if (!isPaid) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'plan-lock-overlay';
        overlay.innerHTML = `<span>🔒</span><p>Disponible en <strong>Starter</strong> o <strong>Pro</strong></p><a href="#" class="plan-lock-btn" onclick="document.querySelector('.nav-item[data-page=plan]').click();return false;">Ver planes →</a>`;
        card.style.position = 'relative';
        card.appendChild(overlay);
      }
      overlay.style.display = 'flex';
    } else {
      if (overlay) overlay.style.display = 'none';
    }
  });
}

function updateSettingsPreview() {
  const name = document.getElementById("storeName").value || "Mi tienda";
  const color = document.getElementById("storeAccent").value;
  document.getElementById("previewName").textContent = name;
  document.getElementById("previewHeader").style.background = color;
}

document.getElementById("storeName").addEventListener("input", updateSettingsPreview);
document.getElementById("storeSlug").addEventListener("input", (e) => {
  updateCatalogLink(slugify(e.target.value));
});
document.getElementById("storeAccent").addEventListener("input", (e) => {
  document.getElementById("storeAccentHex").textContent = e.target.value;
  updateSettingsPreview();
});

document.getElementById("btnSaveSettings").addEventListener("click", async () => {
  const { data: { user } } = await sb.auth.getUser();
  const btn = document.getElementById("btnSaveSettings");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  const rawSlug = document.getElementById("storeSlug").value.trim();
  const slug = slugify(rawSlug);
  document.getElementById("storeSlug").value = slug;

  const payload = {
    user_id: user.id,
    name: document.getElementById("storeName").value.trim(),
    slug: slug || null,
    whatsapp: document.getElementById("storeWhatsapp").value.trim(),
    wa_message: document.getElementById("storeWaMessage").value.trim() || null,
    description: document.getElementById("storeDesc").value.trim(),
    accent_color: document.getElementById("storeAccent").value,
    custom_categories: customCategories,
    show_gallery: document.getElementById("showGallery").checked,
    gallery1_img: document.getElementById("gallery1Img").value || null,
    gallery1_title: document.getElementById("gallery1Title").value.trim() || null,
    gallery2_img: document.getElementById("gallery2Img").value || null,
    gallery2_title: document.getElementById("gallery2Title").value.trim() || null,
    gallery3_img: document.getElementById("gallery3Img").value || null,
    gallery3_title: document.getElementById("gallery3Title").value.trim() || null,
    gallery4_img: document.getElementById("gallery4Img").value || null,
    gallery4_title: document.getElementById("gallery4Title").value.trim() || null,
  };

  // Only include design columns if they already exist in the DB (migration ran)
  // or if the user has entered a value in the field.
  const designCols = {
    hero_badge: document.getElementById("storeHeroBadge").value.trim() || null,
    hero_title: document.getElementById("storeHeroTitle").value.trim() || null,
    hero_subtitle: document.getElementById("storeHeroSubtitle").value.trim() || null,
    logo_url: document.getElementById("storeLogoUrl").value.trim() || null,
    hero_image_url: document.getElementById("storeHeroImageUrl").value.trim() || null,
    catalog_title: document.getElementById("catalogTitle").value.trim() || null,
    catalog_subtitle: document.getElementById("catalogSubtitle").value.trim() || null,
    cta_title: document.getElementById("ctaTitle").value.trim() || null,
    cta_desc: document.getElementById("ctaDesc").value.trim() || null,
  };
  const colsExistInDb = "hero_image_url" in storeSettings;
  Object.entries(designCols).forEach(([key, val]) => {
    if (colsExistInDb || val) payload[key] = val;
  });

  const statCols = {
    stat1_value: document.getElementById("stat1Value").value.trim() || null,
    stat1_label: document.getElementById("stat1Label").value.trim() || null,
    stat2_value: document.getElementById("stat2Value").value.trim() || null,
    stat2_label: document.getElementById("stat2Label").value.trim() || null,
    stat3_value: document.getElementById("stat3Value").value.trim() || null,
    stat3_label: document.getElementById("stat3Label").value.trim() || null,
    stat4_value: document.getElementById("stat4Value").value.trim() || null,
    stat4_label: document.getElementById("stat4Label").value.trim() || null,
  };
  const statColsExistInDb = "stat1_value" in storeSettings;
  Object.entries(statCols).forEach(([key, val]) => {
    if (statColsExistInDb || val) payload[key] = val;
  });

  const aboutCols = {
    about_title: document.getElementById("aboutTitle").value.trim() || null,
    about1_icon: document.getElementById("about1Icon").value.trim() || null,
    about1_title: document.getElementById("about1Title").value.trim() || null,
    about1_desc: document.getElementById("about1Desc").value.trim() || null,
    about2_icon: document.getElementById("about2Icon").value.trim() || null,
    about2_title: document.getElementById("about2Title").value.trim() || null,
    about2_desc: document.getElementById("about2Desc").value.trim() || null,
    about3_icon: document.getElementById("about3Icon").value.trim() || null,
    about3_title: document.getElementById("about3Title").value.trim() || null,
    about3_desc: document.getElementById("about3Desc").value.trim() || null,
    about4_icon: document.getElementById("about4Icon").value.trim() || null,
    about4_title: document.getElementById("about4Title").value.trim() || null,
    about4_desc: document.getElementById("about4Desc").value.trim() || null,
  };
  const aboutColsExistInDb = "about_title" in storeSettings;
  Object.entries(aboutCols).forEach(([key, val]) => {
    if (aboutColsExistInDb || val) payload[key] = val;
  });

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

// ===== DESIGN UPLOADS =====
function initDesignUploads() {
  const logoArea = document.getElementById("logoUploadArea");
  const logoInput = document.getElementById("logoImageInput");
  const heroArea = document.getElementById("heroUploadArea");
  const heroInput = document.getElementById("heroImageInput");

  if (logoArea) logoArea.addEventListener("click", () => logoInput.click());
  if (heroArea) heroArea.addEventListener("click", () => heroInput.click());

  if (logoInput) {
    logoInput.addEventListener("change", async (e) => {
      await uploadDesignImage(e.target.files[0], "logo", "storeLogoUrl", "logoPreviewContainer");
      e.target.value = "";
    });
  }

  if (heroInput) {
    heroInput.addEventListener("change", async (e) => {
      await uploadDesignImage(e.target.files[0], "hero", "storeHeroImageUrl", "heroPreviewContainer");
      e.target.value = "";
    });
  }
}

function initEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  if (!picker) return;
  let currentTarget = null;

  // Split emoji text into clickable spans
  const grid = picker.querySelector(".emoji-grid");
  if (grid) {
    const emojis = grid.textContent.trim().split(/\s+/);
    grid.innerHTML = emojis.map(e => `<span class="emoji-opt">${e}</span>`).join("");
  }

  document.querySelectorAll(".emoji-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      currentTarget = btn.dataset.target;
      const rect = btn.getBoundingClientRect();
      picker.style.display = "block";
      picker.style.position = "fixed";
      picker.style.top = (rect.bottom + 6) + "px";
      picker.style.left = Math.min(rect.left, window.innerWidth - 290) + "px";
    });
  });

  if (grid) {
    grid.addEventListener("click", (e) => {
      if (!e.target.classList.contains("emoji-opt")) return;
      const emoji = e.target.textContent;
      if (currentTarget) {
        document.getElementById(currentTarget).value = emoji;
        const num = currentTarget.replace("about", "").replace("Icon", "");
        const btn = document.getElementById("emojiBtn" + num);
        if (btn) btn.textContent = emoji;
      }
      picker.style.display = "none";
      currentTarget = null;
    });
  }

  document.addEventListener("click", (e) => {
    if (!picker.contains(e.target) && !e.target.classList.contains("emoji-trigger")) {
      picker.style.display = "none";
    }
  });
}

function initGalleryUploads() {
  [1, 2, 3, 4].forEach((n) => {
    const uploadArea = document.getElementById(`galleryUpload${n}`);
    const fileInput = document.getElementById(`galleryFile${n}`);
    if (uploadArea) uploadArea.addEventListener("click", () => fileInput.click());
    if (fileInput) {
      fileInput.addEventListener("change", async (e) => {
        await uploadDesignImage(e.target.files[0], `gallery${n}`, `gallery${n}Img`, `galleryPreview${n}`);
        e.target.value = "";
      });
    }
  });
}

async function uploadDesignImage(file, type, urlFieldId, previewId) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast("La imagen no puede superar 2MB", "error"); return; }
  const { data: { user } } = await sb.auth.getUser();
  const ext = file.name.split(".").pop();
  const path = `${user.id}/design-${type}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("product-images").upload(path, file, { upsert: true });
  if (error) { showToast("Error al subir imagen: " + error.message, "error"); return; }
  const { data } = sb.storage.from("product-images").getPublicUrl(path);
  document.getElementById(urlFieldId).value = data.publicUrl;
  const container = document.getElementById(previewId);
  if (container) {
    const isHero = type === "hero";
    container.innerHTML = `<img src="${data.publicUrl}" style="max-height:56px;max-width:100%;object-fit:${isHero ? "cover" : "contain"};border-radius:4px;" />`;
  }
  showToast("Imagen subida ✓", "success");
}

// ===== PLAN PAGE =====
function loadPlanPage() {
  const el = document.getElementById('planContent');
  if (!el) return;

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: '/ siempre gratis',
      features: [
        'Hasta 5 productos',
        'Catálogo digital público',
        'Pedidos por WhatsApp',
      ],
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$5',
      period: '/ mes',
      features: [
        'Hasta 50 productos',
        'Sin sello ProductSpot',
        'Logo y color de marca',
        'Categorías personalizadas',
        'Galería de imágenes',
        'Sección "¿Por qué nosotros?"',
        'Estadísticas del catálogo',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$10',
      period: '/ mes',
      features: [
        'Productos ilimitados',
        'Todo lo del plan Starter',
        'Soporte prioritario por WhatsApp',
      ],
    },
  ];

  const cards = plans.map(p => {
    const isCurrent = currentPlan === p.id;
    const isHigher  = (p.id === 'pro' && currentPlan === 'starter') ||
                      (p.id === 'starter' && currentPlan === 'free') ||
                      (p.id === 'pro' && currentPlan === 'free');

    let btn = '';
    if (isCurrent) {
      btn = `<button class="btn-plan-upgrade muted" disabled>Plan actual</button>`;
    } else if (isHigher) {
      btn = `<button class="btn-plan-upgrade primary" onclick="upgradePlan('${p.id}')">Actualizar a ${p.name}</button>`;
    } else {
      btn = `<button class="btn-plan-upgrade outline" onclick="upgradePlan('${p.id}')">Cambiar a ${p.name}</button>`;
    }

    return `
      <div class="plan-card-box ${isCurrent ? 'current' : ''}">
        ${isCurrent ? '<span class="plan-current-badge">Plan actual</span>' : ''}
        <div class="plan-name">${p.name}</div>
        <div class="plan-price-row"><strong>${p.price}</strong><span> ${p.period}</span></div>
        <ul class="plan-features">
          ${p.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        ${btn}
      </div>`;
  }).join('');

  const manageLink = currentPlan !== 'free'
    ? `<p class="plan-manage-link">¿Necesitas cancelar o cambiar tu método de pago? <a href="#" onclick="openBillingPortal();return false;">Administrar en PayPal →</a></p>`
    : '';

  el.innerHTML = `<div class="plan-grid">${cards}</div>${manageLink}`;
}

async function upgradePlan(plan) {
  showToast('Redirigiendo a PayPal…');
  const { data, error } = await sb.functions.invoke('create-paypal-subscription', {
    body: { type: 'checkout', plan },
  });
  if (error || !data?.url) {
    showToast('Error al iniciar el pago: ' + (error?.message || 'sin URL'), 'error');
    return;
  }
  window.location.href = data.url;
}

async function openBillingPortal() {
  showToast('Abriendo PayPal…');
  const { data, error } = await sb.functions.invoke('create-paypal-subscription', {
    body: { type: 'portal' },
  });
  if (error || !data?.url) {
    showToast('Error al abrir el portal: ' + (error?.message || 'sin URL'), 'error');
    return;
  }
  window.location.href = data.url;
}

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
