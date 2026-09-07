/* ---------------- Telegram Mini App ---------------- */
const TG = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
if (TG){
  TG.ready();
  TG.expand();
  if (TG.setHeaderColor) TG.setHeaderColor('#141414');
  if (TG.setBackgroundColor) TG.setBackgroundColor('#141414');
  if (TG.disableVerticalSwipes) TG.disableVerticalSwipes();
}

const DATA    = window.DATA_MAIN;
const TOPUPS  = window.DATA_TOPUPS;
const BUILD   = window.DATA_BUILD;
const CATS    = DATA.cats;
const CATALOG = DATA.catalog;

function shuffleInPlace(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function isAlicorn(item){
  const n = (item && item.n) ? item.n : '';
  if (n.indexOf('Луна-вселенной') !== -1) return false;
  if (n.indexOf('Искорка') !== -1) return true;
  if (n.indexOf('Селестия') !== -1) return true;
  if (n.indexOf('Каденс') !== -1) return true;
  if (n.indexOf('Флурри Харт') !== -1) return true;
  if (n.indexOf('Луна') !== -1) return true;
  return false;
}
function sortAlicornsFirst(arr){
  const alicorns = [];
  const rest = [];
  for (let i = 0; i < arr.length; i++){
    (isAlicorn(arr[i]) ? alicorns : rest).push(arr[i]);
  }
  arr.length = 0;
  for (let i = 0; i < alicorns.length; i++) arr.push(alicorns[i]);
  for (let i = 0; i < rest.length; i++) arr.push(rest[i]);
  return arr;
}
Object.keys(CATALOG).forEach(k => sortAlicornsFirst(CATALOG[k]));
const IMGBASE = 'images/';

const PALETTE = ['#2a2a2a','#26292f','#2e2a26','#2f2830','#262c2a','#2b2b31','#302c26','#252b2e'];
function colorFor(str){
  let h = 0;
  for (let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) >>> 0; }
  return PALETTE[h % PALETTE.length];
}
function initials(str){
  const parts = String(str).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0,2);
  return (parts[0][0] + parts[1][0]);
}
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function imgSrc(it){
  if (it.i) return it.i;
  if (it.u) return IMGBASE + it.u;
  return '';
}
const PONY_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c0-4 2.5-7 6-8l1-3 2 2 3-1-1 3c2.5 1 4 3.5 4 6"/><path d="M3 17h15a3 3 0 0 0 3-3"/><path d="M7 17v3M11 17v3M15 17v3"/></svg>';
function placeholderHTML(name){
  return `<div class="placeholder" style="background:${colorFor(name)}">${PONY_GLYPH}<div class="mono">${esc(initials(name))}</div></div>`;
}
window.imgFail = function(el){
  const name = el.getAttribute('alt') || '?';
  const parent = el.parentNode;
  if (parent) parent.innerHTML = placeholderHTML(name);
};
function mediaHTML(it){
  const src = imgSrc(it);
  if (!src) return placeholderHTML(it.n);
  return `<img loading="lazy" referrerpolicy="no-referrer" src="${src}" alt="${esc(it.n)}" onerror="imgFail(this)">`;
}

/* Минимальная сумма заказа — правится одной строкой. */
const MIN_ORDER = 200;

let state = { nav:'topup', cat:'pony', query:'', visible:60 };
let cartItems = [];

const contentEl     = document.getElementById('content');
const searchEl      = document.getElementById('searchInput');
const searchWrapEl  = document.getElementById('searchWrap');
const searchClearEl = document.getElementById('searchClear');
const subbarEl      = document.getElementById('subbar');
const catSelectEl   = document.getElementById('catSelect');
const catSelectVal  = document.getElementById('catSelectVal');
const catSheet      = document.getElementById('catSheet');
const catSheetBody  = document.getElementById('catSheetBody');
const catSheetClose = document.getElementById('catSheetClose');
const scrim         = document.getElementById('scrim');
const cartDotEl     = document.getElementById('cartCount');
const cartBtn       = document.getElementById('cartBtn');
const cartDrawer    = document.getElementById('cartDrawer');
const cartBody      = document.getElementById('cartBody');
const cartFoot      = document.getElementById('cartFoot');
const cartHeadCount = document.getElementById('cartHeadCount');
const cartCloseBtn  = document.getElementById('cartCloseBtn');
const topBtn        = document.getElementById('topBtn');
const segmentEl     = document.getElementById('segment');
const segInk        = document.getElementById('segInk');

