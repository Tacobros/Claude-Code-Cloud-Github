const categoryLabels = {
  laliga: "LaLiga",
  premier: "Premier League",
  ligue1: "Ligue 1",
  selecciones: "Selecciones",
  local: "Liga Nacional",
};

let activeFilter = "all";
let searchQuery = "";
let liveProducts = [];
let storeWA = "50200000000";
let storeName = "CAS";
let storeUserId = null;

// ===== STORE SETTINGS =====
function getStoreSlug() {
  // ?s= param takes priority — works on pages.dev and local dev
  const paramSlug = new URLSearchParams(window.location.search).get("s");
  if (paramSlug) return paramSlug;

  // Subdomain detection for production custom domain only
  // (e.g. casgt.productspot.com = 3 parts, casgt.productspot.pages.dev = 4 parts)
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 4 && parts[0] !== "www") return parts[0]; // client.productspot.pages.dev
  if (parts.length === 3 && !host.endsWith(".pages.dev") && parts[0] !== "www") return parts[0]; // client.productspot.com

  return null;
}

async function loadStoreSettings() {
  try {
    if (typeof sb === "undefined" || SUPABASE_URL.includes("YOUR_PROJECT_ID")) return;
    const slug = getStoreSlug();
    if (!slug) {
      window.location.href = "landing.html";
      return;
    }
    let query = sb.from("stores").select("*");
    query = query.eq("slug", slug);
    const { data } = await query.single();
    if (!data) {
      window.location.href = "landing.html";
      return;
    }

    storeName = data.name || "";
    storeWA = data.whatsapp || storeWA;
    storeUserId = data.user_id;

    document.title = storeName ? `${storeName}` : "Mi tienda";
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.textContent = storeName || "Mi tienda";

    // Show gallery section only if store has it enabled
    const jerseyGrid = document.getElementById("aboutJerseyGrid");
    if (jerseyGrid && data.show_gallery) jerseyGrid.style.display = "";

    // Logo
    if (data.logo_url) {
      const logoIcon = document.getElementById("siteLogoIcon");
      if (logoIcon) {
        logoIcon.innerHTML = `<img src="${data.logo_url}" alt="${storeName}" style="width:32px;height:32px;object-fit:contain;border-radius:6px;" />`;
      }
    }
    const logoText = document.getElementById("siteLogoText");
    if (logoText) logoText.textContent = storeName;
    const footerLogoText = document.getElementById("footerLogoText");
    if (footerLogoText) footerLogoText.textContent = storeName;
    const footerCopy = document.getElementById("footerCopy");
    if (footerCopy) footerCopy.textContent = storeName ? `© 2025 ${storeName}` : "";

    // Hero content
    const heroTitle = document.getElementById("heroTitle");
    if (heroTitle && data.hero_title) heroTitle.textContent = data.hero_title;
    const heroSubtitle = document.getElementById("heroSubtitle");
    if (heroSubtitle && data.hero_subtitle) heroSubtitle.textContent = data.hero_subtitle;

    // Hero image
    const heroImg = document.getElementById("heroProductImg");
    if (heroImg) {
      if (data.hero_image_url) {
        heroImg.src = data.hero_image_url;
        heroImg.style.display = "";
      } else {
        heroImg.style.display = "none";
      }
    }

    // Accent color
    if (data.accent_color) {
      document.documentElement.style.setProperty("--accent", data.accent_color);
    }

    // Custom categories — add filter buttons for extras
    if (data.custom_categories && data.custom_categories.length > 0) {
      const bar = document.getElementById("filtersBar");
      if (bar) {
        data.custom_categories.forEach((cat) => {
          const btn = document.createElement("button");
          btn.className = "filter-btn";
          btn.dataset.filter = cat;
          btn.textContent = cat;
          btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            activeFilter = cat;
            renderProducts();
          });
          bar.appendChild(btn);
        });
      }
    }

    // About section
    const aboutFields = [
      ["aboutTitle", "about_title"],
      ["about1Title", "about1_title"], ["about1Desc", "about1_desc"],
      ["about2Title", "about2_title"], ["about2Desc", "about2_desc"],
      ["about3Title", "about3_title"], ["about3Desc", "about3_desc"],
      ["about4Title", "about4_title"], ["about4Desc", "about4_desc"],
    ];
    aboutFields.forEach(([elId, dbKey]) => {
      if (data[dbKey]) {
        const el = document.getElementById(elId);
        if (el) el.textContent = data[dbKey];
      }
    });

    // Stats
    const statFields = [
      ["stat1Value", "stat1_value"], ["stat1Label", "stat1_label"],
      ["stat2Value", "stat2_value"], ["stat2Label", "stat2_label"],
      ["stat3Value", "stat3_value"], ["stat3Label", "stat3_label"],
      ["stat4Value", "stat4_value"], ["stat4Label", "stat4_label"],
    ];
    statFields.forEach(([elId, dbKey]) => {
      if (data[dbKey]) {
        const el = document.getElementById(elId);
        if (el) el.textContent = data[dbKey];
      }
    });

    // WhatsApp links
    updateWALinks();
  } catch (_) {}
}

