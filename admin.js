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
  if (typeof initCatalogQR === "function") initCatalogQR();

  // Keep sidebar "Ver catálogo" link in sync
  const sidebarLink = document.querySelector('.nav-item[data-catalog]');
  if (sidebarLink && slug) {
    sidebarLink.href = `index.html?s=${slug}`;
  }
}

// Etiquetas para valores antiguos guardados cuando las categorías venían fijas;
// las tiendas nuevas usan solo sus categorías personalizadas.
const LEGACY_CATEGORY_LABELS = {
  laliga: "LaLiga",
  premier: "Premier League",
  ligue1: "Ligue 1",
  selecciones: "Selecciones",
  local: "Liga Nacional",
};

// Escapa texto proveniente de la BD antes de insertarlo con innerHTML
function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CURRENCY_SYMBOLS = {
  GTQ: "Q", USD: "$", MXN: "$", HNL: "L", NIO: "C$", CRC: "₡",
  PAB: "B/.", DOP: "RD$", COP: "$", PEN: "S/", CLP: "$", ARS: "$",
  BOB: "Bs", UYU: "$U", PYG: "₲", BRL: "R$", EUR: "€",
};
function storeCurrencyCode() {
  return storeSettings?.currency || "GTQ";
}
function currencySymbol() {
  return CURRENCY_SYMBOLS[storeCurrencyCode()] || "";
}

// Columnas de `stores` legibles desde el navegador (deben coincidir con
// el GRANT de 006_secure_stores_and_currency.sql — select("*") ya no funciona)
const STORE_COLS = `id, user_id, name, slug, whatsapp, wa_message, description,
  plan, status, currency, accent_color, logo_url, payment_methods,
  hero_badge, hero_title, hero_subtitle, hero_image_url,
  catalog_title, catalog_subtitle, cta_title, cta_desc,
  custom_categories, show_gallery,
  gallery1_img, gallery1_title, gallery2_img, gallery2_title,
  gallery3_img, gallery3_title, gallery4_img, gallery4_title,
  about_title, about1_icon, about1_title, about1_desc,
  about2_icon, about2_title, about2_desc,
  about3_icon, about3_title, about3_desc,
  about4_icon, about4_title, about4_desc,
  stat1_value, stat1_label, stat2_value, stat2_label,
  stat3_value, stat3_label, stat4_value, stat4_label`;

let allProducts = [];
let deleteTargetId = null;
let storeSettings = {};
let customCategories = [];
let currentImageUrls = [];
let currentPlan = 'free';

function getCategoryLabel(cat) {
  return LEGACY_CATEGORY_LABELS[cat] || cat;
}

