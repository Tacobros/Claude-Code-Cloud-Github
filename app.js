let activeFilter = "all";
let searchQuery = "";
let liveProducts = [];
let storeWA = "50200000000";
let storeWaMessage = "";
let storeName = "CAS";
let storeUserId = null;
let storeDbId = null;
let storeCurrency = "GTQ";

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
function currencySymbol() {
  return CURRENCY_SYMBOLS[storeCurrency] || "";
}

// Columnas públicas de `stores` (deben coincidir con el GRANT de
// 006_secure_stores_and_currency.sql — select("*") ya no funciona)
const STORE_PUBLIC_COLS = `id, user_id, name, slug, whatsapp, wa_message, description,
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

function logEvent(eventType, productId = null) {
  if (!storeDbId) return;
  const payload = { store_id: storeDbId, event_type: eventType };
  if (productId) payload.product_id = productId;
  sb.from("store_events").insert(payload).then(() => {});
}

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
    let query = sb.from("stores").select(STORE_PUBLIC_COLS);
    query = query.eq("slug", slug);
    const { data } = await query.single();
    if (!data) {
      window.location.href = `404.html?s=${encodeURIComponent(slug)}`;
      return;
    }

    // Tiendas suspendidas por el superadmin no se muestran al público
    if (data.status === "suspended") {
      window.location.href = `404.html?s=${encodeURIComponent(slug)}`;
      return;
    }

    storeName = data.name || "";
    storeWA = String(data.whatsapp || "").replace(/\D/g, "") || storeWA;
    storeWaMessage = data.wa_message || "";
    storeCurrency = data.currency || "GTQ";
    storeUserId = data.user_id;
    storeDbId = data.id;
    storePayMethods = Array.isArray(data.payment_methods) ? data.payment_methods.filter(Boolean) : [];
    logEvent("catalog_view");

    document.title = storeName ? `${storeName}` : "Mi tienda";
    setMetaTags({
      title: storeName || "Mi tienda",
      description: data.hero_subtitle || `Explora el catálogo de ${storeName} y haz tu pedido por WhatsApp.`,
      image: data.hero_image_url || data.logo_url || "",
      url: window.location.href,
    });
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.textContent = storeName || "Mi tienda";

    // Gallery: render items y mostrar si hay imágenes y show_gallery está activo
    const jerseyGrid = document.getElementById("aboutJerseyGrid");
    let hasGalleryItems = false;
    [1,2,3,4].forEach((n) => {
      const imgUrl = data[`gallery${n}_img`];
      const title = data[`gallery${n}_title`];
      const item = document.getElementById(`galleryItem${n}`);
      const img = document.getElementById(`galleryItemImg${n}`);
      const span = document.getElementById(`galleryItemTitle${n}`);
      if (item && imgUrl) {
        img.src = imgUrl;
        img.alt = title || "";
        if (span) span.textContent = title || "";
        item.style.display = "";
        hasGalleryItems = true;
      }
    });
    if (jerseyGrid && data.show_gallery && hasGalleryItems) jerseyGrid.style.display = "";
    // Si no hay galería, about-content ocupa todo el ancho
    const aboutInner = document.querySelector(".about-inner");
    if (aboutInner && (!data.show_gallery || !hasGalleryItems)) {
      aboutInner.style.gridTemplateColumns = "1fr";
    }

    // Logo — solo visible si la tienda tiene una imagen configurada
    const headerIcon = document.getElementById("siteLogoIcon");
    const footerIcon = document.getElementById("footerLogoIcon");
    if (data.logo_url) {
      if (headerIcon) { headerIcon.innerHTML = `<img src="${escapeHtml(data.logo_url)}" alt="${escapeHtml(storeName)}" style="width:32px;height:32px;object-fit:contain;border-radius:6px;" />`; headerIcon.style.display = ""; }
      if (footerIcon) { footerIcon.innerHTML = `<img src="${escapeHtml(data.logo_url)}" alt="${escapeHtml(storeName)}" style="width:24px;height:24px;object-fit:contain;border-radius:4px;" />`; footerIcon.style.display = ""; }
    } else {
      if (headerIcon) headerIcon.style.display = "none";
      if (footerIcon) footerIcon.style.display = "none";
    }
    const logoText = document.getElementById("siteLogoText");
    if (logoText) logoText.textContent = storeName;
    const footerLogoText = document.getElementById("footerLogoText");
    if (footerLogoText) footerLogoText.textContent = storeName;

    // Sello ProductSpot — solo en tiendas con plan gratuito.
    // El enlace apunta a la landing en el dominio raíz de la plataforma
    // (con UTM para medir cuántos registros trae el sello).
    const productspotBadge = document.getElementById("productspotBadge");
    if (productspotBadge && (!data.plan || data.plan === "free")) {
      const badgeLink = productspotBadge.querySelector("a");
      if (badgeLink) {
        const host = window.location.hostname;
        const parts = host.split(".");
        const minParts = host.endsWith(".pages.dev") ? 4 : 3;
        const rootDomain = parts.length >= minParts ? parts.slice(1).join(".") : host;
        badgeLink.href = `https://${rootDomain}/landing.html?utm_source=badge`;
      }
      productspotBadge.style.display = "";
    }
    const footerCopy = document.getElementById("footerCopy");
    if (footerCopy) footerCopy.textContent = storeName ? `© ${new Date().getFullYear()} ${storeName}` : "";

    // Hero content
    const heroBadge = document.getElementById("heroBadge");
    if (heroBadge) heroBadge.textContent = data.hero_badge || "Bienvenidos";
    const heroTitle = document.getElementById("heroTitle");
    if (heroTitle) heroTitle.textContent = data.hero_title || "Bienvenido a nuestra tienda";
    const heroSubtitle = document.getElementById("heroSubtitle");
    if (heroSubtitle) heroSubtitle.textContent = data.hero_subtitle || "Explora nuestro catálogo y contáctanos por WhatsApp para hacer tu pedido.";

    // Catalog section
    const catalogTitle = document.getElementById("catalogTitle");
    if (catalogTitle) catalogTitle.textContent = data.catalog_title || "Catálogo";
    const catalogSubtitle = document.getElementById("catalogSubtitle");
    if (catalogSubtitle) catalogSubtitle.textContent = data.catalog_subtitle || "Explora nuestros productos";

    // CTA section
    const ctaTitle = document.getElementById("ctaTitle");
    if (ctaTitle) ctaTitle.textContent = data.cta_title || "¿Listo para hacer tu pedido?";
    const ctaDesc = document.getElementById("ctaDesc");
    if (ctaDesc) ctaDesc.textContent = data.cta_desc || "Escríbenos por WhatsApp y te atendemos al instante.";

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

    // Categorías: construir solo desde custom_categories de la tienda
    const bar = document.getElementById("filtersBar");
    if (bar) {
      // Limpiar todos los filtros excepto "Todos"
      bar.querySelectorAll(".filter-btn:not([data-filter='all'])").forEach((b) => b.remove());
      if (data.custom_categories && data.custom_categories.length > 0) {
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
      ["about1Icon", "about1_icon"], ["about1Title", "about1_title"], ["about1Desc", "about1_desc"],
      ["about2Icon", "about2_icon"], ["about2Title", "about2_title"], ["about2Desc", "about2_desc"],
      ["about3Icon", "about3_icon"], ["about3Title", "about3_title"], ["about3Desc", "about3_desc"],
      ["about4Icon", "about4_icon"], ["about4Title", "about4_title"], ["about4Desc", "about4_desc"],
    ];
    aboutFields.forEach(([elId, dbKey]) => {
      const el = document.getElementById(elId);
      if (el && data[dbKey]) el.textContent = data[dbKey];
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

function setMetaTags({ title, description, image, url }) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.setAttribute('content', val); };
  if (title) document.title = title;
  set('metaDesc', description); set('ogTitle', title); set('ogDesc', description);
  set('ogImage', image); set('ogUrl', url || window.location.href);
  set('twTitle', title); set('twDesc', description); set('twImage', image);
}

function updateWALinks() {
  const defaultMsg = storeWaMessage || `Hola! Me interesa hacer un pedido en ${storeName}`;
  const waUrl = `https://wa.me/${storeWA}?text=${encodeURIComponent(defaultMsg)}`;

  const heroBtn = document.getElementById("heroWaBtn");
  if (heroBtn) { heroBtn.href = waUrl; heroBtn.addEventListener("click", () => logEvent("whatsapp_click"), { once: true }); }
  const ctaBtn = document.getElementById("ctaWaBtn");
  if (ctaBtn) { ctaBtn.href = waUrl; ctaBtn.addEventListener("click", () => logEvent("whatsapp_click"), { once: true }); }
  const floatBtn = document.getElementById("floatWaBtn");
  if (floatBtn) { floatBtn.href = waUrl; floatBtn.addEventListener("click", () => logEvent("whatsapp_click"), { once: true }); }
  const emptyLink = document.getElementById("emptyWaLink");
  if (emptyLink) emptyLink.href = waUrl;
}

// ===== PRODUCTS =====
async function loadProducts() {
  try {
    if (typeof sb === "undefined" || SUPABASE_URL.includes("YOUR_PROJECT_ID")) {
      renderProducts();
      return;
    }
    let productsQuery = sb.from("products").select("*").eq("available", true).order("sort_order", { ascending: true, nullsFirst: true }).order("created_at", { ascending: false });
    if (storeUserId) productsQuery = productsQuery.eq("user_id", storeUserId);
    const { data } = await productsQuery;
    if (data && data.length > 0) {
      liveProducts = data.map((p) => ({
        ...p,
        priceNum: Number(p.price) || 0,
        price: `${currencySymbol()}${p.price}`,
        league: p.category || "",
        badgeText: p.badge === "popular" ? "Más vendida" : p.badge === "new" ? "Nueva" : p.badge || "",
        desc: p.description || "",
        sizes: p.sizes || [],
        images: p.image_urls && p.image_urls.length > 0 ? p.image_urls : (p.image_url ? [p.image_url] : []),
      }));
    }
  } catch (_) {}
  renderProducts();

  const autoOpenId = new URLSearchParams(window.location.search).get("p");
  if (autoOpenId) openModal(autoOpenId);
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

  grid.innerHTML = filtered.map((p, i) => {
    const hasGroups = (p.option_groups || []).length > 0;
    const soldOut = p.stock === 0;
    const lowStock = p.stock != null && p.stock > 0 && p.stock <= 3;
    const thumb = p.images && p.images.length > 0 ? p.images[0] : null;
    return `
      <div class="product-card" onclick="openModal(${Number(p.id)})" style="--i:${i}">
        ${p.badge ? `<div class="product-badge ${escapeHtml(p.badge)}">${escapeHtml(p.badgeText)}</div>` : ""}
        <div class="product-image">
          ${soldOut ? '<span class="stock-chip out">Agotado</span>' : (lowStock ? `<span class="stock-chip low">¡Quedan ${p.stock}!</span>` : "")}
          ${thumb
            ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.name)}" class="product-img" loading="lazy" />`
            : `<div class="product-img-placeholder">${psIcon("image", 34)}</div>`}
        </div>
        <div class="product-body">
          <div class="product-league">${escapeHtml(p.league)}</div>
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-desc">${escapeHtml(p.desc)}</div>
          <div class="product-sizes">
            ${(p.sizes || []).map((s) => `<span class="size-chip">${escapeHtml(s)}</span>`).join("")}
          </div>
          <div class="product-footer">
            <div class="product-price">${hasSurcharges(p) ? '<small class="price-from">Desde</small> ' : ""}${escapeHtml(p.price)} <span>${escapeHtml(storeCurrency)}</span></div>
            ${soldOut ? "" : `<button class="btn-add" title="Agregar al pedido" aria-label="Agregar al pedido" onclick="event.stopPropagation(); addToCart(${Number(p.id)}, null, this)">+</button>`}
            ${soldOut ? '<span class="btn-ask sold-out-label">Agotado</span>' : `<a class="btn-ask" href="${hasGroups ? "#" : escapeHtml(waLink(p))}" ${hasGroups ? "" : 'target="_blank"'} onclick="event.stopPropagation(); ${hasGroups ? `openModal('${p.id}'); return false;` : `trackOrder(${Number(p.id)}, null)`}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Pedir
            </a>`}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function waLink(p, sel = "", priceText = "") {
  const price = priceText || p.price;
  let msg;
  if (sel) {
    const detalles = sel.split(" · ").map((part) => `   › ${part}`).join("\n");
    msg = `Hola! Vi el catálogo de *${storeName}* y quiero pedir:\n\n*${p.name}* — ${price}\n${detalles}`;
  } else {
    msg = `Hola! Vi el catálogo de *${storeName}* y me interesa:\n\n*${p.name}* — ${price}`;
  }
  return `https://wa.me/${storeWA}?text=${encodeURIComponent(msg)}`;
}

// ── Selección de variante y grupos de opciones (combos) ──
function groupChoose(g) {
  return Math.max(1, Math.min(parseInt(g.choose) || 1, (g.options || []).length));
}

// Opciones: string simple o {n, d} con recargo sobre el precio base
function optName(o) { return typeof o === "string" ? o : (o?.n || ""); }
function optDelta(o) { return typeof o === "object" && o ? Number(o.d) || 0 : 0; }

// Precio unitario según lo seleccionado (base + recargos)
function unitPrice(p) {
  let total = Number(p.priceNum) || 0;
  (p.option_groups || []).forEach((g, gi) => {
    (window._optSel?.[gi] || []).forEach((oi) => { total += optDelta(g.options?.[oi]); });
  });
  return Math.max(0, total);
}

function hasSurcharges(p) {
  return (p.option_groups || []).some((g) => (g.options || []).some((o) => optDelta(o) > 0));
}

// Un grupo "remove" (quitar ingredientes) es opcional y de selección libre
function groupRequired(g) { return g.mode === "remove" ? 0 : groupChoose(g); }
function groupMax(g) { return g.mode === "remove" ? (g.options || []).length : groupChoose(g); }

function groupsComplete(p) {
  return (p.option_groups || []).every((g, gi) => (window._optSel?.[gi] || []).length >= groupRequired(g));
}

function selectionText(p) {
  const parts = [];
  if (window._selectedSize) parts.push(`${p.variant_label || "Talla"}: ${window._selectedSize}`);
  (p.option_groups || []).forEach((g, gi) => {
    const chosen = (window._optSel?.[gi] || []).map((oi) => optName(g.options[oi])).filter(Boolean);
    if (!chosen.length) return;
    if (g.mode === "remove") parts.push(`${g.label}: sin ${chosen.join(", sin ")}`);
    else parts.push(`${g.label}: ${chosen.join(", ")}`);
  });
  return parts.join(" · ");
}

function toggleOpt(gi, oi, btn) {
  const p = window._currentProduct;
  if (!p || !p.option_groups?.[gi]) return;
  const g = p.option_groups[gi];
  if (!window._optSel) window._optSel = {};
  const sel = window._optSel[gi] || (window._optSel[gi] = []);
  const max = groupMax(g);
  const pos = sel.indexOf(oi);
  if (pos >= 0) {
    sel.splice(pos, 1);
    btn.classList.remove("selected");
  } else {
    if (g.mode === "remove") {
      sel.push(oi);
      btn.classList.add("selected");
      updateModalSelection();
      return;
    }
    if (max === 1) {
      sel.length = 0;
      document.querySelectorAll(`.modal-size[data-g="${gi}"]`).forEach((b) => b.classList.remove("selected"));
    } else if (sel.length >= max) {
      // reemplaza la selección más antigua para no bloquear el cambio
      const oldest = sel.shift();
      document.querySelectorAll(`.modal-size[data-g="${gi}"]`)[oldest]?.classList.remove("selected");
    }
    sel.push(oi);
    btn.classList.add("selected");
  }
  updateModalSelection();
}

function updateModalSelection() {
  const p = window._currentProduct;
  if (!p) return;
  const ready = groupsComplete(p) && p.stock !== 0;
  const unit = unitPrice(p);
  const priceText = `${currencySymbol()}${unit}`;
  const priceEl = document.getElementById("modalPriceVal");
  if (priceEl) priceEl.textContent = priceText;
  const wa = document.getElementById("modalWaBtn");
  const add = document.getElementById("modalAddBtn");
  if (wa) {
    wa.href = waLink(p, selectionText(p), priceText);
    wa.classList.toggle("btn-needs-options", !ready);
  }
  if (add) add.classList.toggle("btn-needs-options", !ready);
}

function flashIncompleteGroups() {
  const p = window._currentProduct;
  if (!p) return;
  (p.option_groups || []).forEach((g, gi) => {
    if ((window._optSel?.[gi] || []).length < groupRequired(g)) {
      const el = document.getElementById(`ogTitle-${gi}`);
      if (el) {
        el.classList.add("og-missing");
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setTimeout(() => el.classList.remove("og-missing"), 900);
      }
    }
  });
}

// Registra el pedido (botones "Pedir" individuales) para la página Pedidos del admin
function trackOrder(productId, sel, unit, token) {
  const p = liveProducts.find((x) => String(x.id) === String(productId));
  if (!p || !storeDbId) return;
  const u = unit != null ? unit : p.priceNum;
  const row = {
    store_id: storeDbId,
    items: [{ id: p.id, n: p.name, q: 1, v: sel || null, p: u }],
    total: u,
    currency: storeCurrency,
  };
  if (token) row.token = token;
  sb.from("orders").insert(row).then(() => {});
  logEvent("whatsapp_click", p.id);
}

function getProductUrl(productId) {
  const params = new URLSearchParams(window.location.search);
  params.set("p", productId);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function copyProductLink(productId) {
  const url = getProductUrl(productId);
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById("shareLinkBtn");
    if (!btn) return;
    btn.textContent = "¡Enlace copiado!";
    setTimeout(() => { btn.textContent = "Compartir enlace"; }, 2000);
  });
}

function openModal(id) {
  const p = liveProducts.find((x) => String(x.id) === String(id));
  if (!p) return;

  const images = p.images && p.images.length > 0 ? p.images : [];

  const imageHtml = images.length > 0
    ? `<div class="modal-gallery">
        <img id="modalMainImg" src="${escapeHtml(images[0])}" alt="${escapeHtml(p.name)}" class="modal-main-img" />
        ${images.length > 1 ? `<div class="modal-thumbs-row">${images.map((url, i) => `<img src="${escapeHtml(url)}" class="modal-thumb-img${i === 0 ? " active" : ""}" onclick="setMainImg(this,${i})" />`).join("")}</div>` : ""}
      </div>`
    : `<div class="modal-product-image" style="background:linear-gradient(135deg,#1a1a2e,#0f3460);color:#64748b;">${psIcon("image", 44)}</div>`;

  const sizesHtml = (p.sizes && p.sizes.length > 0)
    ? `<div class="modal-section-title">${escapeHtml(p.variant_label || "Tallas disponibles")}</div>
      <div class="modal-sizes" id="modalSizes">
        ${p.sizes.map((s, i) => `<button class="modal-size" onclick="selectSize(this,${i})">${escapeHtml(s)}</button>`).join("")}
      </div>`
    : "";

  const groupsHtml = (p.option_groups || []).map((g, gi) => `
    <div class="modal-section-title" id="ogTitle-${gi}">${escapeHtml(g.label)} <span class="choose-hint${g.mode === "remove" ? " choose-hint-opt" : ""}">${g.mode === "remove" ? "toca lo que NO quieres" : `elige ${groupChoose(g)}`}</span></div>
    <div class="modal-sizes">
      ${(g.options || []).map((o, oi) => `<button class="modal-size" data-g="${gi}" data-mode="${g.mode === "remove" ? "remove" : "pick"}" onclick="toggleOpt(${gi},${oi},this)">${escapeHtml(optName(o))}${optDelta(o) ? ` <span class="opt-delta">${optDelta(o) > 0 ? "+" : "−"}${currencySymbol()}${Math.abs(optDelta(o))}</span>` : ""}</button>`).join("")}
    </div>`).join("");

  const content = document.getElementById("modalContent");
  content.innerHTML = `
    ${imageHtml}
    <div class="modal-body">
      <div class="modal-league">${escapeHtml(p.league)}</div>
      <div class="modal-name">${escapeHtml(p.name)}</div>
      ${p.stock === 0 ? '<div class="modal-soldout">Agotado por el momento</div>' : (p.stock != null && p.stock <= 3 ? `<div class="modal-lowstock">¡Quedan solo ${p.stock}!</div>` : "")}
      <div class="modal-desc">${escapeHtml(p.desc)}</div>
      ${sizesHtml}
      ${groupsHtml}
      <div class="modal-price-row">
        <div class="modal-price"><span id="modalPriceVal">${escapeHtml(p.price)}</span> <small style="font-size:.75rem;color:#9ca3af;font-weight:500">${escapeHtml(storeCurrency)}</small></div>
        <a class="btn-modal-wa" id="modalWaBtn" href="${escapeHtml(waLink(p))}" target="_blank">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Pedir por WhatsApp
        </a>
      </div>
      <button class="btn-share-link" id="modalAddBtn" onclick="addToCartFromModal(this)">＋ Agregar al pedido</button>
      <button class="btn-share-link" id="shareLinkBtn" onclick="copyProductLink('${p.id}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Compartir enlace
      </button>
    </div>
  `;

  window._selectedSize = null;
  window._optSel = {};
  window._currentProduct = p;
  updateModalSelection();
  document.getElementById("modalWaBtn")?.addEventListener("click", (e) => {
    if (p.stock === 0) { e.preventDefault(); return; }
    if (!groupsComplete(p)) { e.preventDefault(); flashIncompleteGroups(); return; }
    // Enlace al comprobante: se genera el token aquí y se reescribe el href
    // antes de que el navegador procese la navegación
    const token = storeDbId ? genOrderToken() : null;
    if (token) {
      const base = waLink(p, selectionText(p), `${currencySymbol()}${unitPrice(p)}`);
      const extra = encodeURIComponent(`\n\nVer pedido completo:\n${receiptUrl(token)}`);
      e.currentTarget.href = base + extra;
    }
    trackOrder(p.id, selectionText(p) || null, unitPrice(p), token);
  });

  logEvent("product_view", p.id);

  // Update URL and meta tags for product sharing
  const newUrl = getProductUrl(p.id);
  history.pushState({ productId: p.id }, "", newUrl);
  setMetaTags({
    title: `${p.name} — ${storeName}`,
    description: p.desc || `${p.name} · ${p.price} ${storeCurrency}`,
    image: p.images?.[0] || "",
    url: newUrl,
  });

  document.getElementById("modalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  window._currentProduct = p;
}

function setMainImg(thumb, index) {
  const p = window._currentProduct;
  if (!p || !p.images || !p.images[index]) return;
  document.getElementById("modalMainImg").src = p.images[index];
  document.querySelectorAll(".modal-thumb-img").forEach((t) => t.classList.remove("active"));
  thumb.classList.add("active");
}

function selectSize(btn, index) {
  document.querySelectorAll(".modal-size").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  const p = window._currentProduct;
  if (p && p.sizes && p.sizes[index] != null) {
    window._selectedSize = p.sizes[index];
    updateModalSelection();
  }
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.body.style.overflow = "";
  const params = new URLSearchParams(window.location.search);
  params.delete("p");
  const base = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
  history.pushState({}, "", base);
  // Restore store-level meta tags
  setMetaTags({ title: storeName, url: base });
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
loadStoreSettings().then(() => {
  loadProducts();
  loadCart();
  if (new URLSearchParams(window.location.search).get('preview') === '1') {
    initPreviewMode();
  }
});

// ── VISUAL EDITOR PREVIEW MODE ────────────────────────────────────────────────
function initPreviewMode() {
  document.body.classList.add('preview-mode');

  const sectionMap = {
    hero: '.hero', catalog: '.catalog',
    stats: '.stats', about: '.about', contact: '.contact',
  };

  const sectionLabels = {
    hero: 'Encabezado', catalog: 'Catálogo',
    stats: 'Estadísticas', about: 'Nosotros', contact: 'Contacto',
  };

  Object.entries(sectionMap).forEach(([blockId, sel]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.setAttribute('data-editor-block', blockId);
    el.setAttribute('data-label', sectionLabels[blockId] || blockId);
    el.classList.add('editor-section');
    el.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, select')) return;
      window.parent.postMessage({ type: 'PS_SECTION_CLICK', block: blockId }, '*');
    });
  });

  window.addEventListener('message', (e) => {
    if (!e.data || typeof e.data !== 'object') return;
    const { type, field, value, block } = e.data;

    if (type === 'PS_UPDATE') applyPreviewUpdate(field, value);

    if (type === 'PS_HIGHLIGHT') {
      document.querySelectorAll('.editor-section').forEach(s => s.classList.remove('editor-active'));
      if (block && sectionMap[block]) {
        const el = document.querySelector(sectionMap[block]);
        if (el) {
          el.classList.add('editor-active');
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  });
}

function applyPreviewUpdate(field, value) {
  const el = (id) => document.getElementById(id);
  const setText = (id, v) => { const e = el(id); if (e) e.textContent = v; };

  switch (field) {
    case 'hero_badge':    setText('heroBadge', value); break;
    case 'hero_title':    setText('heroTitle', value); break;
    case 'hero_subtitle': setText('heroSubtitle', value); break;
    case 'hero_image_url': {
      const img = el('heroProductImg');
      if (img) { img.src = value || ''; img.style.display = value ? '' : 'none'; }
      break;
    }
    case 'catalog_title':    setText('catalogTitle', value); break;
    case 'catalog_subtitle': setText('catalogSubtitle', value); break;
    case 'cta_title': setText('ctaTitle', value); break;
    case 'cta_desc':  setText('ctaDesc', value); break;
    case 'about_title': setText('aboutTitle', value); break;
    case 'name': {
      setText('siteLogoText', value);
      setText('footerLogoText', value);
      document.title = value || 'Mi tienda';
      break;
    }
    case 'accent_color': {
      document.documentElement.style.setProperty('--accent', value);
      break;
    }
    case 'logo_url': {
      const render = (id, size) => {
        const e = el(id);
        if (!e) return;
        e.innerHTML = value
          ? `<img src="${value}" style="width:${size};height:${size};object-fit:contain;border-radius:6px;">`
          : '';
        e.style.display = value ? '' : 'none';
      };
      render('siteLogoIcon', '32px');
      render('footerLogoIcon', '24px');
      break;
    }
    case 'show_gallery': {
      const grid = el('aboutJerseyGrid');
      const inner = document.querySelector('.about-inner');
      if (grid) grid.style.display = value ? '' : 'none';
      if (inner) inner.style.gridTemplateColumns = value ? '' : '1fr';
      break;
    }
    default: {
      // about1_icon, about1_title, about1_desc … about4_*
      const aboutM = field.match(/^about([1-4])_(icon|title|desc)$/);
      if (aboutM) {
        const map = { icon: 'Icon', title: 'Title', desc: 'Desc' };
        setText(`about${aboutM[1]}${map[aboutM[2]]}`, value);
        break;
      }
      // stat1_value, stat1_label … stat4_*
      const statM = field.match(/^stat([1-4])_(value|label)$/);
      if (statM) {
        const map = { value: 'Value', label: 'Label' };
        setText(`stat${statM[1]}${map[statM[2]]}`, value);
        break;
      }
      // gallery1_img, gallery1_title … gallery4_*
      const galImgM = field.match(/^gallery([1-4])_img$/);
      if (galImgM) {
        const n = galImgM[1];
        const img = el(`galleryItemImg${n}`);
        const item = el(`galleryItem${n}`);
        if (img) img.src = value || '';
        if (item) item.style.display = value ? '' : 'none';
        break;
      }
      const galTitleM = field.match(/^gallery([1-4])_title$/);
      if (galTitleM) {
        setText(`galleryItemTitle${galTitleM[1]}`, value);
        break;
      }
    }
  }
}

// Handle browser back/forward for product modal
window.addEventListener("popstate", () => {
  const productId = new URLSearchParams(window.location.search).get("p");
  if (productId) {
    openModal(productId);
  } else {
    document.getElementById("modalOverlay").classList.remove("open");
    document.body.style.overflow = "";
  }
});

// ── PEDIDO MULTI-PRODUCTO ────────────────────────────────────────────────────
let cart = [];

function cartStorageKey() { return `ps_cart_${storeDbId || "x"}`; }

function loadCart() {
  try { cart = JSON.parse(sessionStorage.getItem(cartStorageKey())) || []; } catch (_) { cart = []; }
  if (!Array.isArray(cart)) cart = [];
  loadCustomer();
  renderCartUI();
}

function saveCart() {
  try { sessionStorage.setItem(cartStorageKey(), JSON.stringify(cart)); } catch (_) {}
}

function addToCart(productId, sel = null, btnEl = null, unit = null) {
  const p = liveProducts.find((x) => String(x.id) === String(productId));
  if (!p) return;
  if (p.stock === 0) return; // agotado
  if ((p.option_groups || []).length > 0 && sel == null) { openModal(p.id); return; }
  const key = `${p.id}|${sel || ""}`;
  const existing = cart.find((i) => i.key === key);
  if (existing) existing.q += 1;
  else cart.push({ key, id: p.id, n: p.name, v: sel || null, q: 1, p: unit != null ? unit : p.priceNum });
  saveCart();
  renderCartUI();
  flashCartBar();
  if (btnEl) {
    btnEl.classList.add("added");
    const prev = btnEl.textContent;
    btnEl.textContent = "✓";
    setTimeout(() => { btnEl.classList.remove("added"); btnEl.textContent = prev; }, 900);
  }
}

function addToCartFromModal(btnEl) {
  const p = window._currentProduct;
  if (!p) return;
  if (p.stock === 0) return;
  if (!groupsComplete(p)) { flashIncompleteGroups(); return; }
  const sel = selectionText(p);
  addToCart(p.id, sel || null, null, unitPrice(p));
  if (btnEl) {
    const prev = btnEl.textContent;
    btnEl.textContent = "✓ Agregado al pedido";
    setTimeout(() => { btnEl.textContent = prev; }, 1200);
  }
}

// Métodos de pago aceptados por la tienda (si hay, el cliente elige al enviar)
let storePayMethods = [];
let selectedPayMethod = "";

function renderPaymentChips() {
  const wrap = document.getElementById("cartPayment");
  if (!wrap) return;
  if (!storePayMethods.length) { wrap.style.display = "none"; wrap.innerHTML = ""; return; }
  wrap.style.display = "";
  wrap.innerHTML = `
    <div class="cart-pay-label" id="cartPayLabel">¿Cómo pagarás?</div>
    <div class="cart-pay-chips">
      ${storePayMethods.map((m) => `<button type="button" class="cart-pay-chip${selectedPayMethod === m ? " selected" : ""}" onclick="selectPayMethod(this)">${escapeHtml(m)}</button>`).join("")}
    </div>`;
}

function selectPayMethod(btn) {
  selectedPayMethod = btn.textContent.trim();
  document.querySelectorAll(".cart-pay-chip").forEach((b) => b.classList.toggle("selected", b === btn));
  document.getElementById("cartPayLabel")?.classList.remove("pay-missing");
  renderCartUI();
}

// ── Datos del cliente final (nombre, teléfono, dirección de entrega) ──
function custStorageKey() { return `ps_cust_${storeDbId || "x"}`; }

function getCustomer() {
  return {
    name: (document.getElementById("custName")?.value || "").trim(),
    phone: (document.getElementById("custPhone")?.value || "").trim(),
    address: (document.getElementById("custAddress")?.value || "").trim(),
  };
}

function loadCustomer() {
  let c = {};
  try { c = JSON.parse(sessionStorage.getItem(custStorageKey())) || {}; } catch (_) {}
  const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
  set("custName", c.name); set("custPhone", c.phone); set("custAddress", c.address);
}

function saveCustomer() {
  try { sessionStorage.setItem(custStorageKey(), JSON.stringify(getCustomer())); } catch (_) {}
}

["custName", "custPhone", "custAddress"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", (e) => {
    e.target.classList.remove("field-missing");
    saveCustomer();
    const sendBtn = document.getElementById("btnSendCart");
    if (sendBtn) sendBtn.href = cartWaLink();
  });
});

// Token del comprobante: viaja en el mensaje y se guarda con el pedido
function genOrderToken() {
  try { return crypto.randomUUID().replace(/-/g, ""); }
  catch (_) { return Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""); }
}

function cartTokenKey() { return `ps_cart_token_${storeDbId || "x"}`; }
function getCartToken() {
  let t = "";
  try { t = sessionStorage.getItem(cartTokenKey()) || ""; } catch (_) {}
  if (!t || t.length < 20) {
    t = genOrderToken();
    try { sessionStorage.setItem(cartTokenKey(), t); } catch (_) {}
  }
  return t;
}
function clearCartToken() {
  try { sessionStorage.removeItem(cartTokenKey()); } catch (_) {}
}

function receiptUrl(token) {
  return `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}pedido?t=${token}`;
}

function cartCount() { return cart.reduce((s, i) => s + i.q, 0); }
function cartTotal() { return cart.reduce((s, i) => s + (Number(i.p) || 0) * i.q, 0); }

function changeCartQty(index, delta) {
  const item = cart[index];
  if (!item) return;
  item.q += delta;
  if (item.q <= 0) cart.splice(index, 1);
  saveCart();
  renderCartUI();
}

function removeCartItem(index) {
  cart.splice(index, 1);
  saveCart();
  renderCartUI();
}

function cartWaLink() {
  const lines = cart.map((i) => {
    const head = `*${i.q}× ${i.n}* — ${currencySymbol()}${i.p} c/u`;
    if (!i.v) return head;
    const detalles = i.v.split(" · ").map((part) => `   › ${part}`).join("\n");
    return `${head}\n${detalles}`;
  });
  let msg = `Hola! Vi el catálogo de *${storeName}* y quiero hacer este pedido:\n\n${lines.join("\n\n")}\n──────────\n*Total: ${currencySymbol()}${cartTotal()} ${storeCurrency}*`;
  if (selectedPayMethod) msg += `\nPago: *${selectedPayMethod}*`;
  const c = getCustomer();
  const datos = [];
  if (c.name) datos.push(`Nombre: ${c.name}`);
  if (c.phone) datos.push(`Teléfono: ${c.phone}`);
  if (c.address) datos.push(`Entregar en: ${c.address}`);
  if (datos.length) msg += `\n\n${datos.join("\n")}`;
  if (storeDbId) msg += `\n\nVer pedido completo:\n${receiptUrl(getCartToken())}`;
  return `https://wa.me/${storeWA}?text=${encodeURIComponent(msg)}`;
}

function renderCartUI() {
  const bar = document.getElementById("cartBar");
  if (!bar) return;
  const count = cartCount();
  if (count === 0) bar.classList.remove("visible");
  const headerCount = document.getElementById("headerCartCount");
  if (headerCount) {
    headerCount.hidden = count === 0;
    headerCount.textContent = count;
  }
  if (count > 0) {
    document.getElementById("cartCount").textContent = `${count} producto${count !== 1 ? "s" : ""}`;
    document.getElementById("cartTotalSmall").textContent = `Total: ${currencySymbol()}${cartTotal()} ${storeCurrency}`;
  } else {
    closeCart();
  }

  const itemsEl = document.getElementById("cartItems");
  if (itemsEl) {
    itemsEl.innerHTML = cart.length === 0
      ? `<p class="cart-empty">Tu pedido está vacío.</p>`
      : cart.map((i, idx) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${escapeHtml(i.n)}</div>
            <div class="cart-item-meta">${i.v ? `${escapeHtml(i.v)} · ` : ""}${currencySymbol()}${escapeHtml(i.p)} c/u</div>
          </div>
          <div class="cart-qty">
            <button type="button" onclick="changeCartQty(${idx}, -1)" aria-label="Quitar uno">−</button>
            <span>${i.q}</span>
            <button type="button" onclick="changeCartQty(${idx}, 1)" aria-label="Agregar uno">+</button>
          </div>
          <button type="button" class="cart-remove" onclick="removeCartItem(${idx})" aria-label="Eliminar">✕</button>
        </div>
      `).join("");
  }
  const totalEl = document.getElementById("cartTotal");
  if (totalEl) totalEl.textContent = `${currencySymbol()}${cartTotal()} ${storeCurrency}`;
  const sendBtn = document.getElementById("btnSendCart");
  if (sendBtn) sendBtn.href = cartWaLink();
}

// Muestra la barra de pedido unos segundos y se oculta sola; el ícono de la
// bolsa en el header queda como acceso permanente al pedido
function flashCartBar() {
  const bar = document.getElementById("cartBar");
  if (!bar || cartCount() === 0) return;
  bar.classList.add("visible");
  clearTimeout(window._cartBarTimer);
  window._cartBarTimer = setTimeout(() => bar.classList.remove("visible"), 3500);
}

function openCart() {
  renderPaymentChips();
  renderCartUI();
  document.getElementById("cartOverlay")?.classList.add("open");
}
function closeCart() {
  document.getElementById("cartOverlay")?.classList.remove("open");
}

document.getElementById("btnOpenCart")?.addEventListener("click", openCart);
document.getElementById("headerCartBtn")?.addEventListener("click", openCart);
document.getElementById("btnClearCart")?.addEventListener("click", () => {
  clearTimeout(window._cartBarTimer);
  document.getElementById("cartBar")?.classList.remove("visible");
});
document.getElementById("btnEmptyCart")?.addEventListener("click", () => {
  cart = []; saveCart(); renderCartUI();
});
document.getElementById("cartOverlay")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("cartOverlay")) closeCart();
});
document.getElementById("btnSendCart")?.addEventListener("click", (e) => {
  if (cart.length === 0) return;
  const cust = getCustomer();
  if (!cust.name) {
    e.preventDefault();
    const field = document.getElementById("custName");
    if (field) { field.classList.add("field-missing"); field.scrollIntoView({ block: "nearest", behavior: "smooth" }); field.focus(); }
    return;
  }
  if (storePayMethods.length && !selectedPayMethod) {
    e.preventDefault();
    const lbl = document.getElementById("cartPayLabel");
    if (lbl) { lbl.classList.add("pay-missing"); lbl.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    return;
  }
  if (storeDbId) {
    sb.from("orders").insert({
      store_id: storeDbId,
      token: getCartToken(),
      items: cart.map((i) => ({ id: i.id, n: i.n, q: i.q, v: i.v, p: i.p })),
      total: cartTotal(),
      currency: storeCurrency,
      payment_method: selectedPayMethod || null,
      customer_name: cust.name.slice(0, 120) || null,
      customer_phone: cust.phone.slice(0, 30) || null,
      customer_address: cust.address.slice(0, 300) || null,
    }).then(() => {});
    logEvent("whatsapp_click");
  }
  // El pedido ya va en camino a WhatsApp: se limpia para evitar envíos duplicados
  setTimeout(() => { cart = []; clearCartToken(); selectedPayMethod = ""; saveCart(); renderCartUI(); }, 800);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCart();
});
