const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let cart = JSON.parse(localStorage.getItem('cart') || '[]'); // [{id,name,price,qty}]
let products = [], registering = false, activeCategory = 'all', visibleCount = 24;
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
let searchTimer;
function syncSearch(value) { $('#search').value = value; clearTimeout(searchTimer); searchTimer = setTimeout(() => run(loadProducts), 350); }

async function api(url, method = 'GET', body) {
  const r = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body && JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
function notify(text, err) { const m = $('#msg'); m.textContent = text; m.className = 'msg' + (err ? ' err' : ''); m.hidden = !text; }
const run = (fn) => fn().catch((e) => notify(e.message, true));

function show(view) {
  notify('');
  ['shop', 'cart', 'auth', 'orders', 'admin'].forEach((v) => ($('#' + v).hidden = v !== view));
  if (view === 'shop') run(loadProducts);
  if (view === 'cart') renderCart();
  if (view === 'orders') run(loadOrders);
  if (view === 'admin') run(loadAdmin);
}
function renderNav() {
  const count = cart.reduce((n, i) => n + i.qty, 0);
  $('#nav').innerHTML = `<a onclick="show('shop')">Shop</a><a onclick="show('cart')">Cart (${count})</a>` +
    (user ? `${user.role === 'admin' ? '<a onclick="show(\'admin\')">Admin</a>' : ''}<a onclick="show('orders')">My Orders</a><a onclick="logout()">Logout (${esc(user.name)})</a>`
          : `<a onclick="show('auth')">Login</a>`);
}
const saveCart = () => { localStorage.setItem('cart', JSON.stringify(cart)); renderNav(); };

/* ---------- catalog & cart ---------- */
async function loadProducts() {
  const q = encodeURIComponent($('#search').value.trim());
  const grid = $('#grid');
  if (!products.length) grid.innerHTML = '<div class="loading-state"><span class="loader"></span><p>Finding your next favourite look…</p></div>';
  let result;
  try {
    result = await api('/products/sync-online?search=' + q);
    products = result.products || [];
    const status = $('#catalogStatus');
    if (status) status.textContent = result.warning || `${products.length} styles fetched from Myntra · catalogue refreshes automatically`;
  } catch (e) {
    products = await api('/products?search=' + q);
    const status = $('#catalogStatus');
    if (status) status.textContent = 'Could not reach the catalogue service. Check your connection and try again.';
  }
  visibleCount = 24;
  renderProducts();
}
function categoryMatch(p) {
  const c = String(p.category || '').toLowerCase();
  if (activeCategory === 'all') return true;
  if (activeCategory === 'men') return String(p.gender || '').toLowerCase() === 'men' || c.includes('mens-') || c === 'tops';
  if (activeCategory === 'women') return String(p.gender || '').toLowerCase() === 'women' || c.includes('womens-') || c === 'tops';
  if (activeCategory === 'shoes') return c.includes('shoes');
  if (activeCategory === 'accessories') return c.includes('bags') || c.includes('jewellery') || c.includes('sunglasses') || c.includes('watches');

  if (activeCategory === 'beauty') {
  return /beauty|skin.?care|fragrance|perfume|makeup|cosmetic|lipstick|mascara|moisturi[sz]er|face wash|cleanser|serum|sunscreen|bodywash|shampoo/.test(
    `${p.category || ''} ${p.name || ''} ${p.description || ''}`.toLowerCase()
  );
}

  if (activeCategory === 'watches') return c.includes('watches');
  return true;
}
function photoFallback(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('shoe')) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=85';
  if (c.includes('bag')) return 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=85';
  if (c.includes('watch')) return 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=85';
  if (c.includes('jewellery') || c.includes('jewelry')) return 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=85';
  if (c.includes('sunglass')) return 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=85';
  if (c.includes('beauty') || c.includes('skin') || c.includes('fragrance')) return 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=85';
  if (c.includes('dress') || c.includes('women')) return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85';
  return 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=85';
}
function selectProductPhoto(src, button) {
  const main = $('#detailMainImage');
  if (main) main.src = src;
  document.querySelectorAll('.detail-thumb').forEach((el) => el.classList.toggle('active', el === button));
}