function populateCategorySelects() {
  const customOptions = customCategories.map(
    (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
  ).join("");

  const pCat = document.getElementById("pCategory");
  [...pCat.options].filter((o) => o.value !== "").forEach((o) => o.remove());
  pCat.insertAdjacentHTML("beforeend", customOptions);

  const filterSel = document.getElementById("adminFilter");
  filterSel.innerHTML = `<option value="all">Todas las categorías</option>` + customOptions;
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
  // Password recovery redirect: hash contains type=recovery
  const hash = window.location.hash;
  if (hash.includes('type=recovery')) {
    history.replaceState({}, '', window.location.pathname);
    showLoginPanel('reset');
    return;
  }
  // Auth error in hash (e.g. expired OTP)
  if (hash.includes('error=')) {
    history.replaceState({}, '', window.location.pathname);
    showLoginPanel('login');
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (session) showApp(session.user);
  else showLoginPanel('login');
}

function showLoginPanel(panel) {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("adminApp").style.display = "none";
  document.getElementById("loginPanel").style.display = panel === 'login' ? 'block' : 'none';
  document.getElementById("forgotPanel").style.display = panel === 'forgot' ? 'block' : 'none';
  document.getElementById("resetPanel").style.display = panel === 'reset' ? 'block' : 'none';
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
  showLoginPanel('login');
}

// Garantiza que el usuario tenga una tienda. Devuelve true si existe
// (o se pudo crear); false si se mostró el formulario de recuperación.
async function ensureStore(user) {
  const { data: existing } = await sb.from("stores").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) {
    localStorage.removeItem("pendingStore");
    return true;
  }

  let prefill = { name: "", slug: "", whatsapp: "" };
  const pending = localStorage.getItem("pendingStore");
  if (pending) {
    try { prefill = { ...prefill, ...JSON.parse(pending) }; } catch (_) {}
    const { error } = await sb.from("stores").insert({
      user_id: user.id,
      name: prefill.name,
      slug: prefill.slug,
      whatsapp: prefill.whatsapp,
    });
    if (!error) {
      localStorage.removeItem("pendingStore");
      return true;
    }
    // El insert falló (p. ej. slug ya ocupado) → dejar que el usuario lo corrija
  }

  showCreateStoreForm(user, prefill);
  return false;
}

function showCreateStoreForm(user, prefill) {
  const overlay = document.createElement("div");
  overlay.id = "createStoreOverlay";
  overlay.style.cssText = "position:fixed;inset:0;z-index:2000;background:rgba(10,14,26,.92);display:flex;align-items:center;justify-content:center;padding:24px;";
  overlay.innerHTML = `
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;max-width:420px;width:100%;padding:32px;">
      <h2 style="font-size:1.2rem;margin-bottom:8px;">Completa tu tienda</h2>
      <p style="color:#9ca3af;font-size:.875rem;margin-bottom:20px;line-height:1.5;">
        Tu cuenta existe pero falta crear tu tienda. Completa estos datos y listo.
      </p>
      <div class="field" style="margin-bottom:14px;">
        <label style="display:block;font-size:.8rem;margin-bottom:6px;">Nombre de la tienda</label>
        <input type="text" id="recoverName" style="width:100%;" placeholder="Mi tienda" />
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label style="display:block;font-size:.8rem;margin-bottom:6px;">Enlace (slug)</label>
        <input type="text" id="recoverSlug" style="width:100%;" placeholder="mi-tienda" />
        <small style="color:#6b7280;font-size:.75rem;">Solo minúsculas, números y guiones.</small>
      </div>
      <div class="field" style="margin-bottom:20px;">
        <label style="display:block;font-size:.8rem;margin-bottom:6px;">WhatsApp (con código de país)</label>
        <input type="text" id="recoverWhatsapp" style="width:100%;" placeholder="50212345678" />
      </div>
      <p id="recoverError" style="display:none;color:#ef4444;font-size:.825rem;margin-bottom:14px;"></p>
      <button id="recoverBtn" class="btn-primary" style="width:100%;padding:12px;border-radius:8px;border:none;cursor:pointer;font-weight:700;">Crear mi tienda</button>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById("recoverName").value = prefill.name || "";
  document.getElementById("recoverSlug").value = prefill.slug || "";
  document.getElementById("recoverWhatsapp").value = prefill.whatsapp || "";

  document.getElementById("recoverBtn").addEventListener("click", async () => {
    const err = document.getElementById("recoverError");
    err.style.display = "none";
    const name = document.getElementById("recoverName").value.trim();
    const slug = slugify(document.getElementById("recoverSlug").value);
    const whatsapp = document.getElementById("recoverWhatsapp").value.replace(/\D/g, "");
    if (!name || !slug) {
      err.textContent = "El nombre y el enlace son obligatorios.";
      err.style.display = "block";
      return;
    }
    if (whatsapp.length < 8 || whatsapp.length > 15) {
      err.textContent = "Número de WhatsApp inválido. Usa formato internacional sin espacios.";
      err.style.display = "block";
      return;
    }
    const btn = document.getElementById("recoverBtn");
    btn.disabled = true;
    btn.textContent = "Creando...";
    const { error } = await sb.from("stores").insert({ user_id: user.id, name, slug, whatsapp });
    if (error) {
      err.textContent = error.message?.includes("duplicate") || error.code === "23505"
        ? "Ese enlace ya está en uso, elige otro."
        : "No se pudo crear la tienda: " + error.message;
      err.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Crear mi tienda";
      return;
    }
    localStorage.removeItem("pendingStore");
    window.location.reload();
  });
}

async function showApp(user) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminApp").style.display = "flex";
  document.getElementById("sidebarUser").textContent = user.email;

  // Red de seguridad: si la cuenta no tiene tienda (registro interrumpido,
  // email confirmado en otro dispositivo, slug duplicado, etc.), la crea
  // desde pendingStore o muestra un formulario para completarla.
  const hasStore = await ensureStore(user);
  if (!hasStore) return; // el formulario recarga la app al terminar

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
    const isUnconfirmed = error.message?.toLowerCase().includes('email not confirmed')
      || error.message?.toLowerCase().includes('not confirmed');
    if (isUnconfirmed) {
      err.innerHTML = `Tu correo no ha sido verificado.
        <a href="#" id="resendVerification" style="color:#e94560;text-decoration:underline;">Reenviar correo de verificación</a>`;
      document.getElementById("resendVerification")?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const { error: resendErr } = await sb.auth.resend({ type: 'signup', email });
        err.textContent = resendErr
          ? 'No se pudo reenviar. Intenta más tarde.'
          : `Correo reenviado a ${email}. Revisa tu bandeja de entrada.`;
      });
    } else {
      err.textContent = "Correo o contraseña incorrectos";
    }
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

// Forgot password link
document.getElementById("forgotLink").addEventListener("click", (e) => {
  e.preventDefault();
  showLoginPanel('forgot');
});

document.getElementById("forgotBackBtn").addEventListener("click", () => {
  showLoginPanel('login');
});

// Forgot password form
document.getElementById("forgotForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("forgotBtn");
  const err = document.getElementById("forgotError");
  const success = document.getElementById("forgotSuccess");
  err.style.display = "none";
  success.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Enviando...";

  const email = document.getElementById("forgotEmail").value.trim();
  const redirectTo = `${window.location.origin}/admin.html`;

  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    err.textContent = error.message;
    err.style.display = "block";
  } else {
    success.textContent = `Enviamos un enlace a ${email}. Revisa tu bandeja de entrada y sigue las instrucciones.`;
    success.style.display = "block";
    document.getElementById("forgotEmail").value = "";
  }
  btn.disabled = false;
  btn.textContent = "Enviar enlace";
});

// New password form (after recovery redirect)
document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("resetBtn");
  const err = document.getElementById("resetError");
  err.style.display = "none";

  const pass = document.getElementById("resetPassword").value;
  const confirm = document.getElementById("resetPasswordConfirm").value;

  if (pass !== confirm) {
    err.textContent = "Las contraseñas no coinciden.";
    err.style.display = "block";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Guardando...";

  const { error } = await sb.auth.updateUser({ password: pass });

  if (error) {
    err.textContent = error.message;
    err.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Guardar contraseña";
  } else {
    showToast("Contraseña actualizada. Iniciando sesión...", "success");
    setTimeout(async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (session) showApp(session.user);
      else showLoginPanel('login');
    }, 1500);
  }
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
    if (page === "analytics") loadAnalytics();
    if (page === "orders") loadOrders();
    if (page === "home") loadHome();
    closeSidebar();
  });
});

document.getElementById("sidebarToggle").addEventListener("click", () => {
  const isOpen = document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebarBackdrop").classList.toggle("visible", isOpen);
});

document.getElementById("sidebarBackdrop").addEventListener("click", closeSidebar);

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarBackdrop").classList.remove("visible");
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
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("productsTable").innerHTML = `<div class="loading">Error al cargar: ${error.message}</div>`;
    return;
  }

  allProducts = data || [];
  await ensureSortOrders();
  renderTable();
  maybeShowOnboardWizard();
}

// Normaliza sort_order a 1..n (productos nuevos entran con 0 = primero)
async function ensureSortOrders() {
  const updates = [];
  allProducts.forEach((p, i) => {
    const want = i + 1;
    if (p.sort_order !== want) { p.sort_order = want; updates.push(p); }
  });
  if (!updates.length) return;
  await Promise.all(updates.map((p) =>
    sb.from("products").update({ sort_order: p.sort_order }).eq("id", p.id)
  ));
}

async function moveProduct(id, dir) {
  const i = allProducts.findIndex((p) => Number(p.id) === Number(id));
  const j = i + dir;
  if (i < 0 || j < 0 || j >= allProducts.length) return;
  const a = allProducts[i], b = allProducts[j];
  [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];
  [allProducts[i], allProducts[j]] = [b, a];
  renderTable();
  const [r1, r2] = await Promise.all([
    sb.from("products").update({ sort_order: a.sort_order }).eq("id", a.id),
    sb.from("products").update({ sort_order: b.sort_order }).eq("id", b.id),
  ]);
  if (r1.error || r2.error) showToast("No se pudo guardar el orden", "error");
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

  const onboarding = document.getElementById("onboardingBanner");
  if (onboarding) {
    const visibles = allProducts.filter((p) => p.available !== false).length;
    onboarding.style.display = visibles === 0 ? "block" : "none";
    // Si vienen de una plantilla (hay ejemplos ocultos), el tutorial lo refleja
    const conEjemplos = visibles === 0 && allProducts.length > 0;
    const intro = document.getElementById("onboardingIntro");
    const step1 = document.getElementById("onboardingStep1");
    const cta = document.getElementById("onboardingCta");
    if (intro && step1 && cta) {
      if (conEjemplos) {
        intro.textContent = "Tu plantilla está aplicada. Sigue estos pasos para salir a vender:";
        step1.textContent = "Edita los productos de ejemplo (fotos y precios reales) y márcalos como visibles";
        cta.textContent = "Ver mis productos de ejemplo";
      } else {
        intro.textContent = "Tu catálogo está listo. Sigue estos pasos para empezar a recibir pedidos por WhatsApp:";
        step1.textContent = "Agrega tus primeros productos con fotos y precios";
        cta.textContent = "+ Agregar mi primer producto";
      }
    }
  }

  if (filtered.length === 0) {
    document.getElementById("productsTable").innerHTML = `<div class="loading">No se encontraron productos.</div>`;
    return;
  }

  const rows = filtered.map((p) => {
    const thumb = (p.image_urls && p.image_urls.length > 0) ? p.image_urls[0] : p.image_url;
    const sizes = (p.sizes || []).length ? ` · ${escapeHtml((p.sizes || []).join(", "))}` : "";
    return `
    <tr id="row-${Number(p.id)}">
      <td class="td-check"><input type="checkbox" value="${Number(p.id)}" onchange="onRowCheck(this)" aria-label="Seleccionar ${escapeHtml(p.name)}" /></td>
      <td class="td-emoji">${thumb ? `<img src="${escapeHtml(thumb)}" class="td-img" alt="${escapeHtml(p.name)}" />` : `<span style="display:inline-flex;color:#94a3b8;">${psIcon("image", 20)}</span>`}</td>
      <td class="td-name">
        <strong>${escapeHtml(p.name)}</strong>
        <small>${currencySymbol()}${escapeHtml(p.price)} ${escapeHtml(storeCurrencyCode())}${sizes}${p.stock != null ? ` · <span style="${p.stock === 0 ? "color:#c22844;font-weight:700;" : (p.stock <= 3 ? "color:#b45309;font-weight:700;" : "color:#6b7280;")}">${p.stock === 0 ? "Agotado" : `Stock: ${p.stock}`}</span>` : ""}</small>
      </td>
      <td><span class="badge badge-${escapeHtml(p.category)}">${escapeHtml(getCategoryLabel(p.category))}</span></td>
      <td class="${p.available ? 'status-on' : 'status-off'}">${p.available ? "✓ Visible" : "✗ Oculto"}</td>
      <td class="td-actions">
        <span class="move-btns">
          <button class="btn-move" onclick="moveProduct(${Number(p.id)}, -1)" title="Subir en el catálogo" aria-label="Subir">▲</button>
          <button class="btn-move" onclick="moveProduct(${Number(p.id)}, 1)" title="Bajar en el catálogo" aria-label="Bajar">▼</button>
        </span>
        <button class="btn-edit" onclick="openEditModal(${Number(p.id)})">Editar</button>
        <button class="btn-delete" onclick="askDelete(${Number(p.id)})">Eliminar</button>
      </td>
    </tr>
  `;
  }).join("");

  document.getElementById("productsTable").innerHTML = `
    <table>
      <thead>
        <tr>
          <th class="td-check"><input type="checkbox" id="checkAll" onchange="toggleAllRows(this)" aria-label="Seleccionar todos" /></th>
          <th style="width:52px"></th>
          <th>Producto</th>
          <th>Categoría</th>
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
// ===== GRUPOS DE OPCIONES (combos / conjuntos) =====
let productOptionGroups = [];

function renderOptionGroups() {
  const list = document.getElementById("optionGroupsList");
  if (!list) return;
  if (!productOptionGroups.length) {
    list.innerHTML = "";
    return;
  }
  list.innerHTML = productOptionGroups.map((g, i) => {
    const isRemove = g.mode === "remove";
    return `
    <div class="og-row">
      <div class="og-row-top">
        <input type="text" placeholder="${isRemove ? "Nombre del grupo (ej: Ingredientes)" : "Nombre del grupo (ej: Bebida)"}" maxlength="30"
          value="${escapeHtml(g.label || "")}" oninput="updateOptionGroup(${i},'label',this.value)" />
        <button type="button" class="og-del" onclick="removeOptionGroup(${i})" title="Eliminar grupo" aria-label="Eliminar grupo">✕</button>
      </div>
      <div class="og-row-top">
        <select class="og-mode" onchange="updateOptionGroupMode(${i}, this.value)">
          <option value="pick" ${isRemove ? "" : "selected"}>El cliente elige</option>
          <option value="remove" ${isRemove ? "selected" : ""}>El cliente puede quitar (ej: ingredientes)</option>
        </select>
        ${isRemove ? "" : `<label class="og-choose">Elige
          <input type="number" min="1" max="10" value="${Number(g.choose) || 1}"
            oninput="updateOptionGroup(${i},'choose',this.value)" />
        </label>`}
      </div>
      <input type="text" placeholder="${isRemove ? "Ingredientes separados por coma (ej: Pepinillos, Cebolla, Tomate)" : "Opciones separadas por coma · con recargo opcional (ej: 1/2 lb, 1 lb +15)"}" maxlength="200"
        value="${escapeHtml(g.optionsText ?? (g.options || []).join(", "))}" oninput="updateOptionGroup(${i},'optionsText',this.value)" />
    </div>
  `;
  }).join("");
}

function updateOptionGroup(i, key, value) {
  if (productOptionGroups[i]) productOptionGroups[i][key] = value;
}

function removeOptionGroup(i) {
  productOptionGroups.splice(i, 1);
  renderOptionGroups();
}

function updateOptionGroupMode(i, mode) {
  if (!productOptionGroups[i]) return;
  productOptionGroups[i].mode = mode;
  renderOptionGroups();
}

document.getElementById("btnAddOptionGroup")?.addEventListener("click", () => {
  if (productOptionGroups.length >= 5) { showToast("Máximo 5 grupos por producto", "error"); return; }
  productOptionGroups.push({ label: "", choose: 1, optionsText: "" });
  renderOptionGroups();
});

// "1 lb +15" → {n: "1 lb", d: 15} · "Extra queso +10" · "Pequeño -5"
function parseOption(txt) {
  const m = txt.match(/^(.*?)\s*([+-]\s*\d+(?:\.\d+)?)\s*$/);
  if (m && m[1].trim()) {
    const d = parseFloat(m[2].replace(/\s+/g, ""));
    if (!Number.isNaN(d) && d !== 0) return { n: m[1].trim(), d };
  }
  return txt;
}

function optionToText(o) {
  if (typeof o === "string") return o;
  return o.d ? `${o.n} ${o.d > 0 ? "+" : ""}${o.d}` : o.n;
}

function cleanOptionGroups() {
  return productOptionGroups
    .map((g) => {
      const options = String(g.optionsText ?? (g.options || []).map(optionToText).join(","))
        .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20)
        .map(parseOption);
      const choose = Math.max(1, Math.min(10, parseInt(g.choose) || 1));
      const mode = g.mode === "remove" ? "remove" : "pick";
      return { label: String(g.label || "").trim(), mode, choose: mode === "remove" ? 0 : Math.min(choose, options.length || 1), options };
    })
    .filter((g) => g.label && g.options.length > 0);
}

function openAddModal() {
  document.getElementById("productModalTitle").textContent = "Nuevo producto";
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("pAvailable").checked = true;
  document.getElementById("formError").style.display = "none";
  currentImageUrls = [];
  renderImageGrid();
  productOptionGroups = [];
  renderOptionGroups();
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
  document.getElementById("pStock").value = p.stock ?? "";
  document.getElementById("pDesc").value = p.description || "";
  document.getElementById("pBadge").value = p.badge || "";
  document.getElementById("pAvailable").checked = p.available !== false;
  currentImageUrls = [...(p.image_urls || [])];
  if (!currentImageUrls.length && p.image_url) currentImageUrls = [p.image_url];
  renderImageGrid();

  document.getElementById("pVariantLabel").value = p.variant_label || "";
  document.getElementById("pSizesText").value = (p.sizes || []).join(", ");

  productOptionGroups = (p.option_groups || []).map((g) => ({
    label: g.label || "", mode: g.mode === "remove" ? "remove" : "pick",
    choose: g.choose || 1, optionsText: (g.options || []).map(optionToText).join(", "),
  }));
  renderOptionGroups();

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

  const sizes = document.getElementById("pSizesText").value
    .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);

  const payload = {
    name: document.getElementById("pName").value.trim(),
    category: document.getElementById("pCategory").value || null,
    price: parseInt(document.getElementById("pPrice").value),
    stock: document.getElementById("pStock").value === "" ? null : Math.max(0, parseInt(document.getElementById("pStock").value) || 0),
    description: document.getElementById("pDesc").value.trim(),
    badge: document.getElementById("pBadge").value || null,
    available: document.getElementById("pAvailable").checked,
    sizes,
    variant_label: document.getElementById("pVariantLabel").value.trim() || null,
    option_groups: cleanOptionGroups(),
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
    const res = await sb.from("products").insert({ ...payload, user_id: user.id, sort_order: 0 });
    error = res.error;
  }

  btn.disabled = false;
  btn.textContent = "Guardar producto";

  if (error) {
    const isPlanLimit = error.message?.includes('plan_limit_exceeded');
    err.textContent = isPlanLimit
      ? `Límite de productos alcanzado en tu plan. Actualiza tu plan para agregar más.`
      : "Error al guardar: " + error.message;
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

// Acción del banner de bienvenida según el estado de la tienda
function onboardingAction() {
  const visibles = allProducts.filter((p) => p.available !== false).length;
  if (visibles === 0 && allProducts.length > 0) {
    document.querySelector('.nav-item[data-page="products"]')?.click();
  } else {
    document.querySelector('.nav-item[data-page="products"]')?.click();
    setTimeout(() => document.getElementById("btnAddProduct")?.click(), 150);
  }
}

// ===== ASISTENTE DE PLANTILLA (primer inicio) =====
const BUSINESS_TEMPLATES = {
  comida: {
    nombre: "Comida y restaurante", desc: "Combos, platos, bebidas", icon: "cart",
    categorias: ["Combos", "Platos fuertes", "Snacks", "Bebidas", "Postres"],
    textos: {
      hero_badge: "Pide por WhatsApp", hero_title: "Tu antojo, a un mensaje de distancia",
      hero_subtitle: "Explora nuestro menú, arma tu pedido y recíbelo donde estés.",
      catalog_title: "Menú", catalog_subtitle: "Explora nuestros platillos",
      cta_title: "¿Listo para ordenar?", cta_desc: "Escríbenos por WhatsApp y empezamos a preparar tu pedido.",
      about_title: "¿Por qué pedir con nosotros?",
      about1_icon: "🍔", about1_title: "Hecho al momento", about1_desc: "Preparamos tu pedido al recibirlo",
      about2_icon: "🚚", about2_title: "Entrega a domicilio", about2_desc: "Llegamos a tu zona",
      about3_icon: "💬", about3_title: "Pedido por WhatsApp", about3_desc: "Sin apps ni registros",
    },
    productos: [
      { name: "Combo de la casa (ejemplo)", price: 50, category: "Combos", description: "Edita este producto: es un ejemplo de combo con elección de bebida.", option_groups: [{ label: "Bebida", mode: "pick", choose: 1, options: ["Coca-Cola", "Té frío", "Agua pura"] }] },
      { name: "Plato especial (ejemplo)", price: 40, category: "Platos fuertes", description: "Edita este producto: ejemplo con ingredientes que el cliente puede quitar.", option_groups: [{ label: "Ingredientes", mode: "remove", choose: 0, options: ["Cebolla", "Tomate", "Picante"] }] },
    ],
  },
  reposteria: {
    nombre: "Repostería y panadería", desc: "Pasteles, postres, pan", icon: "sparkles",
    categorias: ["Pasteles", "Cupcakes", "Galletas", "Postres", "Por encargo"],
    textos: {
      hero_badge: "Hecho en casa", hero_title: "Dulces que alegran cualquier día",
      hero_subtitle: "Pedidos por encargo y entrega a domicilio. Elige tu antojo y escríbenos.",
      catalog_title: "Nuestro catálogo", catalog_subtitle: "Todo horneado con ingredientes de verdad",
      cta_title: "¿Celebras algo pronto?", cta_desc: "Cuéntanos por WhatsApp qué necesitas y lo preparamos.",
      about_title: "¿Por qué elegirnos?",
      about1_icon: "🎂", about1_title: "Por encargo", about1_desc: "Personalizamos tu pedido",
      about2_icon: "🌾", about2_title: "Ingredientes reales", about2_desc: "Horneado del día",
      about3_icon: "🚚", about3_title: "Entrega a domicilio", about3_desc: "Coordina por WhatsApp",
    },
    productos: [
      { name: "Pastel por encargo (ejemplo)", price: 250, category: "Pasteles", description: "Edita este producto: ejemplo con tamaño que cambia el precio.", option_groups: [{ label: "Tamaño", mode: "pick", choose: 1, options: ["8 porciones", { n: "12 porciones", d: 100 }] }] },
      { name: "Caja de cupcakes (ejemplo)", price: 120, category: "Cupcakes", description: "Edita este producto: ejemplo con elección de sabores.", option_groups: [{ label: "Sabores", mode: "pick", choose: 2, options: ["Vainilla", "Chocolate", "Fresa", "Limón"] }] },
    ],
  },
  ropa: {
    nombre: "Ropa y accesorios", desc: "Prendas, calzado, extras", icon: "store",
    categorias: ["Mujer", "Hombre", "Niños", "Accesorios", "Ofertas"],
    textos: {
      hero_badge: "Nueva colección", hero_title: "Estrena sin salir de casa",
      hero_subtitle: "Mira el catálogo, elige tu talla y pide por WhatsApp. Así de fácil.",
      catalog_title: "Catálogo", catalog_subtitle: "Explora las prendas disponibles",
      cta_title: "¿Viste algo que te gustó?", cta_desc: "Escríbenos por WhatsApp para apartarlo hoy mismo.",
      about_title: "Compra con confianza",
      about1_icon: "📏", about1_title: "Guía de tallas", about1_desc: "Te ayudamos a elegir la tuya",
      about2_icon: "🔄", about2_title: "Cambios sencillos", about2_desc: "Coordinamos por WhatsApp",
      about3_icon: "🚚", about3_title: "Envíos", about3_desc: "A todo el país",
    },
    productos: [
      { name: "Playera básica (ejemplo)", price: 80, category: "Mujer", description: "Edita este producto: ejemplo con tallas.", variant_label: "Talla", sizes: ["S", "M", "L", "XL"] },
      { name: "Conjunto 2 piezas (ejemplo)", price: 150, category: "Ofertas", description: "Edita este producto: ejemplo de conjunto con color por pieza.", option_groups: [{ label: "Color de la blusa", mode: "pick", choose: 1, options: ["Negro", "Blanco", "Beige"] }, { label: "Color del pantalón", mode: "pick", choose: 1, options: ["Negro", "Azul"] }] },
    ],
  },
  belleza: {
    nombre: "Belleza y cuidado", desc: "Cosméticos, skincare", icon: "droplet",
    categorias: ["Maquillaje", "Cuidado de piel", "Cabello", "Fragancias", "Kits"],
    textos: {
      hero_badge: "Productos originales", hero_title: "Tu rutina de belleza, a domicilio",
      hero_subtitle: "Catálogo siempre actualizado. Pide por WhatsApp y recibe en tu puerta.",
      catalog_title: "Catálogo", catalog_subtitle: "Encuentra tus favoritos",
      cta_title: "¿Dudas sobre un producto?", cta_desc: "Escríbenos y te asesoramos sin compromiso.",
      about_title: "¿Por qué comprarnos?",
      about1_icon: "✅", about1_title: "100% originales", about1_desc: "Productos garantizados",
      about2_icon: "💬", about2_title: "Asesoría personal", about2_desc: "Te ayudamos a elegir",
      about3_icon: "🚚", about3_title: "Entrega rápida", about3_desc: "Coordina por WhatsApp",
    },
    productos: [
      { name: "Labial (ejemplo)", price: 60, category: "Maquillaje", description: "Edita este producto: ejemplo con tonos.", variant_label: "Tono", sizes: ["Nude", "Rojo", "Rosa"] },
      { name: "Kit de skincare (ejemplo)", price: 180, category: "Kits", description: "Edita este producto: ejemplo de kit armable.", option_groups: [{ label: "Tipo de piel", mode: "pick", choose: 1, options: ["Grasa", "Seca", "Mixta"] }] },
    ],
  },
  tienda: {
    nombre: "Tienda general", desc: "Variedad de productos", icon: "box",
    categorias: ["Novedades", "Hogar", "Tecnología", "Ofertas"],
    textos: {
      hero_badge: "Bienvenido", hero_title: "Todo lo que buscas, en un solo lugar",
      hero_subtitle: "Explora el catálogo y haz tu pedido por WhatsApp en un minuto.",
      catalog_title: "Catálogo", catalog_subtitle: "Explora nuestros productos",
      cta_title: "¿Listo para hacer tu pedido?", cta_desc: "Escríbenos por WhatsApp y coordinamos la entrega.",
      about_title: "¿Por qué elegirnos?",
      about1_icon: "✅", about1_title: "Calidad garantizada", about1_desc: "Productos seleccionados",
      about2_icon: "💬", about2_title: "Atención directa", about2_desc: "Respuesta rápida por WhatsApp",
      about3_icon: "🚚", about3_title: "Entrega a domicilio", about3_desc: "Coordina tu envío",
    },
    productos: [
      { name: "Producto de ejemplo", price: 100, category: "Novedades", description: "Edita este producto o elimínalo: es solo un ejemplo para que veas cómo se ve tu catálogo." },
    ],
  },
};

let wizardChoice = null;

function maybeShowOnboardWizard() {
  if (window._wizardShown) return;
  if (!storeSettings?.id) return;
  // ?onboarding=1 fuerza el asistente (útil para probarlo o volver a verlo)
  const forced = new URLSearchParams(window.location.search).get("onboarding") === "1";
  if (!forced) {
    if (allProducts.length > 0) return;
    let done = "";
    try { done = localStorage.getItem(`ps_onboard_${storeSettings.id}`) || ""; } catch (_) {}
    if (done) return;
  }
  window._wizardShown = true;

  const grid = document.getElementById("wizardGrid");
  grid.innerHTML = Object.entries(BUSINESS_TEMPLATES).map(([key, t]) => `
    <button type="button" class="wizard-opt" data-key="${key}">
      <span class="wz-ico">${psIcon(t.icon, 22)}</span>
      <strong>${t.nombre}</strong>
      <small>${t.desc}</small>
    </button>`).join("");
  grid.querySelectorAll(".wizard-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      grid.querySelectorAll(".wizard-opt").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      wizardChoice = btn.dataset.key;
      const t = BUSINESS_TEMPLATES[wizardChoice];
      const prev = document.getElementById("wizardPreview");
      prev.style.display = "";
      prev.className = "wizard-preview";
      prev.innerHTML = `Tu catálogo quedará con: <strong>categorías</strong> ${t.categorias.join(", ")} · <strong>textos de bienvenida</strong> adaptados a tu rubro · <strong>${t.productos.length} producto${t.productos.length !== 1 ? "s" : ""} de ejemplo</strong> (ocultos, para que los edites antes de publicar). Todo se puede cambiar después.`;
      document.getElementById("wizardApply").style.display = "";
    });
  });
  const ov = document.getElementById("onboardWizard");
  ov.style.display = "";
  ov.classList.add("open");
}

