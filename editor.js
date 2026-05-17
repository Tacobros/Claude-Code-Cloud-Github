// ── BLOCK SCHEMA ──────────────────────────────────────────────────────────────
const BLOCKS = [
  {
    id: 'brand', label: 'Marca y colores', icon: '🎨', section: null,
    fields: [
      { key: 'name',         label: 'Nombre de la tienda', type: 'text' },
      { key: 'accent_color', label: 'Color de acento',     type: 'color' },
      { key: 'logo_url',     label: 'Logo',                type: 'image', uploadKey: 'logo' },
    ]
  },
  {
    id: 'hero', label: 'Encabezado', icon: '⭐', section: 'hero',
    fields: [
      { key: 'hero_badge',     label: 'Etiqueta',          type: 'text',     ph: 'Bienvenidos' },
      { key: 'hero_title',     label: 'Título principal',  type: 'text',     ph: 'Bienvenido a nuestra tienda' },
      { key: 'hero_subtitle',  label: 'Subtítulo',         type: 'textarea', ph: 'Explora nuestro catálogo...' },
      { key: 'hero_image_url', label: 'Imagen de portada', type: 'image',    uploadKey: 'hero' },
    ]
  },
  {
    id: 'catalog', label: 'Catálogo', icon: '📦', section: 'catalog',
    fields: [
      { key: 'catalog_title',    label: 'Título',    type: 'text', ph: 'Catálogo' },
      { key: 'catalog_subtitle', label: 'Subtítulo', type: 'text', ph: 'Explora nuestros productos' },
    ]
  },
  {
    id: 'stats', label: 'Estadísticas', icon: '📊', section: 'stats',
    fields: [
      { type: 'divider', label: 'Estadística 1' },
      { key: 'stat1_value', label: 'Valor',    type: 'text', ph: 'ej: 100+' },
      { key: 'stat1_label', label: 'Etiqueta', type: 'text', ph: 'ej: Clientes felices' },
      { type: 'divider', label: 'Estadística 2' },
      { key: 'stat2_value', label: 'Valor',    type: 'text' },
      { key: 'stat2_label', label: 'Etiqueta', type: 'text' },
      { type: 'divider', label: 'Estadística 3' },
      { key: 'stat3_value', label: 'Valor',    type: 'text' },
      { key: 'stat3_label', label: 'Etiqueta', type: 'text' },
      { type: 'divider', label: 'Estadística 4' },
      { key: 'stat4_value', label: 'Valor',    type: 'text' },
      { key: 'stat4_label', label: 'Etiqueta', type: 'text' },
    ]
  },
  {
    id: 'about', label: 'Nosotros', icon: 'ℹ️', section: 'about',
    fields: [
      { key: 'about_title', label: 'Título de sección', type: 'text' },
      { type: 'divider', label: 'Característica 1' },
      { key: 'about1_icon',  label: 'Ícono (emoji)', type: 'emoji' },
      { key: 'about1_title', label: 'Título',         type: 'text' },
      { key: 'about1_desc',  label: 'Descripción',    type: 'text' },
      { type: 'divider', label: 'Característica 2' },
      { key: 'about2_icon',  label: 'Ícono (emoji)', type: 'emoji' },
      { key: 'about2_title', label: 'Título',         type: 'text' },
      { key: 'about2_desc',  label: 'Descripción',    type: 'text' },
      { type: 'divider', label: 'Característica 3' },
      { key: 'about3_icon',  label: 'Ícono (emoji)', type: 'emoji' },
      { key: 'about3_title', label: 'Título',         type: 'text' },
      { key: 'about3_desc',  label: 'Descripción',    type: 'text' },
      { type: 'divider', label: 'Característica 4' },
      { key: 'about4_icon',  label: 'Ícono (emoji)', type: 'emoji' },
      { key: 'about4_title', label: 'Título',         type: 'text' },
      { key: 'about4_desc',  label: 'Descripción',    type: 'text' },
      { type: 'divider', label: 'Galería de imágenes' },
      { key: 'show_gallery', label: 'Mostrar galería', type: 'toggle' },
      { key: 'gallery1_img',   label: 'Imagen 1', type: 'image', uploadKey: 'gal1' },
      { key: 'gallery1_title', label: 'Título imagen 1', type: 'text' },
      { key: 'gallery2_img',   label: 'Imagen 2', type: 'image', uploadKey: 'gal2' },
      { key: 'gallery2_title', label: 'Título imagen 2', type: 'text' },
      { key: 'gallery3_img',   label: 'Imagen 3', type: 'image', uploadKey: 'gal3' },
      { key: 'gallery3_title', label: 'Título imagen 3', type: 'text' },
      { key: 'gallery4_img',   label: 'Imagen 4', type: 'image', uploadKey: 'gal4' },
      { key: 'gallery4_title', label: 'Título imagen 4', type: 'text' },
    ]
  },
  {
    id: 'contact', label: 'Contacto', icon: '💬', section: 'contact',
    fields: [
      { key: 'cta_title', label: 'Título',      type: 'text',     ph: '¿Listo para hacer tu pedido?' },
      { key: 'cta_desc',  label: 'Descripción', type: 'textarea', ph: 'Escríbenos por WhatsApp...' },
    ]
  },
];