function updateWALinks() {
  const waBaseMsg = encodeURIComponent(`Hola! Vi el catálogo de ${storeName} y me interesa una camisola`);
  const waUrl = `https://wa.me/${storeWA}?text=${waBaseMsg}`;

  const heroBtn = document.getElementById("heroWaBtn");
  if (heroBtn) heroBtn.href = waUrl;
  const ctaBtn = document.getElementById("ctaWaBtn");
  if (ctaBtn) ctaBtn.href = waUrl;
  const floatBtn = document.getElementById("floatWaBtn");
  if (floatBtn) floatBtn.href = waUrl;
  const emptyLink = document.getElementById("emptyWaLink");
  if (emptyLink) emptyLink.href = `https://wa.me/${storeWA}?text=${encodeURIComponent("Busco una camisola específica")}`;
}

// ===== PRODUCTS =====
async function loadProducts() {
  try {
    if (typeof sb === "undefined" || SUPABASE_URL.includes("YOUR_PROJECT_ID")) {
      renderProducts();
      return;
    }
    let productsQuery = sb.from("products").select("*").eq("available", true).order("created_at", { ascending: false });
    if (storeUserId) productsQuery = productsQuery.eq("user_id", storeUserId);
    const { data } = await productsQuery;
    if (data && data.length > 0) {
      liveProducts = data.map((p) => ({
        ...p,
        price: `Q${p.price}`,
        league: categoryLabels[p.category] || p.category,
        badgeText: p.badge === "popular" ? "Más vendida" : p.badge === "new" ? "Nueva" : p.badge || "",
        desc: p.description || "",
        sizes: p.sizes || [],
        images: p.image_urls && p.image_urls.length > 0 ? p.image_urls : (p.image_url ? [p.image_url] : []),
      }));
    }
  } catch (_) {}
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const empty = document.getElementById("emptyState");

  const filtered = liveProducts.filter((p) => {
    const matchCat = activeFilter === "all" || p.category === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.league || "").toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  grid.innerHTML = filtered.map((p) => {
    const thumb = p.images && p.images.length > 0 ? p.images[0] : null;
    return `
      <div class="product-card" onclick="openModal(${p.id})">
        ${p.badge ? `<div class="product-badge ${p.badge}">${p.badgeText}</div>` : ""}
        <div class="product-image">
          ${thumb
            ? `<img src="${thumb}" alt="${p.name}" class="product-img" />`
            : `<div class="product-img-placeholder">👕</div>`}
        </div>
        <div class="product-body">
          <div class="product-league">${p.league}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.desc}</div>
          <div class="product-sizes">
            ${(p.sizes || []).map((s) => `<span class="size-chip">${s}</span>`).join("")}
          </div>
          <div class="product-footer">
            <div class="product-price">${p.price} <span>GTQ</span></div>
            <a class="btn-ask" href="${waLink(p)}" target="_blank" onclick="event.stopPropagation()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Pedir
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function waLink(p, size = "") {
  const msg = size
    ? `Hola! Vi el catálogo de ${storeName} y quiero pedir: *${p.name}* talla *${size}* - Precio: ${p.price}`
    : `Hola! Vi el catálogo de ${storeName} y me interesa: *${p.name}* - Precio: ${p.price}`;
  return `https://wa.me/${storeWA}?text=${encodeURIComponent(msg)}`;
}

function openModal(id) {
  const p = liveProducts.find((x) => x.id === id);
  if (!p) return;

  const images = p.images && p.images.length > 0 ? p.images : [];

  const imageHtml = images.length > 0
    ? `<div class="modal-gallery">
        <img id="modalMainImg" src="${images[0]}" alt="${p.name}" class="modal-main-img" />
        ${images.length > 1 ? `<div class="modal-thumbs-row">${images.map((url, i) => `<img src="${url}" class="modal-thumb-img${i === 0 ? " active" : ""}" onclick="setMainImg(this,'${url}')" />`).join("")}</div>` : ""}
      </div>`
    : `<div class="modal-product-image" style="background:linear-gradient(135deg,#1a1a2e,#0f3460)">👕</div>`;

  const content = document.getElementById("modalContent");
  content.innerHTML = `
    ${imageHtml}
    <div class="modal-body">
      <div class="modal-league">${p.league}</div>
      <div class="modal-name">${p.name}</div>
      <div class="modal-desc">${p.desc}</div>
      <div class="modal-section-title">Tallas disponibles</div>
      <div class="modal-sizes" id="modalSizes">
        ${(p.sizes || []).map((s) => `<button class="modal-size" onclick="selectSize(this,'${s}')">${s}</button>`).join("")}
      </div>
      <div class="modal-price-row">
        <div class="modal-price">${p.price} <small style="font-size:.75rem;color:#9ca3af;font-weight:500">GTQ</small></div>
        <a class="btn-modal-wa" id="modalWaBtn" href="${waLink(p)}" target="_blank">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Pedir por WhatsApp
        </a>
      </div>
    </div>
  `;

  document.getElementById("modalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  window._currentProduct = p;
}

function setMainImg(thumb, url) {
  document.getElementById("modalMainImg").src = url;
  document.querySelectorAll(".modal-thumb-img").forEach((t) => t.classList.remove("active"));
  thumb.classList.add("active");
}

function selectSize(btn, size) {
  document.querySelectorAll(".modal-size").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  const p = window._currentProduct;
  if (p) document.getElementById("modalWaBtn").href = waLink(p, size);
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modalOverlay")) closeModal();
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderProducts();
  });
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderProducts();
});

const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");
burger.addEventListener("click", () => mobileMenu.classList.toggle("open"));

function closeMobileMenu() {
  mobileMenu.classList.remove("open");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Initialize
updateWALinks();
loadStoreSettings().then(() => loadProducts());