/* ---------------- корзина: счётчик ---------------- */
function syncCartBtn(){
  cartDotEl.textContent = cartItems.length;
  cartBtn.classList.toggle('filled', cartItems.length > 0);
}
function bumpCart(){
  cartDotEl.classList.remove('bump'); void cartDotEl.offsetWidth; cartDotEl.classList.add('bump');
}
function addToCart(name, sub, price, img){
  cartItems.push({name, sub, price, img: img || ''});
  syncCartBtn();
  bumpCart();
}
function priceToNum(p){
  const m = String(p).match(/[\d\s]+/);
  return m ? parseInt(m[0].replace(/\s/g,''),10) || 0 : 0;
}
function cartTotal(){ return cartItems.reduce((s,it)=> s + priceToNum(it.price), 0); }

function orderText(){
  const lines = cartItems.map((it,i)=> (i+1)+'. '+it.name+' — '+it.sub+' — '+it.price);
  return 'Заказ из The Pony Store:\n' + lines.join('\n') + '\n\nИтого: ' + cartTotal() + ' ₽';
}
async function copyText(text){
  try{ await navigator.clipboard.writeText(text); return true; }catch(e){}
  try{
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }catch(e){ return false; }
}

/* ---------------- бегущая линия под разделами ---------------- */
function moveSegInk(){
  const act = segmentEl.querySelector('.seg.active');
  if (!act) return;
  segInk.style.left  = act.offsetLeft + 'px';
  segInk.style.width = act.offsetWidth + 'px';
}
window.addEventListener('resize', moveSegInk);

/* ---------------- панели ---------------- */
function closeOverlays(){
  scrim.classList.remove('show');
  catSheet.classList.remove('show');
  cartDrawer.classList.remove('show');
  document.body.style.overflow = '';
}
scrim.addEventListener('click', closeOverlays);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });

/* ---------------- выбор категории ---------------- */
function catByKey(k){ return CATS.find(c => c.key === k) || CATS[0]; }
function syncCatSelect(){
  const c = catByKey(state.cat);
  catSelectVal.innerHTML = `${esc(c.label)} <em>${c.count}</em>`;
}
function openCatSheet(){
  catSheetBody.innerHTML = CATS.map(c => `
    <button class="cat-row ${state.cat===c.key?'active':''}" data-cat="${c.key}">
      <span>${esc(c.label)}</span>
      <span class="num">${c.count}</span>
    </button>`).join('');
  catSheetBody.querySelectorAll('.cat-row').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.cat = el.dataset.cat;
      state.visible = 60;
      state.query = '';
      searchEl.value = '';
      searchClearEl.classList.remove('show');
      syncCatSelect();
      closeOverlays();
      renderContent();
      window.scrollTo({top:0, behavior:'smooth'});
    });
  });
  scrim.classList.add('show');
  catSheet.classList.add('show');
}
catSelectEl.addEventListener('click', openCatSheet);
catSheetClose.addEventListener('click', closeOverlays);

/* ---------------- корзина ---------------- */
function renderCart(){
  const total = cartTotal();
  cartHeadCount.textContent = cartItems.length ? cartItems.length + ' поз.' : '';
  if (!cartItems.length){
    cartBody.innerHTML = `<div class="modal-empty">Пока пусто.<br>Добавьте что-нибудь из каталога, пополнений или соберите набор сами.<br><br>Минимальная сумма заказа — <b>${MIN_ORDER} ₽</b>.</div>`;
    cartFoot.innerHTML = '';
    return;
  }
  cartBody.innerHTML = `
    <div class="cart-list">
      ${cartItems.map((it,i)=>`
        <div class="cart-row">
          <div class="left">
            <div class="thumb">${it.img ? `<img src="${it.img}" alt="${esc(it.name)}" onerror="imgFail(this)">` : placeholderHTML(it.name)}</div>
            <div class="info">
              <div class="name">${esc(it.name)}</div>
              <div class="sub">${esc(it.sub)}</div>
            </div>
          </div>
          <div class="right">
            <div class="price">${esc(it.price)}</div>
            <button class="rm" data-i="${i}" aria-label="Убрать">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
            </button>
          </div>
        </div>`).join('')}
    </div>`;
  cartFoot.innerHTML = `
    <div class="cart-total"><span>Итого</span><span class="v">${total} ₽</span></div>
    ${total < MIN_ORDER
      ? `<div class="cart-warn">До минимальной суммы не хватает <b>${MIN_ORDER - total} ₽</b>.</div>`
      : ''}
    <div class="cart-actions">
      <button class="modal-btn" id="cartClearBtn">Очистить</button>
      <button class="modal-btn" id="cartCopyBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Копировать</span>
      </button>
      <button class="modal-btn primary" id="cartSendBtn" ${total < MIN_ORDER ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        Отправить
      </button>
    </div>`;

  cartBody.querySelectorAll('.rm').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      cartItems.splice(parseInt(btn.dataset.i,10),1);
      syncCartBtn();
      renderCart();
    });
  });
  document.getElementById('cartClearBtn').addEventListener('click', ()=>{
    cartItems = []; syncCartBtn(); renderCart();
  });
  const copyBtn = document.getElementById('cartCopyBtn');
  copyBtn.addEventListener('click', async ()=>{
    const ok = await copyText(orderText());
    const lbl = copyBtn.querySelector('span');
    copyBtn.classList.toggle('copied', ok);
    lbl.textContent = ok ? 'Скопировано' : 'Не вышло';
    setTimeout(()=>{ copyBtn.classList.remove('copied'); lbl.textContent = 'Копировать'; }, 1600);
  });
  document.getElementById('cartSendBtn').addEventListener('click', ()=>{
    if (cartTotal() < MIN_ORDER) return;
    const url = 'https://t.me/egordiaz?text=' + encodeURIComponent(orderText());
    if (TG && TG.openTelegramLink) TG.openTelegramLink(url);
    else window.open(url, '_blank');
  });
}
function openCart(){
  renderCart();
  scrim.classList.add('show');
  cartDrawer.classList.add('show');
}
cartBtn.addEventListener('click', openCart);
cartCloseBtn.addEventListener('click', closeOverlays);