// ── EMOJI DATA ────────────────────────────────────────────────────────────────
const EMOJI_DB = {
  popular:  ['⭐','🌟','🏆','🎯','🎁','🎉','✨','🚀','💎','🔥','💡','🌈','🎨','🏅','👑','💫','🌙','☀️','⚡','🌊','🎶','🏖','🌴','🦄','🎀'],
  nature:   ['🌿','🌱','🌲','🌸','🌺','🌻','🍀','🍃','🦋','🐝','🌍','🌎','🌏','🏔','🌅','🌄','🍁','🌾','🐾','🦁','🐬','🌊','🌵','🌾','🦚'],
  objects:  ['💡','🔑','🔧','🛡️','📦','🛒','🏪','📱','💻','🖥️','📷','🎵','📚','✏️','🔒','📊','📈','🎮','🏠','🚗','🎸','📡','🔭','🎬','🎤'],
  people:   ['👋','🤝','💪','🙌','🫶','❤️','💙','💚','🫂','👏','🙏','✊','👍','💬','📞','🧑‍💼','🤗','😊','😎','🥳','🤩','😍','🙋','🤷','💃'],
  symbols:  ['✅','☑️','✔️','❌','⭕','❓','❗','➕','➖','➡️','⬆️','🔄','♻️','💯','🆕','🆓','🔴','🟢','🔵','🟡','⚡','🔱','☯️','🌀','⚜️'],
  food:     ['🍕','🍔','🌮','🍜','🍣','🍰','☕','🍺','🥗','🍎','🍓','🥑','🍳','🥩','🍟','🧁','🍫','🥤','🍹','🍦','🥐','🧀','🍱','🥘','🍲'],
  travel:   ['✈️','🚂','🚢','🏝','🗺️','🏔','🌆','🗼','🏟','⛩','🌉','🎡','🧳','🗽','🎠','🛕','🏰','🎪','🚁','🛸','🚀','🛶','🗾','🌄','🏕'],
  business: ['💼','📊','📈','💰','💳','🤝','🏆','📋','📌','📎','✉️','📣','🎯','🏦','💹','📉','🔖','💡','🧮','📝','🗂','📅','📧','🖊','🔐'],
};

const EMOJI_CAT_NAMES = {
  popular: 'Popular', nature: 'Naturaleza', objects: 'Objetos',
  people: 'Personas', symbols: 'Símbolos', food: 'Comida',
  travel: 'Viajes', business: 'Negocios',
};

// ── EMOJI PICKER STATE ────────────────────────────────────────────────────────
let emojiPickerTarget = null; // { key, btnEl }
let emojiCurrentCat   = 'popular';