function closeWizard() {
  try { localStorage.setItem(`ps_onboard_${storeSettings.id}`, "1"); } catch (_) {}
  const ov = document.getElementById("onboardWizard");
  ov.classList.remove("open");
  ov.style.display = "none";
}

document.getElementById("wizardSkip")?.addEventListener("click", closeWizard);

document.getElementById("wizardApply")?.addEventListener("click", async () => {
  const t = BUSINESS_TEMPLATES[wizardChoice];
  if (!t || !storeSettings?.id) { closeWizard(); return; }
  const btn = document.getElementById("wizardApply");
  btn.disabled = true;
  btn.textContent = "Aplicando...";

  const { error: e1 } = await sb.from("stores")
    .update({ custom_categories: t.categorias, ...t.textos })
    .eq("id", storeSettings.id);

  const { data: { user } } = await sb.auth.getUser();
  let e2 = null;
  for (const prod of t.productos) {
    const res = await sb.from("products").insert({
      user_id: user.id, available: false, sort_order: 0, sizes: [],
      ...prod,
    });
    if (res.error) e2 = res.error;
  }

  btn.disabled = false;
  btn.textContent = "Aplicar plantilla";
  if (e1 || e2) {
    showToast("Hubo un problema al aplicar la plantilla: " + (e1 || e2).message, "error");
    return;
  }
  closeWizard();
  showToast("¡Plantilla aplicada! Edita los productos de ejemplo y publícalos ✓", "success");
  await loadSettings();
  await loadProducts();
  document.querySelector('.nav-item[data-page="products"]')?.click();
});

