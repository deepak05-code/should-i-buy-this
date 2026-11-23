let currentMode = 'salary';
let currentCardTheme = 'neon';
let latestData = null;

function switchMode(mode) {
    currentMode = mode;
    const tabSalary = document.getElementById('tabSalary');
    const tabWallet = document.getElementById('tabWallet');
    const salaryInputs = document.getElementById('salaryInputs');
    const walletInputs = document.getElementById('walletInputs');

    if (mode === 'salary') {
        tabSalary.className = "py-2.5 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition bg-indigo-600 text-white shadow-lg shadow-indigo-600/25";
        tabWallet.className = "py-2.5 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition text-slate-400 hover:text-white";
        salaryInputs.classList.remove('hidden');
        walletInputs.classList.add('hidden');
    } else {
        tabWallet.className = "py-2.5 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition bg-purple-600 text-white shadow-lg shadow-purple-600/25";
        tabSalary.className = "py-2.5 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition text-slate-400 hover:text-white";
        walletInputs.classList.remove('hidden');
        salaryInputs.classList.add('hidden');
    }
}

function syncSlider(val) {
    document.getElementById('income_slider').value = val;
    document.getElementById('incomeLabel').innerText = '₹' + Number(val).toLocaleString('en-IN');
}

function syncInput(val) {
    document.getElementById('monthly_income').value = val;
    document.getElementById('incomeLabel').innerText = '₹' + Number(val).toLocaleString('en-IN');
}

function syncWalletSlider(val) {
    document.getElementById('wallet_slider').value = val;
    document.getElementById('walletLabel').innerText = '₹' + Number(val).toLocaleString('en-IN');
}

function syncWalletInput(val) {
    document.getElementById('wallet_balance').value = val;
    document.getElementById('walletLabel').innerText = '₹' + Number(val).toLocaleString('en-IN');
}

function applyPreset(name, price) {
    document.getElementById('item_name').value = name;
    document.getElementById('item_price').value = price;
}

function handleFormSubmit(e) {
    e.preventDefault();
    fetchCalculation();
}

async function fetchCalculation() {
    const btn = document.getElementById('submitBtn');
    btn.innerText = "Calculating... ⏳";

    const payload = {
        mode: currentMode,
        item_name: document.getElementById('item_name').value,
        item_price: document.getElementById('item_price').value,
        monthly_income: document.getElementById('monthly_income').value,
        hours_per_day: document.getElementById('hours_per_day').value,
        days_per_week: document.getElementById('days_per_week').value,
        wallet_balance: document.getElementById('wallet_balance').value,
        daily_spend: document.getElementById('daily_spend').value
    };

    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        btn.innerText = "Give Me A Reality Check ⚡";

        if (data.error) return;
        latestData = data;

        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('resultsContainer').classList.remove('hidden');
        document.getElementById('decisionToast').className = 'hidden';

        renderUI(data);
        loadMyHistory();
    } catch (err) {
        btn.innerText = "Give Me A Reality Check ⚡";
        console.error("Error communicating with Flask:", err);
    }
}

