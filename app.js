const products = [
  {
    id: 1,
    name: "Real Madrid — Local 2024/25",
    league: "LaLiga",
    category: "laliga",
    price: "Q220",
    emoji: "⚽",
    bg: "linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%)",
    badge: "popular",
    badgeText: "Más vendida",
    desc: "Camisola oficial temporada 2024/25. Tela climachill, corte slim.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["#ffffff", "#d4af37", "#1a1a2e"],
    available: true,
  },
  {
    id: 2,
    name: "Barcelona — Local 2024/25",
    league: "LaLiga",
    category: "laliga",
    price: "Q220",
    emoji: "🔵",
    bg: "linear-gradient(135deg, #a8001c 0%, #004d98 100%)",
    badge: "popular",
    badgeText: "Más vendida",
    desc: "Diseño a rayas clásicas azulgrana. Escudo bordado.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["#a8001c", "#004d98"],
    available: true,
  },
  {
    id: 3,
    name: "Atletico de Madrid — Visita",
    league: "LaLiga",
    category: "laliga",
    price: "Q200",
    emoji: "🔴",
    bg: "linear-gradient(135deg, #c8102e 0%, #1a1a2e 100%)",
    badge: null,
    desc: "Camisola visitante temporada 24/25. Color negro con detalles rojos.",
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["#c8102e", "#1a1a2e"],
    available: true,
  },
  {
    id: 4,
    name: "Manchester United — Local",
    league: "Premier League",
    category: "premier",
    price: "Q230",
    emoji: "🔴",
    bg: "linear-gradient(135deg, #c8102e 0%, #fbf3c5 100%)",
    badge: "new",
    badgeText: "Nueva",
    desc: "Camisola de local del United 2024/25. Rojo clásico con cuello redondo.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["#c8102e", "#fbd700"],
    available: true,
  },
  {
    id: 5,
    name: "Manchester City — Local",
    league: "Premier League",
    category: "premier",
    price: "Q230",
    emoji: "🔵",
    bg: "linear-gradient(135deg, #6cabdd 0%, #1c2c5b 100%)",
    badge: null,
    desc: "Celeste cielo del City, temporada 24/25. Diseño moderno.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["#6cabdd", "#1c2c5b"],
    available: true,
  },
  {
    id: 6,
    name: "Arsenal — Local 2024/25",
    league: "Premier League",
    category: "premier",
    price: "Q220",
    emoji: "⭐",
    bg: "linear-gradient(135deg, #ef0107 0%, #9c0000 100%)",
    badge: null,
    desc: "Rojo y blanco clásico de los Gunners. Tela dri-fit.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["#ef0107", "#ffffff"],
    available: true,
  },
  {
    id: 7,
    name: "PSG — Local 2024/25",
    league: "Ligue 1",
    category: "ligue1",
    price: "Q240",
    emoji: "🗼",
    bg: "linear-gradient(135deg, #004170 0%, #c0392b 100%)",
    badge: "popular",
    badgeText: "Más vendida",
    desc: "Azul oscuro con detalle rojo. Escudo bordado del Paris Saint-Germain.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["#004170", "#c0392b", "#d4af37"],
    available: true,
  },
  {
    id: 8,
    name: "PSG — Visita Blanca",
    league: "Ligue 1",
    category: "ligue1",
    price: "Q240",
    emoji: "⚡",
    bg: "linear-gradient(135deg, #f0f0f0 0%, #cccccc 100%)",
    badge: "new",
    badgeText: "Nueva",
    desc: "Camisola visitante blanca con detalles dorados y rojos.",
    sizes: ["M", "L", "XL"],
    colors: ["#ffffff", "#c0392b", "#d4af37"],
    available: true,
  },
  {
    id: 9,
    name: "Guatemala — Copa Centroamericana",
    league: "Selecciones",
    category: "selecciones",
    price: "Q250",
    emoji: "🇬🇹",
    bg: "linear-gradient(135deg, #4997d0 0%, #ffffff 50%, #4997d0 100%)",
    badge: "popular",
    badgeText: "Orgullo GT",
    desc: "Camisola de la Selección Nacional. Azul y blanco. ¡Apoya a Guatemala!",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["#4997d0", "#ffffff"],
    available: true,
  },
  {
    id: 10,
    name: "Brasil — Amarilla Oficial",
    league: "Selecciones",
    category: "selecciones",
    price: "Q230",
    emoji: "🇧🇷",
    bg: "linear-gradient(135deg, #ffd700 0%, #009c3b 100%)",
    badge: null,
    desc: "La canarinha, temporada 24/25. Verde y amarillo icónicos.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["#ffd700", "#009c3b"],
    available: true,
  },
  {
    id: 11,
    name: "Argentina — Campeona del Mundo",
    league: "Selecciones",
    category: "selecciones",
    price: "Q250",
    emoji: "🏆",
    bg: "linear-gradient(135deg, #74acdf 0%, #ffffff 100%)",
    badge: "popular",
    badgeText: "Campeón",
    desc: "La scaloneta. Rayas celestes y blancas con las 3 estrellas.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["#74acdf", "#ffffff", "#d4af37"],
    available: true,
  },
  {
    id: 12,
    name: "Comunicaciones FC — Local",
    league: "Liga Nacional",
    category: "local",
    price: "Q180",
    emoji: "🇬🇹",
    bg: "linear-gradient(135deg, #ffffff 0%, #eeeeee 100%)",
    badge: "popular",
    badgeText: "Liga GT",
    desc: "El Campeón de Guatemala. Camisola blanca local 2024/25.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["#ffffff", "#c0392b"],
    available: true,
  },
];