// ── STATE ─────────────────────────────────────────────────────────────────────
let storeData     = {};
let pendingChanges = {};
let selectedBlock  = null;
let frameReady     = false;

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { window.location.href = 'admin.html'; return; }

  const { data, error } = await sb.from('stores').select('*').eq('user_id', user.id).single();
  if (error || !data) { window.location.href = 'admin.html'; return; }
  storeData = data;

  // Configure iframe
  const frame = document.getElementById('edFrame');
  const slug  = data.slug;
  frame.src = `index.html?s=${encodeURIComponent(slug)}&preview=1`;

  document.getElementById('edStoreName').textContent = data.name || 'Mi tienda';
  document.getElementById('edViewLink').href = `index.html?s=${encodeURIComponent(slug)}`;

  frame.addEventListener('load', () => {
    frameReady = true;
    // Resend any changes accumulated before frame finished loading
    if (Object.keys(pendingChanges).length) {
      Object.entries(pendingChanges).forEach(([field, value]) =>
        postToFrame({ type: 'PS_UPDATE', field, value })
      );
    }
  });

  window.addEventListener('message', onFrameMessage);

  renderBlockList();
  bindTopbar();
  initMobileSheet();
  document.getElementById('edLoading').style.display = 'none';
}

// ── TOPBAR ────────────────────────────────────────────────────────────────────
function bindTopbar() {
  // Device switcher
  document.querySelectorAll('.ed-device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ed-device-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('edFrameWrap').style.maxWidth = btn.dataset.w;
    });
  });

  // Back button
  document.getElementById('edBackBtn').addEventListener('click', () => {
    document.getElementById('edViewBlocks').style.display = '';
    document.getElementById('edViewProps').style.display  = 'none';
    document.querySelectorAll('.ed-block-item').forEach(i => i.classList.remove('active'));
    selectedBlock = null;
    postToFrame({ type: 'PS_HIGHLIGHT', block: null });
  });

  // Save button
  document.getElementById('edSaveBtn').addEventListener('click', saveChanges);
}

// ── BLOCK LIST ────────────────────────────────────────────────────────────────
function renderBlockList() {
  const list = document.getElementById('edBlockList');
  list.innerHTML = BLOCKS.map(b => `
    <div class="ed-block-item" data-id="${b.id}">
      <span class="ed-block-icon">${b.icon}</span>
      <span class="ed-block-label">${b.label}</span>
      <svg class="ed-block-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  `).join('');

  list.querySelectorAll('.ed-block-item').forEach(item => {
    item.addEventListener('click', () => selectBlock(item.dataset.id));
  });
}

// ── SELECT BLOCK ──────────────────────────────────────────────────────────────
function selectBlock(blockId) {
  selectedBlock = BLOCKS.find(b => b.id === blockId);
  if (!selectedBlock) return;

  document.querySelectorAll('.ed-block-item').forEach(i =>
    i.classList.toggle('active', i.dataset.id === blockId)
  );

  document.getElementById('edViewBlocks').style.display = 'none';
  document.getElementById('edViewProps').style.display  = '';
  document.getElementById('edPropsIcon').textContent  = selectedBlock.icon;
  document.getElementById('edPropsTitle').textContent = selectedBlock.label;

  renderFields(selectedBlock);

  if (selectedBlock.section) {
    postToFrame({ type: 'PS_HIGHLIGHT', block: blockId });
  }

  // Notify mobile sheet to update label and open
  window.dispatchEvent(new CustomEvent('ed-block-selected', { detail: selectedBlock.label }));
}

// ── RENDER FIELDS ─────────────────────────────────────────────────────────────
function renderFields(block) {
  const container = document.getElementById('edPropsFields');
  container.innerHTML = '';
  block.fields.forEach(field => {
    const val = field.key !== undefined
      ? (pendingChanges[field.key] ?? storeData[field.key] ?? '')
      : '';
    container.appendChild(createFieldEl(field, val));
  });
}

