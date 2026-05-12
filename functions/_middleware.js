const SUPABASE_URL     = "https://vowsvdzjyvpalyvkfxte.supabase.co";
const SUPABASE_ANON    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvd3N2ZHpqeXZwYWx5dmtmeHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NTAyNDUsImV4cCI6MjA5NDAyNjI0NX0.xXOy_369lK8tVHBOjGircCJ6d1RkJTc4eA7UJpd3sEw";

const HEADERS = {
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${SUPABASE_ANON}`,
};

async function fetchStore(slug) {
  const url = `${SUPABASE_URL}/rest/v1/stores?slug=eq.${encodeURIComponent(slug)}&select=name,hero_subtitle,hero_image_url,logo_url&limit=1`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  return data?.[0] || null;
}

async function fetchProduct(id) {
  const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=name,description,price,image_urls,image_url&limit=1`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  return data?.[0] || null;
}

function injectMeta(html, { title, description, image, url }) {
  const esc = (s) => (s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ].join("\n  ");

  // Replace existing <title> and inject meta tags before </head>
  return html
    .replace(/<title[^>]*>.*?<\/title>/i, "")
    .replace("</head>", `  ${tags}\n</head>`);
}

export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  // Only intercept HTML requests for index.html (or root paths with ?s=)
  const isIndex = url.pathname === "/" || url.pathname === "/index.html";
  const slug    = url.searchParams.get("s");

  if (!isIndex || !slug) return next();

  // Fetch original HTML
  const response = await next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();

  try {
    const store = await fetchStore(slug);
    if (!store) return new Response(html, response);

    const productId = url.searchParams.get("p");
    let title       = store.name || "Mi tienda";
    let description = store.hero_subtitle || `Explora el catálogo de ${store.name} y haz tu pedido por WhatsApp.`;
    let image       = store.hero_image_url || store.logo_url || "";

    if (productId) {
      const product = await fetchProduct(productId);
      if (product) {
        title       = `${product.name} — ${store.name}`;
        description = product.description || `${product.name} · Q${product.price} GTQ`;
        image       = product.image_urls?.[0] || product.image_url || image;
      }
    }

    html = injectMeta(html, { title, description, image, url: url.toString() });
  } catch (_) {
    // On any error, serve original HTML unchanged
  }

  return new Response(html, {
    status: response.status,
    headers: response.headers,
  });
}