async function loadMyHistory() {
  const container = document.getElementById("private-history");
  if (!container) return;

  try {
    const res = await fetch("/api/history/mine");
    if (!res.ok) return;
    const data = await res.json();

    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-indigo-400">
            💼 My Salary Mode History
          </h3>
          ${
            data.salary_history.length
              ? `<button onclick="clearHistory('salary')" class="text-xs font-bold text-rose-400 hover:text-rose-300 transition">Clear</button>`
              : ""
          }
        </div>
        ${
          data.salary_history.length
            ? `<div class="max-h-64 overflow-y-auto overflow-x-auto pr-1">
                <table class="w-full text-left text-xs">
                  <thead class="sticky top-0 bg-slate-900 z-10">
                    <tr class="border-b border-slate-800 text-slate-400">
                      <th class="py-2 pr-3">Item</th>
                      <th class="py-2 pr-3">Price</th>
                      <th class="py-2 pr-3">Income</th>
                      <th class="py-2 pr-3">Schedule</th>
                      <th class="py-2 pr-2 text-right">Date</th>
                      <th class="py-2 text-right">Clear</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/70">
                    ${data.salary_history
                      .map(
                        (r) => `
                      <tr>
                        <td class="py-2.5 pr-3 font-semibold text-white">${r.item_name}</td>
                        <td class="py-2.5 pr-3 text-slate-300">₹${r.item_price.toLocaleString("en-IN")}</td>
                        <td class="py-2.5 pr-3 text-indigo-300">₹${r.monthly_income.toLocaleString("en-IN")}</td>
                        <td class="py-2.5 pr-3 text-slate-400">${r.hours_per_day}h × ${r.days_per_week}d</td>
                        <td class="py-2.5 pr-2 text-right text-slate-500">${r.created_at}</td>
                        <td class="py-2.5 text-right">
                          <button onclick="deleteHistoryItem('salary', ${r.id})" class="text-slate-500 hover:text-rose-400 font-bold px-1">✕</button>
                        </td>
                      </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
            : `<p class="text-xs text-slate-500">No Salary Mode checks saved yet.</p>`
        }
      </div>

      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-amber-400">
            👛 My Wallet Mode History
          </h3>
          ${
            data.wallet_history.length
              ? `<button onclick="clearHistory('wallet')" class="text-xs font-bold text-rose-400 hover:text-rose-300 transition">Clear</button>`
              : ""
          }
        </div>
        ${
          data.wallet_history.length
            ? `<div class="max-h-64 overflow-y-auto overflow-x-auto pr-1">
                <table class="w-full text-left text-xs">
                  <thead class="sticky top-0 bg-slate-900 z-10">
                    <tr class="border-b border-slate-800 text-slate-400">
                      <th class="py-2 pr-3">Item</th>
                      <th class="py-2 pr-3">Price</th>
                      <th class="py-2 pr-3">Daily Spend</th>
                      <th class="py-2 pr-3">Balance</th>
                      <th class="py-2 pr-2 text-right">Date</th>
                      <th class="py-2 text-right">Clear</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/70">
                    ${data.wallet_history
                      .map(
                        (r) => `
                      <tr>
                        <td class="py-2.5 pr-3 font-semibold text-white">${r.item_name}</td>
                        <td class="py-2.5 pr-3 text-slate-300">₹${r.item_price.toLocaleString("en-IN")}</td>
                        <td class="py-2.5 pr-3 text-amber-300">₹${r.daily_spend.toLocaleString("en-IN")}</td>
                        <td class="py-2.5 pr-3 text-slate-300">₹${r.wallet_balance.toLocaleString("en-IN")}</td>
                        <td class="py-2.5 pr-2 text-right text-slate-500">${r.created_at}</td>
                        <td class="py-2.5 text-right">
                          <button onclick="deleteHistoryItem('wallet', ${r.id})" class="text-slate-500 hover:text-rose-400 font-bold px-1">✕</button>
                        </td>
                      </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
            : `<p class="text-xs text-slate-500">No Wallet Mode checks saved yet.</p>`
        }
      </div>
    `;
  } catch (err) {
    console.error("Failed to load history:", err);
  }
}


async function deleteHistoryItem(mode, id) {
  try {
    const res = await fetch(`/api/history/delete/${mode}/${id}`, { method: "DELETE" });
    if (res.ok) loadMyHistory();
  } catch (err) {
    console.error("Delete failed:", err);
  }
}

async function clearHistory(mode) {
  if (!confirm(`Clear all ${mode === "salary" ? "Salary" : "Wallet"} Mode history?`)) return;
  try {
    const res = await fetch(`/api/history/clear/${mode}`, { method: "DELETE" });
    if (res.ok) loadMyHistory();
  } catch (err) {
    console.error("Clear failed:", err);
  }
}

function renderUI(data) {
    document.getElementById('resItemName').innerText = data.item_name;
    document.getElementById('resItemPrice').innerText = data.item_price;
    document.getElementById('eqPriceLabel').innerText = data.item_price;
    document.getElementById('resSip').innerText = data.future_value_10yr;

    document.getElementById('topRightLabel').innerText = data.top_right_label;
    document.getElementById('topRightValue').innerText = data.top_right_value;

    document.getElementById('card1Emoji').innerText = data.card1.emoji;
    document.getElementById('card1Label').innerText = data.card1.label;
    document.getElementById('card1Value').innerText = data.card1.value;
    document.getElementById('card1Sub').innerText = data.card1.sub;

    document.getElementById('card2Emoji').innerText = data.card2.emoji;
    document.getElementById('card2Label').innerText = data.card2.label;
    document.getElementById('card2Value').innerText = data.card2.value;
    document.getElementById('card2Sub').innerText = data.card2.sub;

    document.getElementById('drainBarTitle').innerText = data.drain_title;
    document.getElementById('drainBarPct').innerText = data.drain_label;
    document.getElementById('drainBar').style.width = Math.min(data.raw_percentage, 100) + '%';

    document.getElementById('verdictTitle').innerText = data.verdict.title;
    document.getElementById('verdictRoast').innerText = data.verdict.roast;

    const badge = document.getElementById('verdictBadge');
    const card = document.getElementById('verdictCard');
    badge.innerText = data.verdict.badge;

    const colorStyles = {
        emerald: {
            card: "glass border-2 border-emerald-500/40 rounded-3xl p-6 md:p-7 shadow-2xl transition-all duration-300",
            badge: "inline-block px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2"
        },
        amber: {
            card: "glass border-2 border-amber-500/40 rounded-3xl p-6 md:p-7 shadow-2xl transition-all duration-300",
            badge: "inline-block px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2"
        },
        orange: {
            card: "glass border-2 border-orange-500/40 rounded-3xl p-6 md:p-7 shadow-2xl transition-all duration-300",
            badge: "inline-block px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30 mb-2"
        },
        rose: {
            card: "glass border-2 border-rose-500/50 rounded-3xl p-6 md:p-7 shadow-2xl transition-all duration-300",
            badge: "inline-block px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2"
        }
    };

    const style = colorStyles[data.verdict.color] || colorStyles.amber;
    card.className = style.card;
    badge.className = style.badge;

    const grid = document.getElementById('equivalentsGrid');
    grid.innerHTML = data.comparisons.map(comp => `
        <div class="bg-slate-950/70 hover:bg-slate-900 border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center gap-3.5 transition group">
            <div class="text-3xl bg-slate-900 p-3 rounded-xl border border-slate-800 group-hover:scale-110 transition">
                ${comp.emoji}
            </div>
            <div>
                <p class="text-xl font-extrabold text-white">${comp.qty}</p>
                <p class="text-xs text-slate-400 font-medium leading-snug">${comp.name}</p>
            </div>
        </div>
    `).join('');
}

function openRoastModal() {
    if (!latestData) return;
    renderRoastCardTheme();
    document.getElementById('roastModal').classList.remove('hidden');
}

function closeRoastModal() {
    document.getElementById('roastModal').classList.add('hidden');
}

function setCardTheme(theme) {
    currentCardTheme = theme;
    const btnNeon = document.getElementById('themeBtnNeon');
    const btnReceipt = document.getElementById('themeBtnReceipt');
    const btnGold = document.getElementById('themeBtnGold');

    const inactive = "py-2.5 px-2 rounded-xl text-xs font-extrabold transition text-slate-400 hover:text-white";
    btnNeon.className = theme === 'neon' ? "py-2.5 px-2 rounded-xl text-xs font-extrabold transition bg-indigo-600 text-white shadow" : inactive;
    btnReceipt.className = theme === 'receipt' ? "py-2.5 px-2 rounded-xl text-xs font-extrabold transition bg-slate-200 text-slate-950 shadow" : inactive;
    btnGold.className = theme === 'gold' ? "py-2.5 px-2 rounded-xl text-xs font-extrabold transition bg-amber-500 text-slate-950 shadow" : inactive;

    renderRoastCardTheme();
}

function renderRoastCardTheme() {
    if (!latestData) return;
    const canvasEl = document.getElementById('roastCardCanvas');
    const top3 = latestData.comparisons.slice(0, 3);

    if (currentCardTheme === 'receipt') {
        canvasEl.className = "w-full bg-[#faf8f5] text-slate-900 border-2 border-slate-300 rounded-[20px] p-5 sm:p-6 relative overflow-hidden shadow-2xl text-left font-receipt shrink-0";
        canvasEl.innerHTML = `
            <div class="text-center border-b-2 border-dashed border-slate-400 pb-4 mb-4">
                <p class="text-xs font-extrabold uppercase tracking-widest text-slate-500">*** CUSTOMER COPY ***</p>
                <h3 class="text-xl font-extrabold tracking-tight text-slate-950 mt-1">IMPULSE REALITY RECEIPT</h3>
                <p class="text-[11px] text-slate-500 mt-0.5">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • STATUS: ${latestData.verdict.badge}</p>
            </div>
            <div class="flex justify-between items-baseline border-b border-dashed border-slate-400 pb-3 mb-3">
                <div>
                    <p class="text-[10px] uppercase text-slate-500 font-bold">ITEM TEMPTATION</p>
                    <p class="text-lg font-extrabold text-slate-950">${latestData.item_name}</p>
                </div>
                <p class="text-2xl font-extrabold text-slate-950">₹${latestData.item_price}</p>
            </div>
            <div class="grid grid-cols-2 gap-2.5 border-b border-dashed border-slate-400 pb-3 mb-3">
                <div class="bg-slate-200/70 rounded-xl p-2.5">
                    <p class="text-[10px] font-bold uppercase text-slate-600">${latestData.card1.emoji} ${latestData.card1.label}</p>
                    <p class="text-base font-extrabold text-slate-950 mt-0.5">${latestData.card1.value}</p>
                </div>
                <div class="bg-slate-200/70 rounded-xl p-2.5">
                    <p class="text-[10px] font-bold uppercase text-slate-600">${latestData.card2.emoji} ${latestData.card2.label}</p>
                    <p class="text-base font-extrabold text-slate-950 mt-0.5">${latestData.card2.value}</p>
                </div>
            </div>
            <div class="mb-3 border-b border-dashed border-slate-400 pb-3">
                <p class="text-[10px] font-extrabold uppercase text-slate-500 mb-2">EQUIVALENT EXCHANGE UNITS:</p>
                <div class="space-y-1.5">
                    ${top3.map(c => `
                        <div class="flex justify-between text-xs font-bold text-slate-800">
                            <span>${c.emoji} ${c.name}</span>
                            <span class="font-extrabold text-slate-950">x ${c.qty}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="bg-slate-900 text-[#faf8f5] rounded-xl p-3.5 mb-4">
                <p class="text-xs font-extrabold uppercase mb-1">VERDICT: ${latestData.verdict.title}</p>
                <p class="text-[11px] text-slate-300 leading-relaxed">"${latestData.verdict.roast}"</p>
            </div>
            <div class="flex items-center justify-between text-[11px] pt-1">
                <div>
                    <span class="text-slate-500 block text-[10px] font-bold">10-YR SIP LOSS</span>
                    <span class="font-extrabold text-slate-950 text-sm">₹${latestData.future_value_10yr}</span>
                </div>
                <div class="text-right">
                    <span class="font-extrabold tracking-widest text-slate-900 block text-xs">||| |||| || ||||| ||||</span>
                    <span class="text-[9px] text-slate-500 uppercase">THANK YOU FOR NOT GOING BROKE</span>
                </div>
            </div>
        `;
        return;
    }

    if (currentCardTheme === 'gold') {
        canvasEl.className = "w-full bg-[#090806] border-2 border-amber-500/60 rounded-[28px] p-5 sm:p-6 relative overflow-hidden shadow-2xl text-left shrink-0";
        canvasEl.innerHTML = `
            <div class="flex items-center justify-between border-b border-amber-500/20 pb-3.5 mb-4">
                <div class="flex items-center gap-2">
                    <span class="text-xl">👑</span>
                    <div>
                        <p class="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">VIP Wealth Audit</p>
                        <p class="text-xs font-bold text-amber-100">Should I Buy This?</p>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ${latestData.verdict.badge}
                </span>
            </div>
            <div class="mb-4">
                <p class="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold">Luxury Temptation</p>
                <h3 class="text-2xl font-extrabold text-white leading-tight mt-0.5">${latestData.item_name}</h3>
                <p class="text-3xl font-extrabold text-amber-400 mt-1">₹${latestData.item_price}</p>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-[#14110b] border border-amber-500/25 rounded-2xl p-3.5">
                    <div class="flex items-center gap-1.5 text-amber-400/80 text-[10px] font-bold uppercase">
                        <span>${latestData.card1.emoji}</span>
                        <span>${latestData.card1.label}</span>
                    </div>
                    <p class="text-xl font-extrabold text-white mt-1">${latestData.card1.value}</p>
                </div>
                <div class="bg-[#14110b] border border-amber-500/25 rounded-2xl p-3.5">
                    <div class="flex items-center gap-1.5 text-amber-400/80 text-[10px] font-bold uppercase">
                        <span>${latestData.card2.emoji}</span>
                        <span>${latestData.card2.label}</span>
                    </div>
                    <p class="text-xl font-extrabold text-amber-400 mt-1">${latestData.card2.value}</p>
                </div>
            </div>
            <div class="bg-[#14110b] border-l-4 border-amber-400 rounded-r-2xl p-3.5 mb-4">
                <p class="text-xs font-extrabold text-amber-200 mb-1">${latestData.verdict.title}</p>
                <p class="text-[11px] text-slate-300 leading-relaxed italic">"${latestData.verdict.roast}"</p>
            </div>
            <div class="mb-4">
                <p class="text-[10px] font-extrabold uppercase tracking-wider text-amber-500/80 mb-2">🥂 Real Cost in Everyday Units:</p>
                <div class="space-y-2">
                    ${top3.map(c => `
                        <div class="bg-[#14110b] border border-amber-500/20 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                            <div class="flex items-center gap-2.5">
                                <span class="text-xl">${c.emoji}</span>
                                <span class="text-xs font-semibold text-amber-100">${c.name}</span>
                            </div>
                            <span class="text-sm font-extrabold text-amber-400">${c.qty}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="pt-3 border-t border-dashed border-amber-500/30 flex items-center justify-between text-[11px]">
                <div>
                    <span class="text-amber-500/70 block text-[10px]">📈 10-Yr Compounded Wealth</span>
                    <span class="font-extrabold text-emerald-400 text-sm">₹${latestData.future_value_10yr}</span>
                </div>
                <div class="text-right">
                    <span class="font-mono text-[10px] text-amber-500/60 block">|||| |||| || ||||| |||</span>
                    <span class="text-[9px] text-amber-500/60 uppercase tracking-widest">Gold Reality Edition</span>
                </div>
            </div>
        `;
        return;
    }

    canvasEl.className = "w-full bg-[#070b18] border-2 border-indigo-500/40 rounded-[28px] p-5 sm:p-6 relative overflow-hidden shadow-2xl text-left shrink-0";
    canvasEl.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-800/90 pb-3.5 mb-4">
            <div class="flex items-center gap-2">
                <span class="text-xl">🛒</span>
                <div>
                    <p class="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">Impulse Reality Check</p>
                    <p class="text-xs font-bold text-slate-300">Should I Buy This?</p>
                </div>
            </div>
            <span class="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                ${latestData.verdict.badge}
            </span>
        </div>
        <div class="mb-4">
            <p class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Temptation Item</p>
            <h3 class="text-2xl font-extrabold text-white leading-tight mt-0.5">${latestData.item_name}</h3>
            <p class="text-3xl font-extrabold text-indigo-400 mt-1">₹${latestData.item_price}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-[#0d1326] border border-slate-800 rounded-2xl p-3.5">
                <div class="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                    <span>${latestData.card1.emoji}</span>
                    <span>${latestData.card1.label}</span>
                </div>
                <p class="text-xl font-extrabold text-white mt-1">${latestData.card1.value}</p>
            </div>
            <div class="bg-[#0d1326] border border-slate-800 rounded-2xl p-3.5">
                <div class="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                    <span>${latestData.card2.emoji}</span>
                    <span>${latestData.card2.label}</span>
                </div>
                <p class="text-xl font-extrabold text-indigo-400 mt-1">${latestData.card2.value}</p>
            </div>
        </div>
        <div class="bg-[#0c1222] border-l-4 border-pink-500 rounded-r-2xl p-3.5 mb-4">
            <p class="text-xs font-extrabold text-white mb-1">${latestData.verdict.title}</p>
            <p class="text-[11px] text-slate-300 leading-relaxed italic">"${latestData.verdict.roast}"</p>
        </div>
        <div class="mb-4">
            <p class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">🤯 Real Cost in Everyday Units:</p>
            <div class="space-y-2">
                ${top3.map(c => `
                    <div class="bg-[#0d1326] border border-slate-800/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                            <span class="text-xl">${c.emoji}</span>
                            <span class="text-xs font-semibold text-slate-300">${c.name}</span>
                        </div>
                        <span class="text-sm font-extrabold text-white">${c.qty}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="pt-3 border-t border-dashed border-slate-800 flex items-center justify-between text-[11px]">
            <div>
                <span class="text-slate-400 block text-[10px]">📈 10-Yr SIP Opportunity Cost</span>
                <span class="font-extrabold text-emerald-400 text-sm">₹${latestData.future_value_10yr}</span>
            </div>
            <div class="text-right">
                <span class="font-mono text-[10px] text-slate-500 block">|||| |||| || ||||| |||</span>
                <span class="text-[9px] text-slate-500 uppercase tracking-widest">Certified Reality Check</span>
            </div>
        </div>
    `;
}

async function generateCardCanvas() {
    const cardElement = document.getElementById('roastCardCanvas');
    const bgColors = {
        neon: "#070b18",
        receipt: "#faf8f5",
        gold: "#090806"
    };
    return await html2canvas(cardElement, {
        scale: 2,
        backgroundColor: bgColors[currentCardTheme] || "#070b18",
        useCORS: true
    });
}

async function downloadRoastPNG() {
    const btn = document.getElementById('downloadPngBtn');
    btn.innerText = "⏳ Rendering PNG...";
    try {
        const canvas = await generateCardCanvas();
        const link = document.createElement('a');
        const safeName = (latestData.item_name || 'impulse').toLowerCase().replace(/[^a-z0-9]/g, '-');
        link.download = `reality-check-${currentCardTheme}-${safeName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        btn.innerText = "✅ Downloaded!";
        setTimeout(() => { btn.innerText = "⬇️ Download PNG"; }, 2000);
    } catch (e) {
        console.error("PNG generation error:", e);
        btn.innerText = "⬇️ Download PNG";
    }
}

async function shareRoastPNG() {
    const btn = document.getElementById('nativeShareBtn');
    btn.innerText = "⏳ Preparing...";
    try {
        const canvas = await generateCardCanvas();
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `impulse-roast-${currentCardTheme}.png`, { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: "Should I Buy This? Reality Check",
                    text: `Buying ${latestData.item_name} (₹${latestData.item_price}) costs me ${latestData.card1.value}! 💀`,
                    files: [file]
                });
                btn.innerText = "📲 Share to App";
            } else {
                await downloadRoastPNG();
                btn.innerText = "📲 Downloaded (Share Ready)";
                setTimeout(() => { btn.innerText = "📲 Share to App"; }, 2500);
            }
        }, "image/png");
    } catch (e) {
        btn.innerText = "📲 Share to App";
    }
}