// ===== BULK ACTIONS =====
function getSelectedIds() {
  return [...document.querySelectorAll('#productsTable input[type=checkbox]:checked')]
    .map(cb => cb.value).filter(Boolean);
}

function updateBulkBar() {
  const ids = getSelectedIds();
  const bar = document.getElementById("bulkBar");
  const count = document.getElementById("bulkCount");
  bar.style.display = ids.length > 0 ? "flex" : "none";
  if (count) count.textContent = `${ids.length} producto${ids.length !== 1 ? "s" : ""} seleccionado${ids.length !== 1 ? "s" : ""}`;
}

function onRowCheck(cb) {
  const row = document.getElementById(`row-${cb.value}`);
  if (row) row.classList.toggle("row-selected", cb.checked);
  const all = document.getElementById("checkAll");
  const boxes = document.querySelectorAll('#productsTable tbody input[type=checkbox]');
  if (all) all.checked = boxes.length > 0 && [...boxes].every(b => b.checked);
  updateBulkBar();
}

function toggleAllRows(masterCb) {
  document.querySelectorAll('#productsTable tbody input[type=checkbox]').forEach(cb => {
    cb.checked = masterCb.checked;
    const row = document.getElementById(`row-${cb.value}`);
    if (row) row.classList.toggle("row-selected", masterCb.checked);
  });
  updateBulkBar();
}

