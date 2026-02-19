(function(){
  const API = 'http://localhost:9001';
  const MAX_ITEMS = 5;

  /* --- util --- */
  function escapeHtml(s){
    if(!s) return '';
    return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
  }

  function parseAmount(str){
    if (!str && str !== 0) return NaN;
    let s = String(str).trim();
    s = s.replace(/\s/g,'');
    // If string contains both . and , assume . = thousands, , = decimal
    const hasDot = s.indexOf('.') !== -1;
    const hasComma = s.indexOf(',') !== -1;
    if (hasDot && hasComma) {
      s = s.replace(/\./g,'').replace(/,/g,'.');
    } else if (!hasDot && hasComma) {
      s = s.replace(/,/g,'.');
    } else {
      s = s.replace(/,/g,'');
    }
    // Remove any non-digit/.- characters
    s = s.replace(/[^0-9.\-]/g,'');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function formatCurrency(value){
    if (typeof value !== 'number' || Number.isNaN(value)) return String(value || '—');
    try{
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
    }catch(e){
      // fallback simple
      return `${value.toFixed(2)} ARS`;
    }
  }

  /* --- DOM rendering --- */
  function setBalance(balance){
    const el = document.getElementById('balance-amount');
    if (!balance || typeof balance.available !== 'number') {
      el.textContent = '—';
      return;
    }
    el.textContent = formatCurrency(balance.available);
  }

  function renderTransactions(list){
    const ul = document.getElementById('tx-list');
    ul.innerHTML = '';
    list.slice(0, MAX_ITEMS).forEach(tx => {
      const li = document.createElement('li');
      li.className = 'tx-item';

      const desc = escapeHtml(tx.raw || tx.type || 'Movimiento');
      const amtNum = parseAmount(tx.amount);
      const sign = (amtNum > 0) ? '+' : (amtNum < 0 ? '-' : '');
      const amtDisplay = isNaN(amtNum) ? escapeHtml(tx.amount || '') : `${sign}${formatCurrency(Math.abs(amtNum))}`;

      li.innerHTML = `
        <div class="tx-desc">${desc}</div>
        <div class="tx-meta">
          <div class="tx-amount">${amtDisplay}</div>
          <div class="tx-date small">${escapeHtml(tx.dateTime || '')}</div>
        </div>
      `;

      ul.appendChild(li);
    });
  }

  function addTransactionToTop(tx){
    const ul = document.getElementById('tx-list');
    const li = document.createElement('li');
    li.className = 'tx-item';
    const desc = escapeHtml(tx.raw || tx.type || 'Movimiento');
    const amtNum = parseAmount(tx.amount);
    const sign = (amtNum > 0) ? '+' : (amtNum < 0 ? '-' : '');
    const amtDisplay = isNaN(amtNum) ? escapeHtml(tx.amount || '') : `${sign}${formatCurrency(Math.abs(amtNum))}`;

    li.innerHTML = `
      <div class="tx-desc">${desc}</div>
      <div class="tx-meta">
        <div class="tx-amount">${amtDisplay}</div>
        <div class="tx-date small">${escapeHtml(tx.dateTime || '')}</div>
      </div>
    `;

    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > MAX_ITEMS) ul.removeChild(ul.lastChild);
  }

  /* --- banner --- */
  let bannerTimer = null;
  function showBanner(msg){
    const b = document.getElementById('banner');
    b.textContent = msg;
    b.classList.remove('hidden');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(()=> b.classList.add('hidden'), 6000);
  }

  /* --- data fetching --- */
  async function fetchBalance(fresh = false){
    try{
      const res = await fetch(`${API}/api/balance?fresh=${fresh}`);
      const json = await res.json();
      if (json && json.success && json.data) {
        setBalance(json.data);
        return json.data;
      }
      if (json && json.success && !json.data) {
        // older responses may return object directly
        setBalance(json);
        return json;
      }
      // fallback: if api returns data at top-level
      if (json && json.available !== undefined) {
        setBalance(json);
        return json;
      }
      setBalance(null);
      return null;
    }catch(err){
      console.error('fetchBalance error', err);
      setBalance(null);
      return null;
    }
  }

  async function fetchTransactions(fresh = false){
    try{
      const res = await fetch(`${API}/api/activity?fresh=${fresh}&limit=${MAX_ITEMS}`);
      const json = await res.json();
      if (json && json.success && json.data && Array.isArray(json.data.transactions)){
        renderTransactions(json.data.transactions);
        return json.data.transactions;
      }
      if (json && json.transactions) { renderTransactions(json.transactions); return json.transactions; }
      renderTransactions([]);
      return [];
    }catch(err){
      console.error('fetchTransactions error', err);
      renderTransactions([]);
      return [];
    }
  }

  /* --- SSE / realtime --- */
  function initSSE(){
    const statusEl = document.getElementById('status');
    try{
      const es = new EventSource(`${API}/api/activity/watch`);
      es.onopen = () => { statusEl.textContent = 'watch: conectado'; };
      es.onmessage = (ev) => {
        try{
          const msg = JSON.parse(ev.data);
          if (msg && msg.type === 'new_transaction' && msg.transaction){
            const tx = msg.transaction;
            addTransactionToTop(tx);
            const amt = parseAmount(tx.amount);
            if (!isNaN(amt) && amt > 0) {
              showBanner(`✨ Nuevo ingreso: ${formatCurrency(amt)}`);
            }
          }
          if (msg && msg.type === 'connected') {
            statusEl.textContent = 'watch: conectado';
          }
        }catch(e){ console.warn('SSE parse error', e); }
      };
      es.onerror = () => {
        statusEl.textContent = 'watch: desconectado — reintentando...';
        es.close();
        setTimeout(initSSE, 3000);
      };
    }catch(err){
      console.warn('SSE not available', err);
      document.getElementById('status').textContent = 'watch: no disponible';
    }
  }

  /* --- init --- */
  async function init(){
    document.getElementById('refresh-btn').addEventListener('click', async () => {
      document.getElementById('status').textContent = 'actualizando...';
      await Promise.all([fetchBalance(true), fetchTransactions(true)]);
      document.getElementById('status').textContent = 'actualizado';
      setTimeout(()=> document.getElementById('status').textContent = '');
    });

    await Promise.all([fetchBalance(false), fetchTransactions(false)]);
    initSSE();
  }

  window.addEventListener('load', init);
})();