function copyRoast() {
    if (!latestData) return;
    const c = latestData.comparisons[0];
    const text = `🛒 Impulse Reality Check: Buying "${latestData.item_name}" (₹${latestData.item_price}) costs me ${latestData.card1.value} (${latestData.card2.value}) or ${c.qty} ${c.name}! 💀`;
    navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyBtn');
    btn.innerText = '✅ Copied!';
    setTimeout(() => { btn.innerText = '📋 Copy Text'; }, 2000);
}

async function showSavedToast() {
    const toast = document.getElementById('decisionToast');
    toast.className = "block text-center text-sm font-bold py-3.5 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300";
    toast.innerText = `🎉 Huge W! You just protected ₹${latestData.item_price} (${latestData.card1.value}). Future you is proud!`;

    if (typeof confetti === "function") {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => {
            confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
        }, 150);
    }

    // Save to user account if logged in
    try {
        const res = await fetch('/api/save_money', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: latestData.raw_price })
        });
        const data = await res.json();
        if (data.logged_in) {
            const navCounter = document.getElementById('navTotalSaved');
            if (navCounter) navCounter.innerText = data.total_saved;
        }
    } catch (e) {
        console.error("Could not update saved counter:", e);
    }
}

function showYoloToast() {
    const toast = document.getElementById('decisionToast');
    toast.className = "block text-center text-sm font-bold py-3.5 px-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300";
    toast.innerText = `💀 Enjoy your ${latestData.item_name}! Just remember it cost you ${latestData.comparisons[0].qty} ${latestData.comparisons[0].name}.`;
}