function clearSelection() {
  document.querySelectorAll('#productsTable input[type=checkbox]').forEach(cb => {
    cb.checked = false;
    const row = document.getElementById(`row-${cb.value}`);
    if (row) row.classList.remove("row-selected");
  });
  updateBulkBar();
}

async function bulkToggleAvailable(available) {
  const ids = getSelectedIds();
  if (!ids.length) return;
  const { error } = await sb.from("products").update({ available }).in("id", ids);
  if (error) { showToast("Error al actualizar", "error"); return; }
  showToast(`${ids.length} producto${ids.length !== 1 ? "s" : ""} ${available ? "visibles" : "ocultos"} ✓`, "success");
  clearSelection();
  loadProducts();
}

async function bulkDelete() {
  const ids = getSelectedIds();
  if (!ids.length) return;
  if (!confirm(`¿Eliminar ${ids.length} producto${ids.length !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`)) return;
  const { error } = await sb.from("products").delete().in("id", ids);
  if (error) { showToast("Error al eliminar", "error"); return; }
  showToast(`${ids.length} producto${ids.length !== 1 ? "s" : ""} eliminado${ids.length !== 1 ? "s" : ""} ✓`, "success");
  loadProducts();
}

// ===== SETTINGS =====
async function loadSettings(user) {
  if (!user) {
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) { showLogin(); return; }
    user = u;
  }
  const { data } = await sb.from("stores").select(STORE_COLS).eq("user_id", user.id).single();

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
    maybeShowOnboardWizard();
    document.getElementById("storeName").value = data.name || "";
    document.getElementById("storeSlug").value = data.slug || "";
    updateCatalogLink(data.slug || "");
    document.getElementById("storeWhatsapp").value = data.whatsapp || "";
    const currencySel = document.getElementById("storeCurrency");
    if (currencySel) currencySel.value = data.currency || "GTQ";
    document.getElementById("storeWaMessage").value = data.wa_message || "";
    document.getElementById("storeDesc").value = data.description || "";
    document.getElementById("storeAccent").value = data.accent_color || "#e94560";
    document.getElementById("storeAccentHex").textContent = data.accent_color || "#e94560";
    document.querySelectorAll("#payMethods input").forEach((cb) => {
      cb.checked = (data.payment_methods || []).includes(cb.value);
    });
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
    // Re-render con la moneda de la tienda (los productos pudieron cargarse antes)
    if (allProducts.length > 0) renderTable();
    loadHome();
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

  // Barra de progreso del plan
  const countEl = document.getElementById("productCount");
  const bar     = document.getElementById("planProgressBar");
  const badge   = document.getElementById("planBadge");
  if (countEl) {
    const max = limits.maxProducts === Infinity ? '∞' : limits.maxProducts;
    countEl.textContent = `${allProducts.length} / ${max} productos`;
  }
  if (bar) {
    const pct = limits.maxProducts === Infinity ? 0
      : Math.min(100, (allProducts.length / limits.maxProducts) * 100);
    bar.style.width = `${pct}%`;
    bar.style.background = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#e94560';
  }
  if (badge) {
    const labels = { free: 'Plan Free', starter: 'Plan Starter', pro: 'Plan Pro' };
    badge.textContent = labels[plan] || 'Plan Free';
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
        overlay.innerHTML = `<span style="display:inline-flex;">${psIcon('lock', 26)}</span><p>Disponible en <strong>Starter</strong> o <strong>Pro</strong></p><a href="#" class="plan-lock-btn" onclick="document.querySelector('.nav-item[data-page=plan]').click();return false;">Ver planes →</a>`;
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
  const waRaw = document.getElementById("storeWhatsapp").value.replace(/\D/g, '');
  if (waRaw.length < 8 || waRaw.length > 15) {
    showToast("Número de WhatsApp inválido. Usa formato internacional sin espacios (ej: 50212345678).", "error");
    document.getElementById("storeWhatsapp").focus();
    return;
  }

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
    whatsapp: document.getElementById("storeWhatsapp").value.replace(/\D/g, ''),
    currency: document.getElementById("storeCurrency")?.value || "GTQ",
    wa_message: document.getElementById("storeWaMessage").value.trim() || null,
    description: document.getElementById("storeDesc").value.trim(),
    accent_color: document.getElementById("storeAccent").value,
    custom_categories: customCategories,
    payment_methods: [...document.querySelectorAll("#payMethods input:checked")].map((cb) => cb.value),
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
      <button type="button" class="chip-move" onclick="moveCategory(${i}, -1)" title="Mover antes" aria-label="Mover antes" ${i === 0 ? "disabled" : ""}>◀</button>
      ${escapeHtml(c)}
      <button type="button" class="chip-move" onclick="moveCategory(${i}, 1)" title="Mover después" aria-label="Mover después" ${i === customCategories.length - 1 ? "disabled" : ""}>▶</button>
      <button type="button" onclick="removeCategory(${i})" title="Eliminar">✕</button>
    </span>
  `).join("");
}

// El orden de esta lista es el orden de los filtros en el catálogo público
function moveCategory(index, dir) {
  const j = index + dir;
  if (j < 0 || j >= customCategories.length) return;
  [customCategories[index], customCategories[j]] = [customCategories[j], customCategories[index]];
  renderCustomCategories();
  populateCategorySelects();
  persistCategories();
}

// Guarda las categorías al instante: antes solo se persistían al presionar
// "Guardar configuración" y se perdían al salir (reporte del primer beta)
async function persistCategories() {
  if (!storeSettings?.id) return;
  const { error } = await sb.from("stores")
    .update({ custom_categories: customCategories })
    .eq("id", storeSettings.id);
  if (error) showToast("No se pudo guardar la categoría: " + error.message, "error");
}

function removeCategory(index) {
  customCategories.splice(index, 1);
  renderCustomCategories();
  populateCategorySelects();
  persistCategories();
}

document.getElementById("btnAddCategory").addEventListener("click", () => {
  const input = document.getElementById("newCategoryInput");
  const name = input.value.trim();
  if (!name) return;
  if (customCategories.includes(name)) {
    showToast("Esa categoría ya existe", "error");
    return;
  }
  customCategories.push(name);
  input.value = "";
  renderCustomCategories();
  populateCategorySelects();
  persistCategories();
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

// ===== CSV EXPORT =====
function exportCSV() {
  if (!allProducts.length) {
    showToast("No hay productos para exportar.", "error");
    return;
  }
  const headers = ["ID", "Nombre", "Descripción", "Precio", "Categoría", "Tallas", "Disponible", "Nuevo", "Más vendido"];
  const rows = allProducts.map(p => [
    p.id,
    p.name || "",
    (p.description || "").replace(/"/g, '""'),
    p.price || "",
    p.category || "",
    (p.sizes || []).join("|"),
    p.is_available ? "Sí" : "No",
    p.is_new ? "Sí" : "No",
    p.is_best_seller ? "Sí" : "No",
  ].map(v => `"${v}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `productos-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== PLAN PAGE =====
// ===== ANALYTICS =====
async function loadAnalytics() {
  if (currentPlan === 'free') {
    document.getElementById('statViews').textContent = '—';
    document.getElementById('statWA').textContent = '—';
    document.getElementById('statProductViews').textContent = '—';
    ['statOrders','statTicket','statConv'].forEach((id) => { const e = document.getElementById(id); if (e) e.textContent = '—'; });
    ['chartHours','chartDays','chartSeries'].forEach((id) => { const e = document.getElementById(id); if (e) e.innerHTML = '<p class="an-empty">Disponible en Starter y Pro</p>'; });
    document.getElementById('analyticsRange').textContent = '';
    document.getElementById('topProductsList').innerHTML = `
      <div style="text-align:center;padding:40px 24px;">
        <div style="margin-bottom:12px;color:#5b8ab5;">${psIcon("chart", 40)}</div>
        <h3 style="font-size:1rem;margin-bottom:8px;color:#e2e8f0;">Estadísticas disponibles en Starter y Pro</h3>
        <p style="color:#6b7280;font-size:.875rem;margin-bottom:20px;line-height:1.6;">
          Activa el plan Starter para ver vistas del catálogo, clicks en WhatsApp y tus productos más populares.
        </p>
        <a href="#" onclick="document.querySelector('.nav-item[data-page=plan]').click();return false;"
           class="btn-primary" style="text-decoration:none;">Ver planes →</a>
      </div>`;
    return;
  }

  document.getElementById('analyticsRange').textContent = 'Últimos 30 días';
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await sb
    .from("store_events")
    .select("event_type, product_id, created_at")
    .gte("created_at", since);

  if (!events) return;

  const views    = events.filter(e => e.event_type === "catalog_view").length;
  const wa       = events.filter(e => e.event_type === "whatsapp_click").length;
  const prodViews = events.filter(e => e.event_type === "product_view").length;

  document.getElementById("statViews").textContent        = views;
  document.getElementById("statWA").textContent           = wa;
  document.getElementById("statProductViews").textContent = prodViews;

  // Conversión: % de vistas del catálogo que terminan en clic de WhatsApp
  const convEl = document.getElementById("statConv");
  if (convEl) convEl.textContent = views > 0 ? `${Math.min(100, Math.round((wa / views) * 100))}%` : "—";

  // Pedidos de los últimos 30 días
  let orders = [];
  if (storeSettings?.id) {
    const { data: od } = await sb.from("orders")
      .select("total, created_at, status")
      .eq("store_id", storeSettings.id)
      .gte("created_at", since)
      .limit(1000);
    orders = od || [];
  }
  const activos = orders.filter((o) => o.status !== "dismissed");
  const ordersEl = document.getElementById("statOrders");
  if (ordersEl) ordersEl.textContent = activos.length;
  const ticketEl = document.getElementById("statTicket");
  if (ticketEl) {
    const conTotal = activos.filter((o) => Number(o.total) > 0);
    ticketEl.textContent = conTotal.length
      ? `${currencySymbol()}${Math.round(conTotal.reduce((s2, o) => s2 + Number(o.total), 0) / conTotal.length)}`
      : "—";
  }

  // Intención de compra (clics de WhatsApp + pedidos) por hora y por día
  const intentDates = events.filter((e) => e.event_type === "whatsapp_click").map((e) => new Date(e.created_at))
    .concat(activos.map((o) => new Date(o.created_at)));
  renderHourChart(intentDates);
  renderDayChart(intentDates);
  renderSeriesChart(events);

  // Top products
  const counts = {};
  events.filter(e => e.event_type === "product_view" && e.product_id).forEach(e => {
    counts[e.product_id] = (counts[e.product_id] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const list = document.getElementById("topProductsList");
  if (!top.length) {
    list.innerHTML = `<p style="color:#6b7280;font-size:.875rem;">Aún no hay datos de productos vistos.</p>`;
    return;
  }
  const maxVal = top[0][1];
  list.innerHTML = top.map(([id, count]) => {
    const p = allProducts.find(pr => String(pr.id) === String(id));
    const name = p ? p.name : `Producto #${id}`;
    const pct  = Math.round((count / maxVal) * 100);
    return `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px;">
          <span style="color:#e2e8f0;">${escapeHtml(name)}</span>
          <span style="color:#6b7280;">${count} vista${count !== 1 ? "s" : ""}</span>
        </div>
        <div style="height:6px;background:#1e293b;border-radius:99px;">
          <div style="height:100%;width:${pct}%;background:#f59e0b;border-radius:99px;transition:width .4s;"></div>
        </div>
      </div>`;
  }).join("");
}

// ── Gráficas de estadísticas (barras CSS, sin librerías) ──
function anBars(el, cols, color) {
  if (!el) return;
  const max = Math.max(1, ...cols.map((c) => c.v));
  if (!cols.some((c) => c.v > 0)) {
    el.innerHTML = '<p class="an-empty">Aún no hay suficiente actividad.</p>';
    return;
  }
  el.innerHTML = cols.map((c) => `
    <div class="an-col" title="${escapeHtml(c.title)}">
      <div class="an-bars"><div class="an-bar" style="height:${Math.round((c.v / max) * 100)}%;background:${c.color || color};"></div></div>
      <div class="an-x">${escapeHtml(c.x)}</div>
    </div>`).join("");
}

function renderHourChart(dates) {
  const byHour = Array(24).fill(0);
  dates.forEach((d) => { byHour[d.getHours()] += 1; });
  anBars(document.getElementById("chartHours"), byHour.map((v, h) => ({
    v, x: h % 3 === 0 ? `${h}` : "", title: `${h}:00 — ${v} pedido${v !== 1 ? "s" : ""}/clic${v !== 1 ? "s" : ""}`,
  })), "var(--accent)");
}

function renderDayChart(dates) {
  const names = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const byDay = Array(7).fill(0);
  dates.forEach((d) => { byDay[d.getDay()] += 1; });
  // semana empezando en lunes
  const order = [1, 2, 3, 4, 5, 6, 0];
  anBars(document.getElementById("chartDays"), order.map((dow) => ({
    v: byDay[dow], x: names[dow], title: `${names[dow]}: ${byDay[dow]}`,
  })), "var(--accent)");
}

function renderSeriesChart(events) {
  const el = document.getElementById("chartSeries");
  if (!el) return;
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), label: d.toLocaleDateString("es", { day: "2-digit", month: "short" }), views: 0, wa: 0 });
  }
  const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
  events.forEach((e) => {
    const k = new Date(e.created_at).toDateString();
    if (!(k in idx)) return;
    if (e.event_type === "catalog_view") days[idx[k]].views += 1;
    if (e.event_type === "whatsapp_click") days[idx[k]].wa += 1;
  });
  const max = Math.max(1, ...days.map((d) => Math.max(d.views, d.wa)));
  if (!days.some((d) => d.views > 0 || d.wa > 0)) {
    el.innerHTML = '<p class="an-empty">Aún no hay suficiente actividad.</p>';
    return;
  }
  el.innerHTML = days.map((d, i) => `
    <div class="an-col" title="${escapeHtml(d.label)}: ${d.views} vistas, ${d.wa} clics">
      <div class="an-bars">
        <div class="an-bar" style="height:${Math.round((d.views / max) * 100)}%;background:#5b8ab5;"></div>
        <div class="an-bar" style="height:${Math.round((d.wa / max) * 100)}%;background:#25d366;"></div>
      </div>
      <div class="an-x">${i % 2 === 0 ? escapeHtml(d.label.split(" ")[0]) : ""}</div>
    </div>`).join("");
}