function createFieldEl(field, value) {
  if (field.type === 'divider') {
    const el = document.createElement('div');
    el.className = 'ed-divider';
    el.textContent = field.label;
    return el;
  }

  const wrap = document.createElement('div');
  wrap.className = 'ed-field';

  if (field.type !== 'toggle') {
    const label = document.createElement('label');
    label.className = 'ed-field-label';
    label.textContent = field.label;
    wrap.appendChild(label);
  }

  switch (field.type) {
    case 'text': {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'ed-field-input';
      input.value = value || '';
      input.placeholder = field.ph || '';
      input.addEventListener('input', () => handleChange(field.key, input.value));
      wrap.appendChild(input);
      break;
    }

    case 'textarea': {
      const ta = document.createElement('textarea');
      ta.className = 'ed-field-input ed-field-textarea';
      ta.value = value || '';
      ta.placeholder = field.ph || '';
      ta.addEventListener('input', () => handleChange(field.key, ta.value));
      wrap.appendChild(ta);
      break;
    }

    case 'emoji': {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ed-emoji-btn';
      btn.dataset.key = field.key;
      const displayEmoji = value || '😊';
      btn.innerHTML = `<span class="ed-emoji-val">${displayEmoji}</span><span class="ed-emoji-btn-hint">Cambiar</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEmojiPicker(field.key, btn);
      });
      wrap.appendChild(btn);
      break;
    }

    case 'color': {
      const row = document.createElement('div');
      row.className = 'ed-color-row';

      const swatch = document.createElement('div');
      swatch.className = 'ed-color-swatch';
      swatch.style.background = value || '#5b8ab5';

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.value = value || '#5b8ab5';
      swatch.appendChild(picker);

      const hex = document.createElement('input');
      hex.type = 'text';
      hex.className = 'ed-color-hex';
      hex.value = (value || '#5b8ab5').toUpperCase();
      hex.maxLength = 7;

      const sync = (v) => {
        swatch.style.background = v;
        hex.value = v.toUpperCase();
        picker.value = v;
        handleChange(field.key, v);
      };

      picker.addEventListener('input', () => sync(picker.value));
      hex.addEventListener('change', () => {
        const v = hex.value.trim();
        if (/^#[0-9a-f]{6}$/i.test(v)) sync(v);
      });

      row.appendChild(swatch);
      row.appendChild(hex);
      wrap.appendChild(row);
      break;
    }

    case 'image': {
      const preview = document.createElement('div');
      preview.className = value ? 'ed-img-preview' : 'ed-img-preview empty';
      if (value) preview.innerHTML = `<img src="${value}" />`;

      const actions = document.createElement('div');
      actions.className = 'ed-img-actions';

      const uploadLabel = document.createElement('label');
      uploadLabel.className = 'ed-upload-btn';
      uploadLabel.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
        Subir imagen
      `;
      const fileInput = document.createElement('input');
      fileInput.type  = 'file';
      fileInput.accept = 'image/*';
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        uploadLabel.textContent = 'Subiendo...';
        const url = await uploadImage(file, field.uploadKey || 'img');
        if (url) {
          preview.className = 'ed-img-preview';
          preview.innerHTML = `<img src="${url}" />`;
          urlInput.value = url;
          handleChange(field.key, url);
        }
        uploadLabel.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
          Cambiar imagen
        `;
      });
      uploadLabel.appendChild(fileInput);
      actions.appendChild(uploadLabel);

      const urlInput = document.createElement('input');
      urlInput.type  = 'text';
      urlInput.className = 'ed-field-input';
      urlInput.value = value || '';
      urlInput.placeholder = 'https://... (URL de imagen)';
      urlInput.style.marginTop = '6px';
      urlInput.addEventListener('input', () => {
        if (urlInput.value) {
          preview.className = 'ed-img-preview';
          preview.innerHTML = `<img src="${urlInput.value}" />`;
        } else {
          preview.className = 'ed-img-preview empty';
          preview.innerHTML = '';
        }
        handleChange(field.key, urlInput.value);
      });

      wrap.appendChild(preview);
      wrap.appendChild(actions);
      wrap.appendChild(urlInput);
      break;
    }

    case 'toggle': {
      const row = document.createElement('div');
      row.className = 'ed-toggle-row';

      const label = document.createElement('label');
      label.className = 'ed-field-label';
      label.style.margin = '0';
      label.textContent = field.label;

      const toggle = document.createElement('label');
      toggle.className = 'ed-toggle';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!value;

      const track = document.createElement('span');
      track.className = 'ed-toggle-track';
      const thumb = document.createElement('span');
      thumb.className = 'ed-toggle-thumb';

      chk.addEventListener('change', () => handleChange(field.key, chk.checked));
      toggle.appendChild(chk);
      toggle.appendChild(track);
      toggle.appendChild(thumb);
      row.appendChild(label);
      row.appendChild(toggle);
      wrap.appendChild(row);
      break;
    }
  }

  return wrap;
}

// ── CHANGE HANDLER ────────────────────────────────────────────────────────────
function handleChange(key, value) {
  pendingChanges[key] = value;
  postToFrame({ type: 'PS_UPDATE', field: key, value });
  setStatus('Cambios sin guardar', 'unsaved');
}

// ── IFRAME COMMUNICATION ──────────────────────────────────────────────────────
function postToFrame(msg) {
  const frame = document.getElementById('edFrame');
  if (frame && frame.contentWindow) {
    frame.contentWindow.postMessage(msg, '*');
  }
}

function onFrameMessage(e) {
  if (!e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'PS_SECTION_CLICK') {
    selectBlock(e.data.block);
  }
}

// ── SAVE ──────────────────────────────────────────────────────────────────────
async function saveChanges() {
  if (!Object.keys(pendingChanges).length) {
    setStatus('✓ Sin cambios pendientes', 'saved');
    setTimeout(() => setStatus(''), 2500);
    return;
  }
  const btn = document.getElementById('edSaveBtn');
  btn.textContent = 'Guardando...';
  btn.disabled = true;
  try {
    const { error } = await sb.from('stores').update(pendingChanges).eq('id', storeData.id);
    if (error) throw error;
    Object.assign(storeData, pendingChanges);
    pendingChanges = {};
    setStatus('✓ Guardado', 'saved');
    setTimeout(() => setStatus(''), 3000);
  } catch (err) {
    console.error(err);
    setStatus('Error al guardar', '');
  } finally {
    btn.textContent = 'Guardar';
    btn.disabled = false;
  }
}

// ── IMAGE UPLOAD ──────────────────────────────────────────────────────────────
async function uploadImage(file, type) {
  if (file.size > 2 * 1024 * 1024) {
    alert('La imagen no puede superar 2MB');
    return null;
  }
  const ext  = file.name.split('.').pop();
  const path = `design/${storeData.id}/${type}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('product-images').upload(path, file, { upsert: true });
  if (error) { console.error(error); return null; }
  const { data } = sb.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function setStatus(msg, cls = '') {
  const el = document.getElementById('edStatus');
  el.textContent = msg;
  el.className = 'ed-status' + (cls ? ` ${cls}` : '');
}

// ── MOBILE BOTTOM SHEET ───────────────────────────────────────────────────────
function initMobileSheet() {
  const sidebar = document.getElementById('edSidebar');
  const handle  = document.getElementById('edSheetHandle');
  const label   = document.getElementById('edSheetLabel');

  if (!handle) return;

  // Wire up save button inside sheet
  document.getElementById('edSaveBtnSheet').addEventListener('click', saveChanges);

  // Toggle sheet on handle tap
  handle.addEventListener('click', () => {
    sidebar.classList.toggle('ed-sheet-open');
  });

  // Touch drag for natural feel
  let startY = 0, startOpen = false;
  handle.addEventListener('touchstart', e => {
    startY    = e.touches[0].clientY;
    startOpen = sidebar.classList.contains('ed-sheet-open');
  }, { passive: true });

  handle.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dy) < 8) return; // treated as tap
    if (dy > 40)  sidebar.classList.remove('ed-sheet-open'); // swipe down → close
    if (dy < -40) sidebar.classList.add('ed-sheet-open');    // swipe up  → open
  }, { passive: true });

  // Update label when block is selected
  window.addEventListener('ed-block-selected', e => {
    label.textContent = e.detail || 'Editar secciones';
    sidebar.classList.add('ed-sheet-open');
  });

  // Reset label on back
  document.getElementById('edBackBtn').addEventListener('click', () => {
    label.textContent = 'Editar secciones';
  });
}