function renderProducts() {
  const sort = $('#sortBy')?.value || 'featured';
  let filtered = products.filter(categoryMatch);
  if (sort === 'price-low') filtered.sort((a,b) => Number(a.price)-Number(b.price));
  if (sort === 'price-high') filtered.sort((a,b) => Number(b.price)-Number(a.price));
  if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
  const shown = filtered.slice(0, visibleCount);
  $('#grid').innerHTML = shown.map((p, index) => {
    const wished = wishlist.includes(p._id);
    const fallbackPhoto = photoFallback(p.category);
    const discount = Number(p.discountPercent || 0);
    const mrp = Number(p.mrp || p.price);
    return `<article class="product-card">
      <div class="product-photo-wrap" onclick="openProduct('${p._id}')" role="button" tabindex="0" aria-label="View ${esc(p.name)}" onkeydown="if(event.key==='Enter')openProduct('${p._id}')">
        <img class="product-photo" src="${esc(p.image || photoFallback(p.category))}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackPhoto}'">
        <span class="product-tag">${index % 3 === 0 ? 'TRENDING' : index % 3 === 1 ? 'STYLE PICK' : 'NEW FIND'}</span>
        <button class="wishlist ${wished ? 'wish-active' : ''}" aria-label="${wished ? 'Remove from' : 'Add to'} wishlist" onclick="event.stopPropagation();toggleWish('${p._id}',this)">${wished ? '♥' : '♡'}</button>
      </div>
      <div class="product-info"><p class="product-brand">${esc(p.brand || 'STYLESTREET EDIT')}</p>
        <h3 title="${esc(p.name)}" onclick="openProduct('${p._id}')">${esc(p.name)}</h3><p class="product-category">${esc(String(p.category || 'Fashion').replaceAll('-', ' '))}</p>
        <div class="product-price-row"><span class="price">${money(p.price)}</span>${mrp > Number(p.price) ? `<span class="mrp">${money(mrp)}</span><span class="discount">${discount > 0 ? `(${discount}% OFF)` : ''}</span>` : ''}</div>
        <button class="add-button" ${p.stock ? '' : 'disabled'} onclick="addToCart('${p._id}')">${p.stock ? 'ADD TO BAG +' : 'SOLD OUT'}</button>
      </div></article>`;
  }).join('') || '<p class="empty-state">No products found in this category. Try another search or browse all products.</p>';
  const more = $('#loadMore');
  if (more) { more.hidden = filtered.length <= visibleCount; more.textContent = `LOAD MORE PRODUCTS (${filtered.length - visibleCount} LEFT) ↓`; }
  const status = $('#catalogStatus');
  if (status && products.length) status.textContent = `Showing ${shown.length} of ${filtered.length} Myntra styles`; 
}
function showMore() { visibleCount += 24; renderProducts(); }
function setCategory(category, button) {
  activeCategory = category;
  document.querySelectorAll('.category-pill').forEach((el) => el.classList.toggle('selected', el === button));
  visibleCount = 24;
  renderProducts();
}
function toggleWish(id, button) {
  wishlist = wishlist.includes(id) ? wishlist.filter((x) => x !== id) : [...wishlist, id];
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  const active = wishlist.includes(id);
  button.classList.toggle('wish-active', active);
  button.textContent = active ? '♥' : '♡';
  notify(active ? 'Added to your wishlist' : 'Removed from your wishlist');
}
function openProduct(id) {
  const p = products.find((x) => x._id === id);
  if (!p) return;
  const gallery = [...new Set([...(Array.isArray(p.images) ? p.images : []), p.image].filter(Boolean))];
  $('#productDetail').innerHTML = `<div class="detail-layout"><div class="detail-gallery"><div class="detail-image"><img id="detailMainImage" src="${esc(gallery[0] || photoFallback(p.category))}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='${photoFallback('fashion')}'"></div>${gallery.length > 1 ? `<div class="detail-thumbnails">${gallery.slice(0,6).map((src,i)=>`<button class="detail-thumb ${i===0?'active':''}" onclick="selectProductPhoto('${esc(src)}',this)"><img src="${esc(src)}" alt="${esc(p.name)} photo ${i+1}" loading="lazy"></button>`).join('')}</div>` : ''}</div><div class="detail-copy"><p class="eyebrow">${esc(p.brand || 'MYNTRA STYLE')}</p><p class="product-category">${esc(String(p.category || 'Fashion').replaceAll('-', ' '))}</p><h2>${esc(p.name)}</h2><p class="detail-price">${money(p.price)} <span>Listed price from catalogue provider</span></p><p class="detail-description">${esc(p.description || 'A versatile addition to your everyday wardrobe. Style it your way and make it your own.')}</p><div class="detail-stock">● ${p.stock ? 'Availability reported by catalogue provider' : 'Currently unavailable'}</div>${p.sourceUrl ? `<a class="detail-wish" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">VIEW ON MYNTRA ↗</a>` : ''}<button class="detail-add" ${p.stock ? '' : 'disabled'} onclick="addToCart('${p._id}');closeProduct()">ADD TO BAG</button><button class="detail-wish" onclick="toggleWish('${p._id}',this)">${wishlist.includes(p._id) ? '♥ SAVED TO WISHLIST' : '♡ ADD TO WISHLIST'}</button><p class="detail-note">Product details and prices are supplied by a third-party catalogue provider and may change. Confirm the final price and availability on Myntra before purchasing.</p></div></div>`;
  $('#productModal').hidden = false;
  document.body.classList.add('modal-open');
}
function closeProduct() { $('#productModal').hidden = true; document.body.classList.remove('modal-open'); }
function addToCart(id) {
  const p = products.find((x) => x._id === id);
  const item = cart.find((i) => i.id === id);
  if (!p) return notify('Please refresh the catalogue and try again.', true);
  if (item) item.qty = Math.min(item.qty + 1, p.stock);
  else cart.push({ id, name: p.name, price: p.price, image: p.image, qty: 1 });
  saveCart(); notify(p.name + ' added to cart');
}
function changeQty(id, d) {
  const i = cart.find((x) => x.id === id);
  i.qty += d;
  if (i.qty <= 0) cart = cart.filter((x) => x.id !== id);
  saveCart(); renderCart();
}
function renderCart() {
  if (!cart.length) { $('#cartItems').innerHTML = '<p>Your cart is empty.</p>'; return; }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  $('#cartItems').innerHTML = cart.map((i) => `
    <div class="cart-line card"><img src="${esc(i.image || 'https://dummyjson.com/image/180x220?text=Style')}" alt="${esc(i.name)}" onerror="this.style.display='none'"><div class="cart-line-info"><b>${esc(i.name)}</b><span>${money(i.price)}</span><div class="qty-control"><button class="alt" onclick="changeQty('${i.id}',-1)">−</button> ${i.qty} <button class="alt" onclick="changeQty('${i.id}',1)">+</button></div></div><b>${money(i.price * i.qty)}</b></div>`).join('') +
    `<div class="cart-summary card"><p>Subtotal <b>${money(total)}</b></p><p>Shipping <b>FREE</b></p><div class="cart-total">Total <b>${money(total)}</b></div><p class="small">Demo checkout · no real payment will be taken.</p><input id="address" placeholder="Delivery address"><button class="checkout-button" onclick="checkout()">CONTINUE TO CHECKOUT →</button></div>`;
}
async function checkout() {
  if (!user) { show('auth'); return notify('Please log in to check out', true); }
  await run(async () => {
    await api('/orders', 'POST', { items: cart.map((i) => ({ productId: i.id, qty: i.qty })), address: $('#address').value });
    cart = []; saveCart(); show('orders'); notify('Order placed successfully!');
  });
}