function loadPlanPage() {
  const el = document.getElementById('planContent');
  if (!el) return;

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 'Q0',
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
      price: 'Q40',
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
      price: 'Q80',
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

// ===== INICIO =====
async function loadHome() {
  const greeting = document.getElementById("homeGreeting");
  if (!greeting) return;
  const h = new Date().getHours();
  greeting.textContent = (h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches");
  const line = document.getElementById("homeStoreLine");
  if (line && storeSettings?.name) {
    line.textContent = `${storeSettings.name} · ${document.getElementById("catalogLink")?.textContent || ""}`;
  }
  const viewLink = document.getElementById("homeViewLink");
  if (viewLink && storeSettings?.slug) viewLink.href = `index.html?s=${storeSettings.slug}`;

  const checklist = document.getElementById("homeChecklist");
  if (checklist) {
    const visibles = allProducts.filter((p) => p.available !== false).length;
    const items = [
      { done: visibles > 0, label: allProducts.length > 0 && visibles === 0 ? "Publica tus productos de ejemplo" : "Agrega tu primer producto" },
      { done: !!(storeSettings?.logo_url || storeSettings?.hero_title), label: "Personaliza tu tienda (logo, textos)" },
      { done: false, label: "Comparte tu enlace o tu QR" },
    ];
    checklist.innerHTML = items.map((i) => `
      <span class="check-item ${i.done ? "check-done" : ""}">
        ${i.done
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.4"><circle cx="12" cy="12" r="10"></circle><path d="m8 12 3 3 5-6"></path></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c22844" stroke-width="2.4"><circle cx="12" cy="12" r="10"></circle></svg>'}
        ${i.label}
      </span>`).join("");
  }

  const lowAlert = document.getElementById("lowStockAlert");
  if (lowAlert) {
    const lows = allProducts.filter((p) => p.stock != null && p.stock <= 3);
    if (lows.length) {
      lowAlert.style.display = "";
      lowAlert.innerHTML = `
        <div class="low-stock-card">
          <h4>${psIcon("zap", 16)} Inventario bajo</h4>
          <ul>${lows.map((p) => `<li><strong>${escapeHtml(p.name)}</strong>: ${p.stock === 0 ? "agotado" : `quedan ${p.stock}`}</li>`).join("")}</ul>
        </div>`;
    } else {
      lowAlert.style.display = "none";
      lowAlert.innerHTML = "";
    }
  }

  if (storeSettings?.id) {
    const { data: orders } = await sb.from("orders")
      .select("items,total,currency,created_at")
      .eq("store_id", storeSettings.id)
      .order("created_at", { ascending: false })
      .limit(30);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const deHoy = (orders || []).filter((o) => new Date(o.created_at) >= hoy);
    const elToday = document.getElementById("homeOrdersToday");
    if (elToday) elToday.textContent = deHoy.length;
    const hint = document.getElementById("homeOrdersHint");
    if (hint) hint.textContent = (orders || []).length ? `${orders.length} recientes en total` : "Comparte tu enlace para recibir el primero";
    const recent = document.getElementById("homeRecentOrders");
    if (recent) {
      const top = (orders || []).slice(0, 4);
      recent.innerHTML = top.length === 0
        ? '<div class="loading">Aún no hay pedidos. Tu enlace y tu QR están listos para compartir.</div>'
        : top.map((o) => {
            const its = Array.isArray(o.items) ? o.items : [];
            const resumen = its.map((it) => `${Number(it.q) || 1}× ${escapeHtml(it.n || "Producto")}`).join(" · ");
            const fecha = new Date(o.created_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
            const sym = CURRENCY_SYMBOLS[o.currency] || "";
            return `<div class="home-order-row"><span class="home-order-total">${sym}${escapeHtml(o.total ?? "")}</span><span class="home-order-items">${resumen || "—"}</span><span class="home-order-date">${escapeHtml(fecha)}</span></div>`;
          }).join("");
    }
  }

  const isPaid = currentPlan === "starter" || currentPlan === "pro";
  if (isPaid && storeSettings?.id) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: ev } = await sb.from("store_events").select("event_type").gte("created_at", since);
    if (ev) {
      const v = document.getElementById("homeViews");
      const w = document.getElementById("homeWa");
      if (v) v.textContent = ev.filter((e) => e.event_type === "catalog_view").length;
      if (w) w.textContent = ev.filter((e) => e.event_type === "whatsapp_click").length;
    }
  } else {
    const vh = document.getElementById("homeViewsHint");
    const wh = document.getElementById("homeWaHint");
    if (vh) vh.textContent = "Disponible en Starter";
    if (wh) wh.textContent = "Disponible en Starter";
  }
}

// ===== PEDIDOS =====
async function loadOrders() {
  const el = document.getElementById("ordersTable");
  if (!el) return;
  if (!storeSettings?.id) { el.innerHTML = `<div class="loading">Guarda la configuración de tu tienda primero.</div>`; return; }
  el.innerHTML = `<div class="loading">Cargando pedidos...</div>`;
  const { data, error } = await sb.from("orders")
    .select("id, items, total, currency, created_at, status, token, payment_method")
    .eq("store_id", storeSettings.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) { el.innerHTML = `<div class="loading">Error al cargar: ${escapeHtml(error.message)}</div>`; return; }
  if (!data || data.length === 0) {
    el.innerHTML = `<div class="loading">Aún no hay pedidos. Comparte tu enlace o tu código QR para recibir los primeros.</div>`;
    return;
  }
  window._loadedOrders = data;
  const rows = data.map((o) => {
    const items = Array.isArray(o.items) ? o.items : [];
    const list = items.map((it) =>
      `<li>${Number(it.q) || 1}× ${escapeHtml(it.n || "Producto")}${it.v ? ` <span style="color:#9ca3af">(${escapeHtml(it.v)})</span>` : ""}</li>`
    ).join("");
    const fecha = new Date(o.created_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    const sym = CURRENCY_SYMBOLS[o.currency] || "";
    const pago = o.payment_method ? `<div style="font-size:.72rem;color:#6b7280;margin-top:4px;">Pago: <strong>${escapeHtml(o.payment_method)}</strong></div>` : "";
    const status = o.status || "pending";
    const estado = status === "confirmed"
      ? `<span class="order-status confirmed">✓ Confirmada</span>`
      : status === "dismissed"
        ? `<span class="order-status dismissed">Descartada</span>`
        : `<span class="order-status pending">Pendiente</span>
           <div class="order-actions">
             <button class="btn-order-ok" onclick="setOrderStatus(${Number(o.id)}, 'confirmed')" title="La venta se concretó: descuenta inventario">Confirmar venta</button>
             <button class="btn-order-no" onclick="setOrderStatus(${Number(o.id)}, 'dismissed')" title="Solo fue consulta: no descuenta nada">Descartar</button>
           </div>`;
    return `<tr class="order-row">
      <td class="order-date">${escapeHtml(fecha)}</td>
      <td><ul class="order-items">${list || "<li>—</li>"}</ul>${pago}</td>
      <td class="order-total">${o.total != null ? `${sym}${escapeHtml(o.total)} ${escapeHtml(o.currency || "")}` : "—"}</td>
      <td>${estado}
        <button class="btn-order-pdf" onclick="downloadOrderPDF(${Number(o.id)})" title="Descargar comprobante PDF">
          ${psIcon("card", 12)} PDF
        </button>${o.token ? `
        <a class="btn-order-pdf" href="pedido?t=${escapeHtml(o.token)}" target="_blank" title="Ver comprobante en línea" style="text-decoration:none;">
          ${psIcon("eye", 12)} Ver
        </a>` : ""}
      </td>
    </tr>`;
  }).join("");
  el.innerHTML = `<table><thead><tr><th style="width:120px;">Fecha</th><th>Pedido</th><th style="width:110px;">Total</th><th style="width:150px;">Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// Confirmar venta = descontar inventario; descartar = sin efecto.
// Solo transiciona pedidos pendientes (el filtro .eq evita doble descuento).
async function setOrderStatus(orderId, status) {
  const order = (window._loadedOrders || []).find((o) => Number(o.id) === Number(orderId));
  if (!order || (order.status || "pending") !== "pending") return;
  const { data: updated, error } = await sb.from("orders")
    .update({ status }).eq("id", orderId).eq("status", "pending").select("id");
  if (error || !updated || !updated.length) {
    showToast("No se pudo actualizar el pedido", "error");
    return;
  }
  order.status = status;
  if (status === "confirmed") await deductStock(order.items);
  showToast(status === "confirmed" ? "Venta confirmada ✓ Inventario actualizado" : "Pedido descartado", "success");
  loadOrders();
  loadProducts();
}

// ── Comprobante PDF del pedido (marca del cliente + sello ProductSpot) ──
function psPdfIsotipo(doc, x, y, s2, tile, accent) {
  // 2×2: tres cuadros redondeados + disco coral (el "producto bajo el reflector")
  const u = s2 / 64;
  doc.setFillColor(...tile);
  doc.roundedRect(x + 2 * u, y + 2 * u, 28 * u, 28 * u, 9 * u, 9 * u, "F");
  doc.roundedRect(x + 2 * u, y + 34 * u, 28 * u, 28 * u, 9 * u, 9 * u, "F");
  doc.roundedRect(x + 34 * u, y + 34 * u, 28 * u, 28 * u, 9 * u, 9 * u, "F");
  doc.setFillColor(...accent);
  doc.circle(x + 48 * u, y + 16 * u, 14 * u, "F");
}

function downloadOrderPDF(orderId) {
  const o = (window._loadedOrders || []).find((x) => Number(x.id) === Number(orderId));
  if (!o || typeof window.jspdf === "undefined") { showToast("No se pudo generar el PDF", "error"); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ format: "a5", unit: "mm" });
  const W = 148;
  const M = 14;
  const coral = [233, 69, 96];
  const navy = [15, 23, 42];
  const gray = [107, 114, 128];
  const sym = CURRENCY_SYMBOLS[o.currency] || "";
  const accent = storeSettings?.accent_color || null;

  // Cabecera con la marca de la tienda
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(String(storeSettings?.name || "Mi tienda"), M, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(170, 178, 197);
  doc.text("Comprobante de pedido", M, 23);
  psPdfIsotipo(doc, W - M - 12, 9, 12, [248, 250, 252], coral);
  if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
    const r = parseInt(accent.slice(1, 3), 16), g = parseInt(accent.slice(3, 5), 16), b = parseInt(accent.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
  } else {
    doc.setFillColor(...coral);
  }
  doc.rect(0, 34, W, 1.6, "F");

  // Datos del pedido
  let y = 46;
  doc.setTextColor(...gray);
  doc.setFontSize(8.5);
  const fecha = new Date(o.created_at).toLocaleString("es", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  doc.text(`Pedido #${o.id} · ${fecha}`, M, y);
  const estadoTxt = o.status === "confirmed" ? "Venta confirmada" : o.status === "dismissed" ? "Descartado" : "Pendiente";
  doc.text(estadoTxt, W - M, y, { align: "right" });
  y += 5;
  if (o.payment_method) { doc.text(`Método de pago: ${o.payment_method}`, M, y); y += 5; }
  y += 4;

  // Ítems
  const items = Array.isArray(o.items) ? o.items : [];
  items.forEach((it) => {
    if (y > 182) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(31, 41, 55);
    const nombre = `${Number(it.q) || 1}×  ${String(it.n || "Producto")}`;
    doc.text(doc.splitTextToSize(nombre, 92), M, y);
    if (it.p != null) doc.text(`${sym}${it.p} c/u`, W - M, y, { align: "right" });
    y += 5.5;
    if (it.v) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...gray);
      String(it.v).split(" · ").forEach((part) => {
        if (y > 190) { doc.addPage(); y = 20; }
        doc.text(doc.splitTextToSize(`›  ${part}`, 100), M + 5, y);
        y += 4.6;
      });
    }
    y += 3.5;
  });

  // Total
  y += 2;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(31, 41, 55);
  doc.text("Total", M, y);
  doc.setTextColor(...coral);
  doc.text(`${sym}${o.total != null ? o.total : "—"} ${o.currency || ""}`, W - M, y, { align: "right" });

  // Pie con sello ProductSpot
  const fy = 198;
  doc.setDrawColor(229, 231, 235);
  doc.line(M, fy - 6, W - M, fy - 6);
  psPdfIsotipo(doc, M, fy - 3.2, 4.6, [15, 23, 42], coral);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...gray);
  doc.text("Hecho con ProductSpot · productspot.pages.dev", M + 7, fy);
  if (storeSettings?.whatsapp) doc.text(`WhatsApp: +${storeSettings.whatsapp}`, W - M, fy, { align: "right" });

  doc.save(`pedido-${o.id}-${(storeSettings?.slug || "tienda")}.pdf`);
}

