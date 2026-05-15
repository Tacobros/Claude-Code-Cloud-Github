// ProductSpot SuperAdmin

let allStores = [];

// ── INIT ──────────────────────────────────────────────────────────────────────

async function init() {
  bindEvents();
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await verifyAndLoad(session);
  } else {
    showLogin();
  }
}

function bindEvents() {
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('logoutBtn').addEventListener('click', doLogout);
  document.getElementById('refreshBtn').addEventListener('click', loadData);
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('saPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      showPage(el.dataset.page);
    });
  });

  document.getElementById('storeSearch').addEventListener('input', filterStores);
  document.getElementById('planFilter').addEventListener('change', filterStores);
  document.getElementById('statusFilter').addEventListener('change', filterStores);
  document.getElementById('refreshAnalyticsBtn').addEventListener('click', loadPlatformAnalytics);
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

async function verifyAndLoad(session) {
  const { data: isAdmin, error } = await sb.rpc('is_superadmin');
  if (error || !isAdmin) {
    await sb.auth.signOut();
    showLoginError('No tienes permisos de superadmin para esta cuenta.');
    showLogin();
    return;
  }
  document.getElementById('saUserEmail').textContent = session.user.email;
  showApp();
  await loadData();
}

async function doLogin() {
  const email    = document.getElementById('saEmail').value.trim();
  const password = document.getElementById('saPassword').value;
  const btn      = document.getElementById('loginBtn');
  document.getElementById('loginError').style.display = 'none';

  if (!email || !password) { showLoginError('Ingresa tu correo y contraseña.'); return; }

  btn.disabled = true; btn.textContent = 'Verificando…';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    showLoginError(error.message);
    btn.disabled = false; btn.textContent = 'Entrar al panel';
    return;
  }

  await verifyAndLoad(data.session);
  btn.disabled = false; btn.textContent = 'Entrar al panel';
}

async function doLogout() {
  await sb.auth.signOut();
  allStores = [];
  showLogin();
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminApp').style.display    = 'none';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display    = 'flex';
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg; el.style.display = 'block';
}

// ── DATA ──────────────────────────────────────────────────────────────────────

async function loadData() {
  document.getElementById('recentBody').innerHTML = '<div class="loading">Cargando…</div>';
  document.getElementById('storesBody').innerHTML = '<tr><td colspan="8" class="loading">Cargando…</td></tr>';

  const { data, error } = await sb.rpc('superadmin_get_stores');
  if (error) {
    document.getElementById('recentBody').innerHTML = '<div class="empty-state">Error al cargar datos.</div>';
    console.error(error);
    return;
  }

  allStores = data || [];
  renderStats(allStores);
  renderRecent(allStores.slice(0, 6));
  filterStores();
}

// ── STATS ─────────────────────────────────────────────────────────────────────

function renderStats(stores) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  document.getElementById('statTotal').textContent  = stores.length;
  document.getElementById('statActive').textContent = stores.filter(s => s.status === 'active').length;
  document.getElementById('statPaid').textContent   = stores.filter(s => s.plan === 'starter' || s.plan === 'pro').length;
  document.getElementById('statWeek').textContent   = stores.filter(s => new Date(s.created_at) >= weekAgo).length;
}

// ── RECENT ────────────────────────────────────────────────────────────────────