/* ---------- auth ---------- */
function toggleAuth() {
  registering = !registering;
  $('#authTitle').textContent = registering ? 'Register' : 'Login';
  $('#aName').hidden = !registering;
  $('#authSwitch').textContent = registering ? 'Have an account? Login' : 'Need an account? Register';
}
function submitAuth() {
  run(async () => {
    const d = await api(registering ? '/auth/register' : '/auth/login', 'POST',
      { name: $('#aName').value, email: $('#aEmail').value, password: $('#aPass').value });
    token = d.token; user = d.user;
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
    renderNav(); show('shop');
  });
}
function logout() { token = user = null; localStorage.removeItem('token'); localStorage.removeItem('user'); renderNav(); show('shop'); }

/* ---------- orders ---------- */
const orderHtml = (o) => `<div class="card"><div class="row"><b>#${o._id.slice(-6)}</b><span class="badge">${esc(o.status)}</span></div>
  ${o.user ? `<p class="small">${esc(o.user.name)} (${esc(o.user.email)})</p>` : ''}
  <p>${o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join(', ')}</p>
  <p class="small">${esc(o.address)} · ${new Date(o.createdAt).toLocaleString()}</p><b>₹${o.total}</b></div>`;
async function loadOrders() {
  if (!user) return show('auth');
  const list = await api('/orders/mine');
  $('#orderList').innerHTML = list.map(orderHtml).join('') || '<p>No orders yet.</p>';
}

/* ---------- admin ---------- */
async function loadAdmin() {
  if (!user || user.role !== 'admin') return show('shop');
  const [prods, orders] = await Promise.all([api('/products'), api('/orders')]);
  products = prods;
  $('#adminProducts').innerHTML = prods.map((p) => `<div class="card row"><span>${esc(p.name)} — ₹${p.price} (stock ${p.stock})</span>
    <span><button class="alt" onclick="editProduct('${p._id}')">Edit</button> <button class="danger" onclick="deleteProduct('${p._id}')">Delete</button></span></div>`).join('');
  $('#adminOrders').innerHTML = orders.map((o) => orderHtml(o) +
    `<select onchange="setStatus('${o._id}',this.value)" style="margin-top:-6px">${['Pending', 'Shipped', 'Delivered', 'Cancelled'].map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`).join('') || '<p>No orders.</p>';
}
const fields = { Name: 'name', Desc: 'description', Price: 'price', Stock: 'stock', Cat: 'category', Img: 'image' };
function editProduct(id) {
  const p = products.find((x) => x._id === id);
  $('#pId').value = id;
  for (const [k, f] of Object.entries(fields)) $('#p' + k).value = p[f] ?? '';
  window.scrollTo(0, 0);
}
function saveProduct() {
  run(async () => {
    const body = Object.fromEntries(Object.entries(fields).map(([k, f]) => [f, $('#p' + k).value]));
    const id = $('#pId').value;
    await api(id ? '/products/' + id : '/products', id ? 'PUT' : 'POST', body);
    $('#pId').value = ''; Object.keys(fields).forEach((k) => ($('#p' + k).value = ''));
    notify('Product saved'); loadAdmin();
  });
}
const deleteProduct = (id) => confirm('Delete this product?') && run(async () => { await api('/products/' + id, 'DELETE'); loadAdmin(); });
const setStatus = (id, status) => run(async () => { await api(`/orders/${id}/status`, 'PATCH', { status }); notify('Status updated'); });

renderNav(); show('shop');
