// =============================================
//  ChocoDistro — app.js
//  All business logic lives here.
//  Data is saved in localStorage so it
//  persists between sessions automatically.
// =============================================

// ----- Storage keys -----
const SK = {
  shops:    'cd_shops',
  orders:   'cd_orders',
  payments: 'cd_payments',
  products: 'cd_products',
};

// ----- In-memory database -----
// All data lives here while the app is running.
// It is loaded from localStorage on startup and
// saved back every time something changes.
let DB = {
  shops:    [],
  orders:   [],
  payments: [],
  products: [],
};

// ----- Load from localStorage -----
function loadDB() {
  for (const [key, sk] of Object.entries(SK)) {
    try {
      const raw = localStorage.getItem(sk);
      if (raw) DB[key] = JSON.parse(raw);
    } catch (e) {
      console.warn('Could not load', key, e);
    }
  }
}

// ----- Save one collection to localStorage -----
function saveDB(key) {
  try {
    localStorage.setItem(SK[key], JSON.stringify(DB[key]));
  } catch (e) {
    console.warn('Could not save', key, e);
  }
}

// ----- Helpers -----
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n) {
  return '$' + parseFloat(n || 0).toFixed(2);
}

function daysSince(d) {
  if (!d) return 999;
  return Math.floor((Date.now() - new Date(d)) / 864e5);
}

function shopName(id) {
  return DB.shops.find(s => s.id === id)?.name || '—';
}

// ----- Tag helpers -----
function statusTag(s) {
  const map = { paid: ['tg','Paid'], partial: ['ta','Partial'], unpaid: ['tr','Unpaid'] };
  const [cls, label] = map[s] || ['tb', s];
  return `<span class="tag ${cls}">${label}</span>`;
}

function urgencyTag(days) {
  if (days > 14) return '<span class="tag tr">Overdue</span>';
  if (days > 7)  return '<span class="tag ta">Due soon</span>';
  return '<span class="tag tg">OK</span>';
}

function marginTag(pct) {
  if (pct >= 35) return `<span class="tag tg">${pct}%</span>`;
  if (pct >= 20) return `<span class="tag ta">${pct}%</span>`;
  return `<span class="tag tr">${pct}%</span>`;
}

// =============================================
//  NAVIGATION
// =============================================
function nav(id, btn) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  btn.classList.add('on');
  renderAll();
}

// =============================================
//  MODALS
// =============================================
function openM(id, data) {
  if (id === 'mShop')  fillShopForm(data);
  if (id === 'mOrder') fillOrderForm(data);
  if (id === 'mPay')   fillPayForm();
  if (id === 'mProd')  fillProdForm(data);
  document.getElementById(id).classList.add('open');
}

function closeM(id) {
  document.getElementById(id).classList.remove('open');
}

// Close modal when clicking the dark overlay
document.querySelectorAll('.overlay').forEach(o => {
  o.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });
});

// =============================================
//  SHOPS
// =============================================
function fillShopForm(data) {
  document.getElementById('s-id').value      = data?.id      || '';
  document.getElementById('s-name').value    = data?.name    || '';
  document.getElementById('s-city').value    = data?.city    || '';
  document.getElementById('s-contact').value = data?.contact || '';
  document.getElementById('s-phone').value   = data?.phone   || '';
  document.getElementById('s-addr').value    = data?.addr    || '';
  document.getElementById('s-notes').value   = data?.notes   || '';
  document.getElementById('mShop-title').textContent = data ? 'Edit shop' : 'Add shop';
}

function saveShop() {
  const id  = document.getElementById('s-id').value || uid();
  const obj = {
    id,
    name:      document.getElementById('s-name').value.trim(),
    city:      document.getElementById('s-city').value.trim(),
    contact:   document.getElementById('s-contact').value.trim(),
    phone:     document.getElementById('s-phone').value.trim(),
    addr:      document.getElementById('s-addr').value.trim(),
    notes:     document.getElementById('s-notes').value.trim(),
    lastVisit: document.getElementById('s-id').value ? (DB.shops.find(s => s.id === id)?.lastVisit || today()) : today(),
  };
  if (!obj.name) { alert('Shop name is required'); return; }
  const idx = DB.shops.findIndex(s => s.id === id);
  if (idx >= 0) DB.shops[idx] = obj; else DB.shops.push(obj);
  saveDB('shops');
  closeM('mShop');
  renderAll();
}