function renderRecent(stores) {
  const el = document.getElementById('recentBody');
  if (!stores.length) {
    el.innerHTML = '<div class="empty-state">No hay tiendas registradas aún.</div>';
    return;
  }
  const th = (t) => `<th style="padding:10px 20px;text-align:left;font-size:.73rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #f3f4f6;">${t}</th>`;
  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>${th('Tienda')}${th('Plan')}${th('Productos')}${th('Registro')}${th('Estado')}</tr></thead>
      <tbody>
        ${stores.map(s => `
          <tr>
            <td style="padding:13px 20px;border-bottom:1px solid #f9fafb;">
              <div style="font-weight:600;font-size:.9rem;">${esc(s.name || '—')}</div>
              <div style="font-size:.78rem;color:#9ca3af;">${esc(s.owner_email || '')}</div>
            </td>
            <td style="padding:13px 20px;border-bottom:1px solid #f9fafb;">${planBadge(s.plan)}</td>
            <td style="padding:13px 20px;border-bottom:1px solid #f9fafb;font-weight:600;">${s.product_count}</td>
            <td style="padding:13px 20px;border-bottom:1px solid #f9fafb;font-size:.83rem;color:#6b7280;">${fmtDate(s.created_at)}</td>
            <td style="padding:13px 20px;border-bottom:1px solid #f9fafb;">
              <span class="${s.status === 'active' ? 'status-active' : 'status-suspended'}">
                ${s.status === 'active' ? 'Activa' : 'Suspendida'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// ── STORES TABLE ──────────────────────────────────────────────────────────────

function filterStores() {
  const q      = document.getElementById('storeSearch').value.toLowerCase();
  const plan   = document.getElementById('planFilter').value;
  const status = document.getElementById('statusFilter').value;

  const filtered = allStores.filter(s => {
    const matchQ = !q
      || (s.name        || '').toLowerCase().includes(q)
      || (s.slug        || '').toLowerCase().includes(q)
      || (s.owner_email || '').toLowerCase().includes(q);
    return matchQ && (!plan || s.plan === plan) && (!status || s.status === status);
  });

  renderStores(filtered);
}

function renderStores(stores) {
  const tbody = document.getElementById('storesBody');
  if (!stores.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No se encontraron tiendas.</td></tr>';
    return;
  }
  tbody.innerHTML = stores.map(s => `
    <tr id="row-${s.id}">
      <td class="td-name">
        <strong>${esc(s.name || '—')}</strong>
        <small>${esc(s.whatsapp || '')}</small>
      </td>
      <td style="font-size:.83rem;color:#6b7280;">${esc(s.owner_email || '—')}</td>
      <td style="font-family:monospace;font-size:.83rem;">
        <a href="index.html?s=${esc(s.slug)}" target="_blank"
           style="color:#5b8ab5;text-decoration:none;">${esc(s.slug || '—')}</a>
      </td>
      <td>
        <select class="plan-select" onchange="updatePlan(${s.id}, this.value)">
          <option value="free"    ${s.plan === 'free'    ? 'selected' : ''}>Free</option>
          <option value="starter" ${s.plan === 'starter' ? 'selected' : ''}>Starter</option>
          <option value="pro"     ${s.plan === 'pro'     ? 'selected' : ''}>Pro</option>
        </select>
      </td>
      <td style="text-align:center;font-weight:700;">${s.product_count}</td>
      <td style="font-size:.82rem;color:#6b7280;">${fmtDate(s.created_at)}</td>
      <td>
        <span class="${s.status === 'active' ? 'status-active' : 'status-suspended'}">
          ${s.status === 'active' ? 'Activa' : 'Suspendida'}
        </span>
      </td>
      <td class="td-actions">
        <button class="btn-status ${s.status === 'active' ? 'btn-suspend' : 'btn-activate'}"
                onclick="toggleStatus(${s.id}, '${s.status}')">
          ${s.status === 'active' ? 'Suspender' : 'Activar'}
        </button>
        <a href="index.html?s=${esc(s.slug)}" target="_blank" class="btn-view">Ver →</a>
      </td>
    </tr>
  `).join('');
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────

async function updatePlan(storeId, plan) {
  const store = allStores.find(s => s.id === storeId);
  const storeName = store?.name || 'esta tienda';
  if (!confirm(`¿Cambiar el plan de "${storeName}" a ${plan}?`)) {
    filterStores(); // re-render to reset the select
    return;
  }
  const { error } = await sb.rpc('superadmin_update_store', {
    p_store_id: storeId, p_plan: plan, p_status: null,
  });
  if (error) { toast('Error al cambiar el plan', 'error'); return; }
  if (store) store.plan = plan;
  renderStats(allStores);
  toast('Plan actualizado a ' + plan);
}

async function toggleStatus(storeId, current) {
  const next = current === 'active' ? 'suspended' : 'active';
  const store = allStores.find(s => s.id === storeId);
  const storeName = store?.name || 'esta tienda';
  const action = next === 'suspended' ? 'SUSPENDER' : 'reactivar';
  if (!confirm(`¿Deseas ${action} la tienda "${storeName}"?`)) return;

  const { error } = await sb.rpc('superadmin_update_store', {
    p_store_id: storeId, p_plan: null, p_status: next,
  });
  if (error) { toast('Error al cambiar el estado', 'error'); return; }
  if (store) store.status = next;
  renderStats(allStores);
  filterStores();
  toast(next === 'active' ? 'Tienda activada' : 'Tienda suspendida');

  // Notificar al dueño por correo
  if (store?.owner_email) {
    fetch('/api/notify-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_email: store.owner_email,
        store_name: store.name,
        new_status: next,
      }),
    }).catch(() => {});
  }
}

// ── PLATFORM ANALYTICS ───────────────────────────────────────────────────────

async function loadPlatformAnalytics() {
  const loadingEl = '<div style="color:#9ca3af;font-size:.8rem;">Cargando…</div>';
  ['dailyChart','planDistChart','topStoresChart','weeklyRegChart'].forEach(id => {
    document.getElementById(id).innerHTML = loadingEl;
  });

  const { data, error } = await sb.rpc('superadmin_get_platform_analytics');
  if (error) {
    ['dailyChart','planDistChart','topStoresChart','weeklyRegChart'].forEach(id => {
      document.getElementById(id).innerHTML = '<div style="color:#dc2626;font-size:.8rem;">Error al cargar datos.</div>';
    });
    console.error(error);
    return;
  }

  const totals = data.totals || {};
  document.getElementById('saStatViews').textContent    = totals.catalog_views    || 0;
  document.getElementById('saStatWA').textContent       = totals.whatsapp_clicks  || 0;
  document.getElementById('saStatProdViews').textContent = totals.product_views   || 0;

  renderDailyChart(data.daily_views || []);
  renderPlanDist(data.plan_distribution || []);
  renderTopStores(data.top_stores || []);
  renderWeeklyReg(data.weekly_registrations || []);
}

function renderDailyChart(days) {
  const el = document.getElementById('dailyChart');
  if (!days.length) {
    el.innerHTML = '<div style="color:#9ca3af;font-size:.8rem;margin:auto;">Sin datos aún.</div>';
    return;
  }
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const found = days.find(r => r.day === key);
    last7.push({ label: d.toLocaleDateString('es', { weekday: 'short' }), views: found ? Number(found.views) : 0 });
  }
  const maxV = Math.max(...last7.map(d => d.views), 1);
  el.innerHTML = last7.map(d => {
    const pct = Math.round((d.views / maxV) * 100);
    return `
      <div class="daily-col" title="${d.views} vista${d.views !== 1 ? 's' : ''}">
        <div class="daily-bar" style="height:${Math.max(pct, 2)}%;"></div>
        <div class="daily-label">${d.label}</div>
      </div>`;
  }).join('');
}

function renderPlanDist(dist) {
  const el = document.getElementById('planDistChart');
  if (!dist.length) { el.innerHTML = '<div style="color:#9ca3af;font-size:.8rem;">Sin datos.</div>'; return; }
  const total = dist.reduce((s, r) => s + Number(r.count), 0) || 1;
  const colors = { free: '#9ca3af', starter: '#3b82f6', pro: '#f59e0b' };
  const labels = { free: 'Free', starter: 'Starter', pro: 'Pro' };
  el.innerHTML = dist.map(r => {
    const pct = Math.round((Number(r.count) / total) * 100);
    const color = colors[r.plan] || '#6b7280';
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">${labels[r.plan] || r.plan}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
        <div class="chart-bar-value">${r.count}</div>
      </div>
      <div style="font-size:.72rem;color:#9ca3af;margin:-6px 0 8px 152px;">${pct}% del total</div>`;
  }).join('');
}