const categoryLabels = {
  laliga: "LaLiga",
  premier: "Premier League",
  ligue1: "Ligue 1",
  selecciones: "Selecciones",
  local: "Liga Nacional",
};

let activeFilter = "all";
let searchQuery = "";
let liveProducts = null; // populated from Supabase if configured

async function loadFromSupabase() {
  try {
    if (typeof sb === "undefined" || SUPABASE_URL.includes("YOUR_PROJECT_ID")) return;
    const { data } = await sb.from("products").select("*").eq("available", true).order("created_at", { ascending: false });
    if (data && data.length > 0) {
      liveProducts = data.map((p) => ({
        ...p,
        price: `Q${p.price}`,
        league: categoryLabels[p.category] || p.category,
        bg: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        badgeText: p.badge === "popular" ? "Más vendida" : p.badge === "new" ? "Nueva" : "",
        desc: p.description || "",
        colors: [],
      }));
      renderProducts();
    }
  } catch (_) {}
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const empty = document.getElementById("emptyState");

  const source = liveProducts || products;
  const filtered = source.filter((p) => {
    const matchCat = activeFilter === "all" || p.category === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.league.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  grid.innerHTML = filtered
    .map(
      (p) => `
    <div class="product-card" onclick="openModal(${p.id})">
      ${p.badge ? `<div class="product-badge ${p.badge}">${p.badgeText}</div>` : ""}
      <div class="product-image" style="background:${p.bg}">
        ${p.emoji}
      </div>
      <div class="product-body">
        <div class="product-league">${p.league}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-sizes">
          ${p.sizes.map((s) => `<span class="size-chip">${s}</span>`).join("")}
        </div>
        <div class="product-footer">
          <div class="product-price">${p.price} <span>GTQ/mes</span></div>
          <a class="btn-ask" href="${waLink(p)}" target="_blank" onclick="event.stopPropagation()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Pedir
          </a>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function waLink(p, size = "") {
  const msg = size
    ? `Hola! Vi el catálogo de GoalKit y quiero pedir: *${p.name}* talla *${size}* - Precio: ${p.price}`
    : `Hola! Vi el catálogo de GoalKit y me interesa: *${p.name}* - Precio: ${p.price}`;
  return `https://wa.me/50200000000?text=${encodeURIComponent(msg)}`;
}

function openModal(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;

  const content = document.getElementById("modalContent");
  content.innerHTML = `
    <div class="modal-product-image" style="background:${p.bg}">${p.emoji}</div>
    <div class="modal-body">
      <div class="modal-league">${p.league}</div>
      <div class="modal-name">${p.name}</div>
      <div class="modal-desc">${p.desc}</div>

      <div class="modal-section-title">Tallas disponibles</div>
      <div class="modal-sizes" id="modalSizes">
        ${p.sizes.map((s) => `<button class="modal-size" onclick="selectSize(this,'${s}')">${s}</button>`).join("")}
      </div>

      <div class="modal-section-title">Colores</div>
      <div class="modal-colors">
        ${p.colors.map((c, i) => `<div class="modal-color ${i === 0 ? "selected" : ""}" style="background:${c}" onclick="selectColor(this)"></div>`).join("")}
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

function selectSize(btn, size) {
  document.querySelectorAll(".modal-size").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  const p = window._currentProduct;
  if (p) {
    document.getElementById("modalWaBtn").href = waLink(p, size);
  }
}

function selectColor(el) {
  document.querySelectorAll(".modal-color").forEach((c) => c.classList.remove("selected"));
  el.classList.add("selected");
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

renderProducts();
loadFromSupabase();