// (kept for compat — no-op on desktop)
function initMobilePreviewToggle() {}

// ── EMOJI PICKER ──────────────────────────────────────────────────────────────
function openEmojiPicker(key, btnEl) {
  const picker = document.getElementById('edEmojiPicker');

  if (emojiPickerTarget && emojiPickerTarget.key === key && picker.style.display !== 'none') {
    closeEmojiPicker(); return;
  }

  emojiPickerTarget = { key, btnEl };
  renderEmojiGrid(emojiCurrentCat);
  picker.style.display = 'block';

  // Position to the right of the sidebar so it never gets clipped
  const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ed-sidebar')) || 280;
  const topbarH  = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ed-topbar'))  || 52;
  const pickerH  = picker.offsetHeight || 340;
  const rect     = btnEl.getBoundingClientRect();

  let top = rect.top;
  if (top + pickerH > window.innerHeight - 8) top = window.innerHeight - pickerH - 8;
  if (top < topbarH + 4) top = topbarH + 4;

  picker.style.left = (sidebarW + 10) + 'px';
  picker.style.top  = top + 'px';
}

function closeEmojiPicker() {
  document.getElementById('edEmojiPicker').style.display = 'none';
  emojiPickerTarget = null;
}

function renderEmojiGrid(cat, filter = '') {
  emojiCurrentCat = cat;
  const grid  = document.getElementById('edEmojiGrid');
  const label = document.getElementById('edEmojiCatLabel');

  let emojis;
  if (filter) {
    emojis = Object.values(EMOJI_DB).flat().filter((e, i, a) => a.indexOf(e) === i);
    if (label) label.textContent = 'Resultados';
  } else {
    emojis = EMOJI_DB[cat] || [];
    if (label) label.textContent = EMOJI_CAT_NAMES[cat] || cat;
  }

  grid.innerHTML = emojis.map(e =>
    `<button class="ed-emoji-opt" title="${e}">${e}</button>`
  ).join('');

  grid.querySelectorAll('.ed-emoji-opt').forEach(btn => {
    btn.addEventListener('click', () => selectEmoji(btn.textContent.trim()));
  });
}

function selectEmoji(emoji) {
  if (!emojiPickerTarget) return;
  const { key, btnEl } = emojiPickerTarget;
  const span = btnEl.querySelector('.ed-emoji-val');
  if (span) span.textContent = emoji;
  handleChange(key, emoji);
  closeEmojiPicker();
}

function initEmojiPicker() {
  const picker = document.getElementById('edEmojiPicker');

  // Category buttons
  document.querySelectorAll('.ed-emoji-cat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.ed-emoji-cat').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('edEmojiSearch').value = '';
      renderEmojiGrid(btn.dataset.cat);
    });
  });

  // Search
  document.getElementById('edEmojiSearch').addEventListener('input', (e) => {
    const q = e.target.value.trim();
    renderEmojiGrid(emojiCurrentCat, q);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target) && !e.target.closest('.ed-emoji-btn')) {
      closeEmojiPicker();
    }
  });
}

// ── START ─────────────────────────────────────────────────────────────────────
init();
initEmojiPicker();