function renderTopStores(stores) {
  const el = document.getElementById('topStoresChart');
  if (!stores.length) { el.innerHTML = '<div style="color:#9ca3af;font-size:.8rem;">Sin datos de engagement.</div>'; return; }
  const maxV = Math.max(...stores.map(s => Number(s.event_count)), 1);
  el.innerHTML = stores.map((s, i) => {
    const pct = Math.round((Number(s.event_count) / maxV) * 100);
    return `
      <div class="chart-bar-row" style="margin-bottom:12px;">
        <div class="chart-bar-label" title="${esc(s.name || s.slug)}">${i + 1}. ${esc(s.name || s.slug)}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${pct}%;background:#5b8ab5;"></div>
        </div>
        <div class="chart-bar-value">${s.event_count}</div>
      </div>`;
  }).join('');
}

function renderWeeklyReg(weeks) {
  const el = document.getElementById('weeklyRegChart');
  if (!weeks.length) { el.innerHTML = '<div style="color:#9ca3af;font-size:.8rem;">Sin datos aún.</div>'; return; }
  const maxV = Math.max(...weeks.map(w => Number(w.new_stores)), 1);
  el.innerHTML = weeks.map(w => {
    const pct = Math.round((Number(w.new_stores) / maxV) * 100);
    const label = new Date(w.week).toLocaleDateString('es', { day: '2-digit', month: 'short' });
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">Sem. ${label}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${pct}%;background:#059669;"></div>
        </div>
        <div class="chart-bar-value">${w.new_stores}</div>
      </div>`;
  }).join('');
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(n => n.classList.remove('active'));
  const pageId = 'page' + name.charAt(0).toUpperCase() + name.slice(1);
  document.getElementById(pageId)?.classList.add('active');
  document.querySelectorAll(`[data-page="${name}"]`).forEach(el => el.classList.add('active'));
  const titles = { dashboard: 'Dashboard', analytics: 'Analíticas', stores: 'Tiendas' };
  document.getElementById('topbarTitle').textContent = titles[name] || name;
  if (name === 'analytics') loadPlatformAnalytics();
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

function planBadge(plan) {
  const map = { free: ['plan-free','Free'], starter: ['plan-starter','Starter'], pro: ['plan-pro','Pro'] };
  const [cls, label] = map[plan] || map.free;
  return `<span class="plan-badge ${cls}">${label}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', init);