async function deductStock(items) {
  for (const it of Array.isArray(items) ? items : []) {
    const pid = it.id;
    const q = Number(it.q) || 1;
    if (!pid) continue; // pedidos antiguos sin id de producto
    const { data: prod } = await sb.from("products").select("id, stock").eq("id", pid).single();
    if (!prod || prod.stock == null) continue;
    await sb.from("products").update({ stock: Math.max(0, prod.stock - q) }).eq("id", pid);
  }
}

// ===== QR DEL CATÁLOGO =====
function initCatalogQR() {
  const container = document.getElementById("qrContainer");
  if (!container || typeof QRCode === "undefined") return;
  const link = document.getElementById("catalogLink")?.textContent || "";
  if (!link.startsWith("http")) { container.innerHTML = ""; return; }
  container.innerHTML = "";
  // Se genera grande (592px) para que impreso se vea nítido; el CSS lo muestra a 148px.
  new QRCode(container, { text: link, width: 592, height: 592, correctLevel: QRCode.CorrectLevel.M });
}

document.getElementById("btnDownloadQR")?.addEventListener("click", () => {
  const canvas = document.querySelector("#qrContainer canvas");
  const img = document.querySelector("#qrContainer img");
  const dataUrl = canvas ? canvas.toDataURL("image/png") : (img ? img.src : null);
  if (!dataUrl) { showToast("Guarda tu tienda primero para generar el QR", "error"); return; }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `qr-${storeSettings?.slug || "catalogo"}.png`;
  a.click();
  showToast("QR descargado ✓", "success");
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
