// Set the real catalog base URL dynamically
const catalogBase = window.location.origin + window.location.pathname.replace("register.html", "index.html") + "?s=";
document.getElementById("slugBase").textContent = catalogBase;

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ===== SLUG PREVIEW & VALIDATION =====
const regStoreNameEl = document.getElementById("regStoreName");
const regSlugEl = document.getElementById("regSlug");
const slugPreviewVal = document.getElementById("slugPreviewVal");
const slugStatus = document.getElementById("slugStatus");

let slugCheckTimer = null;
let slugAvailable = false;

regStoreNameEl.addEventListener("input", () => {
  const auto = slugify(regStoreNameEl.value);
  regSlugEl.value = auto;
  slugPreviewVal.textContent = auto || "mi-tienda";
  debouncedSlugCheck(auto);
});

regSlugEl.addEventListener("input", () => {
  const cleaned = slugify(regSlugEl.value);
  regSlugEl.value = cleaned;
  slugPreviewVal.textContent = cleaned || "mi-tienda";
  debouncedSlugCheck(cleaned);
});

function debouncedSlugCheck(slug) {
  clearTimeout(slugCheckTimer);
  if (!slug) { slugStatus.textContent = ""; slugAvailable = false; return; }
  slugStatus.textContent = "Verificando disponibilidad...";
  slugStatus.style.color = "#9ca3af";
  slugCheckTimer = setTimeout(() => checkSlugAvailability(slug), 600);
}

async function checkSlugAvailability(slug) {
  try {
    const { data } = await sb.from("stores").select("id").eq("slug", slug).maybeSingle();
    if (data) {
      slugStatus.textContent = "✗ Ese slug ya está en uso";
      slugStatus.style.color = "#ef4444";
      slugAvailable = false;
    } else {
      slugStatus.textContent = "✓ Disponible";
      slugStatus.style.color = "#22c55e";
      slugAvailable = true;
    }
  } catch (_) {
    slugStatus.textContent = "";
    slugAvailable = true;
  }
}

// ===== STEP NAVIGATION =====
const step1El = document.getElementById("step1");
const step2El = document.getElementById("step2");
const step1bar = document.getElementById("step1bar");
const step2bar = document.getElementById("step2bar");

document.getElementById("step1Form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("step1Btn");
  const err = document.getElementById("step1Error");
  err.style.display = "none";

  const slug = slugify(regSlugEl.value);
  if (!slug) { err.textContent = "El slug no puede estar vacío."; err.style.display = "block"; return; }

  btn.disabled = true;
  btn.textContent = "Verificando...";

  // Final slug check
  const { data: existing } = await sb.from("stores").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    err.textContent = "Ese slug ya está en uso, elige otro.";
    err.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Continuar →";
    return;
  }

  btn.disabled = false;
  btn.textContent = "Continuar →";
  step1El.style.display = "none";
  step2El.style.display = "block";
  step1bar.classList.add("active");
  step2bar.classList.add("active");
});

document.getElementById("backBtn").addEventListener("click", () => {
  step2El.style.display = "none";
  step1El.style.display = "block";
  step2bar.classList.remove("active");
});

// ===== REGISTRATION =====
document.getElementById("step2Form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("step2Btn");
  const err = document.getElementById("step2Error");
  err.style.display = "none";

  const email = document.getElementById("regEmail").value.trim();
  const pass = document.getElementById("regPassword").value;
  const passConfirm = document.getElementById("regPasswordConfirm").value;

  if (pass !== passConfirm) {
    err.textContent = "Las contraseñas no coinciden.";
    err.style.display = "block";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Creando cuenta...";

  const storeName = regStoreNameEl.value.trim();
  const slug = slugify(regSlugEl.value);
  const whatsapp = document.getElementById("regWhatsapp").value.trim();

  const { data: authData, error: authError } = await sb.auth.signUp({ email, password: pass });

  if (authError) {
    err.textContent = authError.message;
    err.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Crear cuenta";
    return;
  }

  const userId = authData.user?.id;
  const session = authData.session;

  // Create the store record immediately if we have a session (email confirm disabled)
  if (session && userId) {
    await sb.from("stores").insert({
      user_id: userId,
      name: storeName,
      slug,
      whatsapp,
    });
    showSuccess(true, slug);
  } else {
    // Email confirmation required — store pending data in localStorage
    localStorage.setItem("pendingStore", JSON.stringify({ name: storeName, slug, whatsapp }));
    showSuccess(false, slug);
  }
});

function showSuccess(immediate, slug) {
  document.getElementById("step2").style.display = "none";
  const success = document.getElementById("successScreen");
  success.style.display = "block";
  const msg = document.getElementById("successMsg");
  if (immediate) {
    msg.textContent = `Tu catálogo "${slug}" está listo. Entra al panel admin para agregar productos y personalizar tu tienda.`;
  } else {
    msg.textContent = `Revisa tu correo y confirma tu cuenta. Luego inicia sesión en el panel admin para completar la configuración de tu tienda "${slug}".`;
  }
}

// ===== PENDING STORE ON FIRST LOGIN =====
// If a user just confirmed their email and logs in, create their store from localStorage
sb.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session) {
    const pending = localStorage.getItem("pendingStore");
    if (pending) {
      const { name, slug, whatsapp } = JSON.parse(pending);
      const { data: existing } = await sb.from("stores").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!existing) {
        await sb.from("stores").insert({ user_id: session.user.id, name, slug, whatsapp });
      }
      localStorage.removeItem("pendingStore");
      window.location.href = "admin.html";
    }
  }
});