/* ---------------- наверх ---------------- */
window.addEventListener('scroll', ()=>{
  topBtn.classList.toggle('show', window.scrollY > 400);
});
topBtn.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));

/* ---------------- каталог ---------------- */
let currentList = [];
function cardHTML(item, idx){
  return `
    <div class="card">
      <div class="card-media">${mediaHTML(item)}</div>
      <div class="card-name">${esc(item.n)}</div>
      <div class="card-loc">${esc(item.l || '—')}</div>
      <div class="card-bottom">
        <div class="card-price">${esc(item.p)}</div>
        <button class="add-btn" aria-label="Добавить" data-idx="${idx}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </button>
      </div>
    </div>`;
}
function bindAddButtons(container){
  container.querySelectorAll('.add-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      if (btn.classList.contains('added')) return;
      const it = currentList[parseInt(btn.dataset.idx,10)];
      if (!it) return;
      btn.classList.add('added');
      addToCart(it.n, it.l || '—', it.p, imgSrc(it));
    });
  });
}
function renderCatalog(){
  let list = CATALOG[state.cat] || [];
  const q = state.query.toLowerCase().trim();
  if (q) list = list.filter(p => (p.n||'').toLowerCase().includes(q) || (p.l||'').toLowerCase().includes(q));
  const slice = list.slice(0, state.visible);
  if (!slice.length){
    contentEl.innerHTML = `<div class="empty"><div class="big">🔍</div><div class="t">Ничего не найдено</div><div class="s">Попробуйте изменить запрос или выбрать другую категорию.</div></div>`;
    return;
  }
  const hasMore = list.length > state.visible;
  currentList = slice;
  contentEl.innerHTML = `<div class="grid">${slice.map((it,i)=>cardHTML(it,i)).join('')}</div>` +
    (hasMore ? `<button class="more-btn" id="moreBtn">Показать ещё · осталось ${list.length - state.visible}</button>` : '');
  bindAddButtons(contentEl);
  const moreBtn = document.getElementById('moreBtn');
  if (moreBtn) moreBtn.addEventListener('click', ()=>{ state.visible += 60; renderCatalog(); });
}

/* Названия наборов — витринные, задаются здесь, данные не трогаем.
   Ключ — исходный title из data-topups. */
const TOPUP_SKIN = {
  'Мега набор':        { title:'Сокровищница Кантерлота', tag:'всё и сразу' },
  'Большой набор':     { title:'Сундук Эквестрии',        tag:'берут чаще всего' },
  'Стандартный набор': { title:'Мешочек Понивилля',       tag:'золотая середина' },
  'Мини набор':        { title:'Кармашек пони',           tag:'на пробу' }
};
function skin(t){
  const s = TOPUP_SKIN[t.title];
  return s ? s : { title: t.title, tag: 'набор' };
}