function delShop(id) {
  confirmDel(
    `Delete shop "${shopName(id)}" and all its orders/payments?`,
    () => {
      DB.shops    = DB.shops.filter(s => s.id !== id);
      DB.orders   = DB.orders.filter(o => o.shopId !== id);
      DB.payments = DB.payments.filter(p => p.shopId !== id);
      saveDB('shops'); saveDB('orders'); saveDB('payments');
    }
  );
}

function renderShops(q = '') {
  const list = q
    ? DB.shops.filter(s => (s.name + s.city + s.contact).toLowerCase().includes(q.toLowerCase()))
    : DB.shops;

  if (!list.length) {
    document.getElementById('shop-list').innerHTML = '<div class="empty">No shops yet — click "Add shop" to get started</div>';
    return;
  }

  const rows = list.map(s => {
    const paid  = DB.payments.filter(p => p.shopId === s.id && p.type === 'received').reduce((a, p) => a + p.amt, 0);
    const owed  = DB.orders.filter(o => o.shopId === s.id).reduce((a, o) => a + o.total, 0);
    const debt  = Math.max(0, owed - paid);
    const dc    = debt > 200 ? 'tr' : debt > 0 ? 'ta' : 'tg';
    const editData = JSON.stringify(s).replace(/'/g, '&#39;');
    return `<tr>
      <td>${s.name}</td>
      <td>${s.city}</td>
      <td>${s.contact}</td>
      <td>${s.phone}</td>
      <td><span class="tag ${dc}">${fmt(debt)}</span></td>
      <td>${s.lastVisit || '—'}</td>
      <td><div class="actions">
        <button class="btn bsm" onclick='openM("mShop",${editData})'><i class="ti ti-edit"></i></button>
        <button class="btn bsm" onclick="delShop('${s.id}')"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');

  document.getElementById('shop-list').innerHTML = `
    <table>
      <tr>
        <th style="width:20%">Name</th>
        <th style="width:15%">City</th>
        <th style="width:14%">Contact</th>
        <th style="width:16%">Phone</th>
        <th style="width:12%">Debt</th>
        <th style="width:13%">Last visit</th>
        <th style="width:10%"></th>
      </tr>
      ${rows}
    </table>`;
}

// =============================================
//  ORDERS
// =============================================
function fillOrderForm(data) {
  const shopSel = document.getElementById('o-shop');
  const prodSel = document.getElementById('o-prod');

  shopSel.innerHTML = DB.shops.length
    ? DB.shops.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
    : '<option>No shops yet</option>';

  prodSel.innerHTML = DB.products.length
    ? DB.products.map(p => `<option value="${p.id}" data-buy="${p.buy}" data-sell="${p.sell}">${p.name}</option>`).join('')
    : '<option>No products yet</option>';

  document.getElementById('o-id').value     = data?.id     || '';
  document.getElementById('o-date').value   = data?.date   || today();
  document.getElementById('o-qty').value    = data?.qty    || '';
  document.getElementById('o-price').value  = data?.price  || '';
  document.getElementById('o-status').value = data?.status || 'unpaid';
  document.getElementById('o-notes').value  = data?.notes  || '';

  if (data) {
    shopSel.value = data.shopId;
    prodSel.value = data.prodId;
  }

  document.getElementById('mOrder-title').textContent = data ? 'Edit order' : 'New order';
  calcOrderTotal();
}

function calcOrderTotal() {
  const qty   = parseFloat(document.getElementById('o-qty').value)   || 0;
  const price = parseFloat(document.getElementById('o-price').value) || 0;
  document.getElementById('o-total').value = qty && price ? fmt(qty * price) : '';
}

function saveOrder() {
  const id      = document.getElementById('o-id').value || uid();
  const qty     = parseFloat(document.getElementById('o-qty').value)   || 0;
  const price   = parseFloat(document.getElementById('o-price').value) || 0;
  const prodSel = document.getElementById('o-prod');
  const prodOpt = prodSel.options[prodSel.selectedIndex];
  const buyPrice = parseFloat(prodOpt?.dataset?.buy || 0);

  const obj = {
    id,
    shopId:   document.getElementById('o-shop').value,
    prodId:   prodSel.value,
    prodName: prodOpt?.text || '',
    date:     document.getElementById('o-date').value,
    qty,
    price,
    buyPrice,
    total:    qty * price,
    status:   document.getElementById('o-status').value,
    notes:    document.getElementById('o-notes').value.trim(),
  };

  if (!obj.shopId || !obj.prodId || !qty) { alert('Shop, product and quantity are required'); return; }

  const idx = DB.orders.findIndex(o => o.id === id);
  if (idx >= 0) DB.orders[idx] = obj; else DB.orders.push(obj);
  saveDB('orders');
  closeM('mOrder');
  renderAll();
}

function delOrder(id) {
  confirmDel('Delete this order?', () => {
    DB.orders = DB.orders.filter(o => o.id !== id);
    saveDB('orders');
  });
}

function renderOrders() {
  const list = [...DB.orders].sort((a, b) => (b.date > a.date ? 1 : -1));

  if (!list.length) {
    document.getElementById('order-list').innerHTML = '<div class="empty">No orders yet</div>';
    return;
  }

  const rows = list.map(o => {
    const editData = JSON.stringify(o).replace(/'/g, '&#39;');
    return `<tr>
      <td>${o.date}</td>
      <td>${shopName(o.shopId)}</td>
      <td>${o.prodName}</td>
      <td>${o.qty}</td>
      <td>${fmt(o.price)}</td>
      <td>${fmt(o.total)}</td>
      <td>${statusTag(o.status)}</td>
      <td>${o.notes || '—'}</td>
      <td><div class="actions">
        <button class="btn bsm" onclick='openM("mOrder",${editData})'><i class="ti ti-edit"></i></button>
        <button class="btn bsm" onclick="delOrder('${o.id}')"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');

  document.getElementById('order-list').innerHTML = `
    <table>
      <tr>
        <th style="width:10%">Date</th>
        <th style="width:16%">Shop</th>
        <th style="width:18%">Product</th>
        <th style="width:6%">Qty</th>
        <th style="width:9%">Unit $</th>
        <th style="width:10%">Total</th>
        <th style="width:10%">Status</th>
        <th style="width:13%">Notes</th>
        <th style="width:8%"></th>
      </tr>
      ${rows}
    </table>`;
}

// =============================================
//  PAYMENTS
// =============================================
function fillPayForm() {
  const shopSel = document.getElementById('p-shop');
  shopSel.innerHTML = DB.shops.length
    ? DB.shops.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
    : '<option>No shops yet</option>';

  document.getElementById('p-amt').value      = '';
  document.getElementById('p-date').value     = today();
  document.getElementById('p-notes').value    = '';
  document.getElementById('p-type').value     = 'received';
  document.getElementById('p-supplier').value = '';
  togglePayParty();
}

function togglePayParty() {
  const t = document.getElementById('p-type').value;
  document.getElementById('p-shop-row').style.display     = t === 'received' ? '' : 'none';
  document.getElementById('p-supplier-row').style.display = t === 'sent'     ? '' : 'none';
}

function savePay() {
  const type     = document.getElementById('p-type').value;
  const shopId   = type === 'received' ? document.getElementById('p-shop').value : '';
  const party    = type === 'received'
    ? (DB.shops.find(s => s.id === shopId)?.name || '—')
    : (document.getElementById('p-supplier').value.trim() || 'Turkey supplier');

  const obj = {
    id:     uid(),
    type,
    shopId,
    party,
    amt:    parseFloat(document.getElementById('p-amt').value) || 0,
    date:   document.getElementById('p-date').value,
    method: document.getElementById('p-method').value,
    notes:  document.getElementById('p-notes').value.trim(),
  };

  if (!obj.amt) { alert('Amount is required'); return; }

  DB.payments.push(obj);
  saveDB('payments');
  closeM('mPay');
  renderAll();
}

function delPay(id) {
  confirmDel('Delete this payment record?', () => {
    DB.payments = DB.payments.filter(p => p.id !== id);
    saveDB('payments');
  });
}

function renderPayments() {
  const received    = DB.payments.filter(p => p.type === 'received').reduce((a, p) => a + p.amt, 0);
  const sent        = DB.payments.filter(p => p.type === 'sent').reduce((a, p) => a + p.amt, 0);
  const totalOrders = DB.orders.reduce((a, o) => a + o.total, 0);
  const outstanding = Math.max(0, totalOrders - received);

  document.getElementById('pay-metrics').innerHTML = `
    <div class="met"><div class="ml">Total received from shops</div><div class="mv g">${fmt(received)}</div></div>
    <div class="met"><div class="ml">Outstanding (unpaid)</div><div class="mv a">${fmt(outstanding)}</div></div>
    <div class="met"><div class="ml">Paid to Turkey supplier</div><div class="mv r">${fmt(sent)}</div></div>`;

  const list = [...DB.payments].sort((a, b) => (b.date > a.date ? 1 : -1));

  if (!list.length) {
    document.getElementById('pay-list').innerHTML = '<div class="empty">No payment records yet</div>';
    return;
  }

  const rows = list.map(p => `
    <tr>
      <td>${p.date}</td>
      <td>${p.party}</td>
      <td><span class="tag ${p.type === 'received' ? 'tg' : 'tr'}">${p.type === 'received' ? 'Received' : 'Paid out'}</span></td>
      <td>${fmt(p.amt)}</td>
      <td>${p.method}</td>
      <td>${p.notes || '—'}</td>
      <td><button class="btn bsm" onclick="delPay('${p.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`).join('');

  document.getElementById('pay-list').innerHTML = `
    <table>
      <tr>
        <th style="width:11%">Date</th>
        <th style="width:20%">Party</th>
        <th style="width:13%">Type</th>
        <th style="width:11%">Amount</th>
        <th style="width:13%">Method</th>
        <th style="width:24%">Notes</th>
        <th style="width:8%"></th>
      </tr>
      ${rows}
    </table>`;
}

// =============================================
//  PRODUCTS
// =============================================
function fillProdForm(data) {
  document.getElementById('pr-id').value    = data?.id    || '';
  document.getElementById('pr-name').value  = data?.name  || '';
  document.getElementById('pr-buy').value   = data?.buy   || '';
  document.getElementById('pr-sell').value  = data?.sell  || '';
  document.getElementById('pr-stock').value = data?.stock || '';
  document.getElementById('pr-notes').value = data?.notes || '';
  document.getElementById('mProd-title').textContent = data ? 'Edit product' : 'Add product';
}

function saveProd() {
  const id  = document.getElementById('pr-id').value || uid();
  const obj = {
    id,
    name:  document.getElementById('pr-name').value.trim(),
    buy:   parseFloat(document.getElementById('pr-buy').value)   || 0,
    sell:  parseFloat(document.getElementById('pr-sell').value)  || 0,
    stock: parseInt(document.getElementById('pr-stock').value)   || 0,
    notes: document.getElementById('pr-notes').value.trim(),
  };
  if (!obj.name) { alert('Product name is required'); return; }
  const idx = DB.products.findIndex(p => p.id === id);
  if (idx >= 0) DB.products[idx] = obj; else DB.products.push(obj);
  saveDB('products');
  closeM('mProd');
  renderAll();
}

function delProd(id) {
  confirmDel('Delete this product?', () => {
    DB.products = DB.products.filter(p => p.id !== id);
    saveDB('products');
  });
}

function renderProducts() {
  if (!DB.products.length) {
    document.getElementById('prod-list').innerHTML = '<div class="empty">No products yet — add your first product above</div>';
    return;
  }

  const rows = DB.products.map(p => {
    const margin   = p.sell > 0 ? Math.round((p.sell - p.buy) / p.sell * 100) : 0;
    const editData = JSON.stringify(p).replace(/'/g, '&#39;');
    return `<tr>
      <td>${p.name}</td>
      <td>${fmt(p.buy)}</td>
      <td>${fmt(p.sell)}</td>
      <td>${fmt(p.sell - p.buy)}</td>
      <td>${marginTag(margin)}</td>
      <td>${p.stock} units</td>
      <td>${p.notes || '—'}</td>
      <td><div class="actions">
        <button class="btn bsm" onclick='openM("mProd",${editData})'><i class="ti ti-edit"></i></button>
        <button class="btn bsm" onclick="delProd('${p.id}')"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');

  document.getElementById('prod-list').innerHTML = `
    <table>
      <tr>
        <th style="width:22%">Product</th>
        <th style="width:11%">Buy price</th>
        <th style="width:11%">Sell price</th>
        <th style="width:11%">Profit/unit</th>
        <th style="width:10%">Margin</th>
        <th style="width:11%">Stock</th>
        <th style="width:16%">Notes</th>
        <th style="width:8%"></th>
      </tr>
      ${rows}
    </table>`;
}

// =============================================
//  PROFIT PAGE
// =============================================
function renderProfit() {
  const totalRevenue = DB.orders.reduce((a, o) => a + o.total, 0);
  const totalCost    = DB.orders.reduce((a, o) => a + (o.buyPrice || 0) * o.qty, 0);
  const totalProfit  = totalRevenue - totalCost;
  const sentToTurkey = DB.payments.filter(p => p.type === 'sent').reduce((a, p) => a + p.amt, 0);

  document.getElementById('profit-metrics').innerHTML = `
    <div class="met"><div class="ml">Total revenue (all time)</div><div class="mv g">${fmt(totalRevenue)}</div></div>
    <div class="met"><div class="ml">Total cost of goods</div><div class="mv a">${fmt(totalCost)}</div></div>
    <div class="met"><div class="ml">Gross profit</div><div class="mv g">${fmt(totalProfit)}</div></div>
    <div class="met"><div class="ml">Paid to Turkey supplier</div><div class="mv r">${fmt(sentToTurkey)}</div></div>`;

  // --- Per shop ---
  const byShop = DB.shops.map(s => {
    const orders = DB.orders.filter(o => o.shopId === s.id);
    const rev    = orders.reduce((a, o) => a + o.total, 0);
    const cost   = orders.reduce((a, o) => a + (o.buyPrice || 0) * o.qty, 0);
    const profit = rev - cost;
    const pct    = rev > 0 ? Math.round(profit / rev * 100) : 0;
    return { ...s, rev, cost, profit, pct, count: orders.length };
  }).sort((a, b) => b.profit - a.profit);

  document.getElementById('profit-shops').innerHTML = byShop.length
    ? `<table>
        <tr>
          <th style="width:25%">Shop</th>
          <th style="width:16%">Revenue</th>
          <th style="width:16%">Cost</th>
          <th style="width:16%">Profit</th>
          <th style="width:13%">Margin</th>
          <th style="width:14%">Orders</th>
        </tr>
        ${byShop.map(s => `<tr>
          <td>${s.name}</td>
          <td>${fmt(s.rev)}</td>
          <td>${fmt(s.cost)}</td>
          <td class="profit-val">${fmt(s.profit)}</td>
          <td>${marginTag(s.pct)}</td>
          <td>${s.count}</td>
        </tr>`).join('')}
      </table>`
    : '<div class="empty">No orders yet</div>';

  // --- Per product ---
  const byProd = DB.products.map(p => {
    const orders = DB.orders.filter(o => o.prodId === p.id);
    const sold   = orders.reduce((a, o) => a + o.qty, 0);
    const rev    = orders.reduce((a, o) => a + o.total, 0);
    const cost   = (p.buy || 0) * sold;
    const profit = rev - cost;
    return { ...p, sold, rev, cost, profit };
  }).sort((a, b) => b.profit - a.profit);

  document.getElementById('profit-products').innerHTML = byProd.length
    ? `<table>
        <tr>
          <th style="width:28%">Product</th>
          <th style="width:12%">Units sold</th>
          <th style="width:15%">Revenue</th>
          <th style="width:15%">Cost</th>
          <th style="width:15%">Profit</th>
          <th style="width:15%">Profit/unit</th>
        </tr>
        ${byProd.map(p => `<tr>
          <td>${p.name}</td>
          <td>${p.sold}</td>
          <td>${fmt(p.rev)}</td>
          <td>${fmt(p.cost)}</td>
          <td class="profit-val">${fmt(p.profit)}</td>
          <td class="profit-val">${fmt(p.sell - p.buy)}</td>
        </tr>`).join('')}
      </table>`
    : '<div class="empty">No products added yet</div>';
}

// =============================================
//  DASHBOARD
// =============================================
function renderDash() {
  const totalDebt = DB.shops.reduce((a, s) => {
    const paid = DB.payments.filter(p => p.shopId === s.id && p.type === 'received').reduce((x, p) => x + p.amt, 0);
    const owed = DB.orders.filter(o => o.shopId === s.id).reduce((x, o) => x + o.total, 0);
    return a + Math.max(0, owed - paid);
  }, 0);

  const monthStr   = today().slice(0, 7);
  const salesMonth = DB.orders.filter(o => o.date?.startsWith(monthStr)).reduce((a, o) => a + o.total, 0);
  const costMonth  = DB.orders.filter(o => o.date?.startsWith(monthStr)).reduce((a, o) => a + (o.buyPrice || 0) * o.qty, 0);

  document.getElementById('dash-metrics').innerHTML = `
    <div class="met"><div class="ml">Total shops</div><div class="mv">${DB.shops.length}</div></div>
    <div class="met"><div class="ml">Total shop debt</div><div class="mv a">${fmt(totalDebt)}</div></div>
    <div class="met"><div class="ml">Sales this month</div><div class="mv g">${fmt(salesMonth)}</div></div>
    <div class="met"><div class="ml">Profit this month</div><div class="mv g">${fmt(salesMonth - costMonth)}</div></div>`;

  // Shops to visit
  const toVisit = DB.shops
    .filter(s => daysSince(s.lastVisit) > 7)
    .sort((a, b) => daysSince(b.lastVisit) - daysSince(a.lastVisit))
    .slice(0, 6);

  document.getElementById('visit-table').innerHTML = toVisit.length
    ? `<table>
        <tr>
          <th style="width:35%">Shop</th>
          <th style="width:20%">City</th>
          <th style="width:25%">Last visit</th>
          <th style="width:20%">Status</th>
        </tr>
        ${toVisit.map(s => `<tr>
          <td>${s.name}</td>
          <td>${s.city}</td>
          <td>${daysSince(s.lastVisit)} days ago</td>
          <td>${urgencyTag(daysSince(s.lastVisit))}</td>
        </tr>`).join('')}
      </table>`
    : '<div class="empty">All shops visited recently</div>';

  // Recent orders
  const recent = [...DB.orders].sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 6);
  document.getElementById('recent-orders').innerHTML = recent.length
    ? `<table>
        <tr>
          <th style="width:25%">Shop</th>
          <th style="width:30%">Product</th>
          <th style="width:10%">Qty</th>
          <th style="width:18%">Total</th>
          <th style="width:17%">Status</th>
        </tr>
        ${recent.map(o => `<tr>
          <td>${shopName(o.shopId)}</td>
          <td>${o.prodName}</td>
          <td>${o.qty}</td>
          <td>${fmt(o.total)}</td>
          <td>${statusTag(o.status)}</td>
        </tr>`).join('')}
      </table>`
    : '<div class="empty">No orders yet</div>';
}

// =============================================
//  DELETE CONFIRMATION
// =============================================
function confirmDel(msg, fn) {
  document.getElementById('del-msg').textContent = msg;
  document.getElementById('del-confirm').onclick = () => {
    fn();
    closeM('mDel');
    renderAll();
  };
  document.getElementById('mDel').classList.add('open');
}

// =============================================
//  RENDER ALL
// =============================================
function renderAll() {
  renderDash();
  renderShops();
  renderOrders();
  renderPayments();
  renderProfit();
  renderProducts();
}

// =============================================
//  STARTUP
// =============================================
loadDB();
renderAll();