/* ---------------- пополнения ---------------- */
function renderTopup(){
  contentEl.innerHTML = `<div class="sec-title">Комбо-наборы</div>` + TOPUPS.map((t,i) => `
    <div class="topup-row ${t.hot === true || t.hot === 'True' ? 'hot' : ''}">
      <div class="topup-head">
        <div class="topup-title">${skin(t).title}</div>
        <div class="topup-price">${t.price}</div>
      </div>
      <div class="topup-tag">${skin(t).tag}</div>
      <div class="topup-body">
        <div class="topup-media"><img src="${t.image}" alt=""></div>
        <div class="topup-list">
          ${t.items.map(x => `<div class="topup-item"><img src="${x.icon}" alt=""> <b>${x.amount}</b> ${x.label}</div>`).join('')}
        </div>
      </div>
      <button class="topup-cta" data-i="${i}">
        Добавить
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
      </button>
    </div>
  `).join('');
  contentEl.querySelectorAll('.topup-cta').forEach(btn=>{
    const t = TOPUPS[parseInt(btn.dataset.i,10)];
    btn.addEventListener('click', ()=>{
      addToCart(skin(t).title, 'Комбо', t.price, t.image);
      btn.classList.add('done');
      btn.firstChild.textContent = 'В заказе ';
      setTimeout(()=>{ btn.classList.remove('done'); btn.firstChild.textContent = 'Добавить '; }, 1400);
    });
  });
}

/* ---------------- собери сам ---------------- */
const buildSelected = {};
function renderBuild(){
  contentEl.innerHTML = `
    <div class="sec-title">Конструктор набора</div>
    <div class="build-note">Собираете набор сами: по одному варианту на ресурс. Выгоднее брать готовое комбо — конструктор нужен, когда надо что-то одно.</div>
    ${BUILD.map((section, si) => `
      <div class="build-block">
        <div class="build-head">${section.icon.startsWith('emoji:') ? section.icon.slice(6) : `<img src="${section.icon}" alt="">`} ${section.title}</div>
        ${section.options.map((o, oi) => `
          <button class="build-opt ${buildSelected[si]===oi ? 'selected':''}" data-section="${si}" data-opt="${oi}">
            <span class="mark"></span>
            <span class="amt">${o.amount}</span>
            <span class="p">${o.price}</span>
          </button>
        `).join('')}
        ${buildSelected[si] !== undefined ? `
          <button class="build-add" data-section="${si}">
            Добавить ${section.options[buildSelected[si]].amount} — ${section.options[buildSelected[si]].price}
          </button>
        ` : ''}
      </div>
    `).join('')}
  `;
  contentEl.querySelectorAll('.build-opt').forEach(el=>{
    el.addEventListener('click', ()=>{
      const si = parseInt(el.dataset.section,10);
      const oi = parseInt(el.dataset.opt,10);
      buildSelected[si] = (buildSelected[si] === oi) ? undefined : oi;
      if (buildSelected[si] === undefined) delete buildSelected[si];
      renderBuild();
    });
  });
  contentEl.querySelectorAll('.build-add').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const si = parseInt(btn.dataset.section,10);
      const section = BUILD[si];
      const opt = section.options[buildSelected[si]];
      addToCart(section.title, opt.amount, opt.price, section.icon.startsWith('emoji:') ? '' : section.icon);
      delete buildSelected[si];
      renderBuild();
    });
  });
}

/* ---------------- переключение разделов ---------------- */
function renderContent(){
  const isCatalog = state.nav === 'catalog';
  subbarEl.style.display = isCatalog ? '' : 'none';
  contentEl.classList.remove('fade-in');
  if (isCatalog) renderCatalog();
  else if (state.nav === 'topup') renderTopup();
  else if (state.nav === 'build') renderBuild();
  void contentEl.offsetWidth;
  contentEl.classList.add('fade-in');
}

searchEl.addEventListener('input', (e)=>{
  state.query = e.target.value;
  state.visible = 60;
  searchClearEl.classList.toggle('show', !!e.target.value);
  renderContent();
});
searchClearEl.addEventListener('click', ()=>{
  searchEl.value = ''; state.query = ''; state.visible = 60;
  searchClearEl.classList.remove('show');
  renderContent();
});

segmentEl.querySelectorAll('.seg').forEach(el=>{
  el.addEventListener('click', ()=>{
    if (el.classList.contains('active')) { window.scrollTo({top:0, behavior:'smooth'}); return; }
    segmentEl.querySelectorAll('.seg').forEach(n=>n.classList.remove('active'));
    el.classList.add('active');
    moveSegInk();
    state.nav = el.dataset.nav;
    state.visible = 60;
    renderContent();
    window.scrollTo({top:0, behavior:'smooth'});
  });
});

syncCatSelect();
syncCartBtn();
renderContent();
moveSegInk();
window.addEventListener('load', moveSegInk);
setTimeout(moveSegInk, 200);
setTimeout(moveSegInk, 2100);

setTimeout(()=>{ const s=document.getElementById('splash'); if (s) s.style.display='none'; }, 2300);
