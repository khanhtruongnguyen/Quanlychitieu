/**
 * Giao diện và tương tác ứng dụng QLCT Sinh Viên
 * Hỗ trợ: Chi tiêu (-), Nhận tiền (+), Heo đất tiết kiệm (Savings) và Đồng bộ Gist
 */

const EXPENSE_CATEGORIES = {
  food: { name: 'Cơm / Đồ ăn', icon: '🍚' },
  drink: { name: 'Trà sữa / Cafe', icon: '🧋' },
  fuel: { name: 'Xăng / Xe cộ', icon: '⛽' },
  groceries: { name: 'Tạp hóa / Đồ dùng', icon: '🛒' },
  shopping: { name: 'Mua sắm / Shopee', icon: '🛍️' },
  study: { name: 'Sách vở / Học tập', icon: '📚' },
  social: { name: 'Bạn bè / Đi chơi', icon: '🎮' },
  other: { name: 'Chi tiêu khác', icon: '📦' }
};

const INCOME_CATEGORIES = {
  allowance: { name: 'Bố mẹ gửi', icon: '👨‍👩‍👧' },
  salary: { name: 'Làm thêm / Lương', icon: '💼' },
  gift: { name: 'Quà / Thưởng', icon: '🎁' },
  debt_repay: { name: 'Được trả nợ', icon: '🤝' },
  other_inc: { name: 'Thu nhập khác', icon: '💵' }
};

let currentTxType = 'expense'; // 'expense' | 'income'
let selectedWallet = 'qr';      // 'qr' | 'cash'
let selectedCategory = 'food';
let currentTab = 'home';
let activeSavingsAction = null; // { mode: 'deposit'|'withdraw', goalId: string }

function formatVND(amount) {
  if (isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupQuickEntry();
  setupSavingsInteractions();
  setupSettingsAndGist();

  store.subscribe(renderAll);

  if (store.authConfig.githubToken && store.authConfig.gistId) {
    store.pullFromGist().catch(err => {
      console.warn('Lần đầu khởi động, không tải được Gist:', err.message);
    });
  }
});

/**
 * Điều hướng giữa các Tabs (Hôm nay, Tiết kiệm, Thống kê, Cài đặt)
 */
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-item');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  document.getElementById('sync-pill').addEventListener('click', () => {
    switchTab('settings');
  });
}

function switchTab(tabName) {
  currentTab = tabName;

  document.querySelectorAll('.tab-page').forEach(page => {
    page.style.display = 'none';
  });
  const targetPage = document.getElementById(`tab-${tabName}`);
  if (targetPage) targetPage.style.display = 'flex';

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  renderAll();
}

/**
 * Thiết lập Hộp Nhập Nhanh (Chi tiêu hoặc Nhận tiền)
 */
function setupQuickEntry() {
  // Chuyển đổi giữa [Chi Tiêu (-)] và [Nhận Tiền (+)]
  const typeBtns = document.querySelectorAll('.type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTxType = btn.getAttribute('data-type');
      updateQuickEntryUI();
    });
  });

  // Chọn ví QR hay Tiền mặt
  const walletBtns = document.querySelectorAll('.wallet-btn');
  walletBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      walletBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedWallet = btn.getAttribute('data-wallet');
    });
  });

  // Xử lý gửi giao dịch
  document.getElementById('btn-submit-tx').addEventListener('click', submitTransaction);
  document.getElementById('amount-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitTransaction();
  });

  updateQuickEntryUI();
}

function updateQuickEntryUI() {
  const isIncome = currentTxType === 'income';
  const submitBtn = document.getElementById('btn-submit-tx');
  const amountInput = document.getElementById('amount-input');

  if (isIncome) {
    submitBtn.className = 'btn-submit-tx income-mode';
    submitBtn.innerHTML = '<span>+</span> Cộng Tiền Vào Ví';
    amountInput.placeholder = '0 (ví dụ: 500 = 500k)';
    selectedCategory = 'allowance';
  } else {
    submitBtn.className = 'btn-submit-tx expense-mode';
    submitBtn.innerHTML = '<span>-</span> Ghi Khoản Chi';
    amountInput.placeholder = '0 (ví dụ: 25 = 25k)';
    selectedCategory = 'food';
  }

  // Render danh mục tương ứng
  const catDict = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const catGrid = document.getElementById('category-grid');
  catGrid.innerHTML = '';
  Object.keys(catDict).forEach(key => {
    const item = catDict[key];
    const catBtn = document.createElement('button');
    catBtn.type = 'button';
    catBtn.className = `cat-btn ${key === selectedCategory ? 'selected' : ''}`;
    catBtn.innerHTML = `
      <span class="icon">${item.icon}</span>
      <span class="name">${item.name}</span>
    `;
    catBtn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      catBtn.classList.add('selected');
      selectedCategory = key;
    });
    catGrid.appendChild(catBtn);
  });

  // Render chip gợi ý số tiền nhanh
  const chipContainer = document.getElementById('quick-chips');
  const chipValues = isIncome ? [100, 200, 500, 1000, 2000, 3000] : [15, 20, 25, 30, 40, 50, 70, 100];
  chipContainer.innerHTML = '';
  chipValues.forEach(val => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip-btn';
    chip.innerText = val >= 1000 ? `+${val / 1000}tr` : `+${val}k`;
    chip.addEventListener('click', () => {
      const input = document.getElementById('amount-input');
      const current = Number(input.value) || 0;
      input.value = current + (val * 1000);
      input.focus();
    });
    chipContainer.appendChild(chip);
  });
}

function submitTransaction() {
  const amountInput = document.getElementById('amount-input');
  const noteInput = document.getElementById('note-input');

  let raw = amountInput.value.trim().toLowerCase().replace(/[,.]/g, '');
  if (!raw) {
    showToast('Vui lòng nhập số tiền');
    amountInput.focus();
    return;
  }

  let num = 0;
  if (raw.endsWith('k')) {
    num = parseFloat(raw.replace('k', '')) * 1000;
  } else if (raw.endsWith('tr')) {
    num = parseFloat(raw.replace('tr', '')) * 1000000;
  } else {
    num = parseFloat(raw);
    // Nếu gõ số nhỏ dưới 1000 thì tự động hiểu là đơn vị nghìn (k)
    if (num < 1000 && num > 0) {
      num = num * 1000;
    }
  }

  if (isNaN(num) || num <= 0) {
    showToast('Số tiền không hợp lệ');
    return;
  }

  store.addTransaction({
    amount: num,
    wallet: selectedWallet,
    category: selectedCategory,
    note: noteInput.value,
    type: currentTxType
  });

  amountInput.value = '';
  noteInput.value = '';

  const walletLabel = selectedWallet === 'qr' ? '📱 QR/Bank' : '💵 Tiền mặt';
  if (currentTxType === 'income') {
    showToast(`Đã nhận +${formatVND(num)} vào ${walletLabel}!`);
  } else {
    showToast(`Đã trừ -${formatVND(num)} từ ${walletLabel}`);
  }
}

/**
 * Render toàn bộ UI
 */
function renderAll() {
  renderSyncStatus();

  if (currentTab === 'home') {
    renderHomeMetrics();
    renderRecentTransactions();
  } else if (currentTab === 'savings') {
    renderSavingsTab();
  } else if (currentTab === 'stats') {
    renderStatsTab();
  } else if (currentTab === 'settings') {
    renderSettingsValues();
  }
}

function renderSyncStatus() {
  const pill = document.getElementById('sync-pill');
  const text = document.getElementById('sync-text');
  pill.className = `sync-pill ${store.syncStatus}`;
  text.innerText = store.syncMessage;
}

/**
 * Render Màn hình Trang Chủ
 */
function renderHomeMetrics() {
  const s = store.getFinancialSummary();

  const spendableEl = document.getElementById('home-spendable-amount');
  const spentTodayEl = document.getElementById('spent-today-val');
  const totalSavedEl = document.getElementById('home-saved-val');

  spendableEl.innerHTML = `${new Intl.NumberFormat('vi-VN').format(s.totalSpendable)} <span class="currency">₫</span>`;
  spendableEl.style.color = s.totalSpendable < 50000 ? '#f87171' : '#34d399';

  spentTodayEl.innerText = formatVND(s.spentToday);
  totalSavedEl.innerText = formatVND(s.totalSavings);

  document.getElementById('wallet-qr-balance').innerText = formatVND(s.balanceQR);
  document.getElementById('wallet-cash-balance').innerText = formatVND(s.balanceCash);
}

function renderRecentTransactions() {
  const container = document.getElementById('recent-tx-list');
  const transactions = store.data.transactions.slice(0, 10);

  if (transactions.length === 0) {
    container.innerHTML = '<div class="empty-state">Chưa có giao dịch nào. Bấm nhập số tiền bên trên để bắt đầu!</div>';
    return;
  }

  container.innerHTML = transactions.map(tx => {
    let cat = { name: 'Khác', icon: '📦' };
    let sign = '-';
    let typeClass = 'expense';

    if (tx.type === 'income') {
      cat = INCOME_CATEGORIES[tx.category] || { name: 'Nhận tiền', icon: '💰' };
      sign = '+';
      typeClass = 'income';
    } else if (tx.type === 'saving_deposit') {
      cat = { name: 'Bỏ Heo Tiết Kiệm', icon: '🐷' };
      sign = '→';
      typeClass = 'saving';
    } else if (tx.type === 'saving_withdraw') {
      cat = { name: 'Rút Tiền Heo Đất', icon: '🪙' };
      sign = '←';
      typeClass = 'saving';
    } else {
      cat = EXPENSE_CATEGORIES[tx.category] || { name: 'Chi tiêu', icon: '💸' };
    }

    const walletLabel = tx.wallet === 'qr' ? 'QR/Bank' : 'Tiền mặt';
    const walletClass = tx.wallet === 'qr' ? 'qr' : 'cash';

    return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon-box">${cat.icon}</div>
          <div class="tx-meta">
            <span class="tx-category">${cat.name}</span>
            <div class="tx-subinfo">
              <span class="wallet-tag ${walletClass}">${walletLabel}</span>
              <span>${tx.time || ''} ${tx.note ? '• ' + escapeHtml(tx.note) : ''}</span>
            </div>
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${typeClass}">${sign}${formatVND(tx.amount)}</span>
          <button class="btn-del-tx" onclick="handleDeleteTx('${tx.id}')" title="Xóa">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

window.handleDeleteTx = function(id) {
  if (confirm('Xóa giao dịch này?')) {
    store.deleteTransaction(id);
    showToast('Đã xóa giao dịch');
  }
};

/**
 * ================= MÀN HÌNH TIẾT KIỆM (SAVINGS / HEO ĐẤT) =================
 */
function setupSavingsInteractions() {
  // Nút mở modal tạo hũ mới
  document.getElementById('btn-open-create-goal').addEventListener('click', () => {
    document.getElementById('modal-create-goal').style.display = 'flex';
  });

  document.getElementById('btn-cancel-create-goal').addEventListener('click', () => {
    document.getElementById('modal-create-goal').style.display = 'none';
  });

  document.getElementById('btn-confirm-create-goal').addEventListener('click', () => {
    const name = document.getElementById('input-goal-name').value.trim();
    const icon = document.getElementById('input-goal-icon').value.trim() || '🐷';
    const target = Number(document.getElementById('input-goal-target').value) || 0;

    if (!name) {
      alert('Vui lòng nhập tên khoản tiết kiệm!');
      return;
    }

    store.createSavingsGoal({ name, icon, targetAmount: target });
    document.getElementById('modal-create-goal').style.display = 'none';
    document.getElementById('input-goal-name').value = '';
    document.getElementById('input-goal-target').value = '';
    showToast(`Đã tạo hũ "${name}"`);
  });

  // Modal Nạp / Rút heo
  document.getElementById('btn-cancel-saving-op').addEventListener('click', () => {
    document.getElementById('modal-saving-op').style.display = 'none';
    activeSavingsAction = null;
  });

  document.getElementById('btn-confirm-saving-op').addEventListener('click', () => {
    if (!activeSavingsAction) return;
    const amount = Number(document.getElementById('input-saving-op-amount').value);
    const wallet = document.getElementById('select-saving-op-wallet').value;

    if (isNaN(amount) || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      if (activeSavingsAction.mode === 'deposit') {
        store.depositToSavings(activeSavingsAction.goalId, amount, wallet);
        showToast(`Đã bỏ heo +${formatVND(amount)}!`);
      } else {
        store.withdrawFromSavings(activeSavingsAction.goalId, amount, wallet);
        showToast(`Đã rút ${formatVND(amount)} về ví!`);
      }
      document.getElementById('modal-saving-op').style.display = 'none';
      document.getElementById('input-saving-op-amount').value = '';
      activeSavingsAction = null;
    } catch (err) {
      alert(err.message);
    }
  });
}

function renderSavingsTab() {
  const s = store.getFinancialSummary();
  const savingsList = store.data.savings;

  document.getElementById('savings-total-display').innerHTML = `${new Intl.NumberFormat('vi-VN').format(s.totalSavings)} <span class="currency">₫</span>`;
  document.getElementById('savings-networth-display').innerText = formatVND(s.totalNetWorth);

  const container = document.getElementById('savings-cards-container');
  if (savingsList.length === 0) {
    container.innerHTML = '<div class="empty-state">Bạn chưa tạo khoản tiết kiệm nào. Bấm nút bên dưới để tạo hũ đầu tiên!</div>';
    return;
  }

  container.innerHTML = savingsList.map(goal => {
    const current = goal.currentAmount || 0;
    const target = goal.targetAmount || 0;
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;

    return `
      <div class="savings-card-item">
        <div class="savings-card-header">
          <div class="savings-card-title">
            <span style="font-size: 24px;">${goal.icon || '🐷'}</span>
            <div>
              <div style="font-size: 14px; font-weight: 700;">${escapeHtml(goal.name)}</div>
              <div style="font-size: 11px; color: var(--text-sub);">
                ${target > 0 ? `Mục tiêu: ${formatVND(target)} (${percent}%)` : 'Tích lũy tự do'}
              </div>
            </div>
          </div>
          <button class="btn-del-tx" onclick="handleDeleteGoal('${goal.id}')" title="Xóa hũ">✕</button>
        </div>

        <div style="font-size: 20px; font-weight: 800; color: #f472b6;">
          ${formatVND(current)}
        </div>

        ${target > 0 ? `
          <div class="savings-progress-bar">
            <div class="savings-progress-fill" style="width: ${percent}%;"></div>
          </div>
        ` : ''}

        <div class="savings-action-btns">
          <button class="btn-saving-action deposit" onclick="openSavingOpModal('deposit', '${goal.id}', '${escapeHtml(goal.name)}')">
            <span>+</span> Bỏ Heo
          </button>
          <button class="btn-saving-action withdraw" onclick="openSavingOpModal('withdraw', '${goal.id}', '${escapeHtml(goal.name)}')">
            <span>-</span> Rút Tiền
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.openSavingOpModal = function(mode, goalId, goalName) {
  activeSavingsAction = { mode, goalId };
  const modal = document.getElementById('modal-saving-op');
  const title = document.getElementById('saving-op-title');
  const btn = document.getElementById('btn-confirm-saving-op');

  if (mode === 'deposit') {
    title.innerText = `Bỏ heo: ${goalName}`;
    btn.innerText = 'Xác Nhận Bỏ Heo';
    btn.className = 'btn-action pink';
  } else {
    title.innerText = `Rút tiền từ: ${goalName}`;
    btn.innerText = 'Xác Nhận Rút Về Ví';
    btn.className = 'btn-action accent';
  }

  document.getElementById('input-saving-op-amount').value = '';
  modal.style.display = 'flex';
};

window.handleDeleteGoal = function(goalId) {
  if (confirm('Xóa hũ tiết kiệm này? Tiền trong hũ sẽ không tự động hoàn về ví, bạn có chắc chắn không?')) {
    store.deleteSavingsGoal(goalId);
    showToast('Đã xóa hũ tiết kiệm');
  }
};

/**
 * ================= MÀN HÌNH THỐNG KÊ =================
 */
function renderStatsTab() {
  const s = store.getFinancialSummary();
  const txs = store.data.transactions;

  document.getElementById('stats-month-spent').innerText = formatVND(s.totalSpentThisMonth);
  document.getElementById('stats-month-income').innerText = formatVND(s.totalIncomeThisMonth);

  // Tỷ lệ chi tiêu theo ví QR vs Tiền mặt
  let spentQR = 0;
  let spentCash = 0;
  const catSums = {};

  txs.forEach(t => {
    if (t.type === 'expense') {
      if (t.wallet === 'qr') spentQR += t.amount;
      else spentCash += t.amount;

      catSums[t.category] = (catSums[t.category] || 0) + t.amount;
    }
  });

  document.getElementById('stats-qr-spent').innerText = formatVND(spentQR);
  document.getElementById('stats-cash-spent').innerText = formatVND(spentCash);

  const totalSpent = spentQR + spentCash || 1;
  const qrPercent = Math.round((spentQR / totalSpent) * 100);
  const cashPercent = Math.round((spentCash / totalSpent) * 100);

  document.getElementById('bar-qr').style.width = `${qrPercent}%`;
  document.getElementById('bar-cash').style.width = `${cashPercent}%`;

  // Danh mục chi tiêu
  const catList = document.getElementById('stats-category-list');
  const sorted = Object.keys(catSums).sort((a, b) => catSums[b] - catSums[a]);

  if (sorted.length === 0) {
    catList.innerHTML = '<div class="empty-state">Chưa có khoản chi tiêu nào</div>';
    return;
  }

  catList.innerHTML = sorted.map(key => {
    const cat = EXPENSE_CATEGORIES[key] || { name: 'Khác', icon: '📦' };
    const amt = catSums[key];
    const pct = Math.round((amt / totalSpent) * 100);

    return `
      <div style="background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span>${cat.icon} ${cat.name}</span>
          <span style="font-weight: 700;">${formatVND(amt)} (${pct}%)</span>
        </div>
        <div style="width: 100%; height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: var(--accent); border-radius: 3px;"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * ================= CÀI ĐẶT & GITHUB GIST =================
 */
function setupSettingsAndGist() {
  document.getElementById('btn-create-gist').addEventListener('click', async () => {
    const token = document.getElementById('input-github-token').value.trim();
    if (!token) {
      alert('Vui lòng dán GitHub Personal Access Token trước!');
      return;
    }

    try {
      showToast('Đang kết nối GitHub...');
      const user = await GistService.verifyToken(token);
      const newGistId = await store.setupNewGist(token);
      document.getElementById('input-gist-id').value = newGistId;
      alert(`Thành công! Đã kết nối @${user.login} và tạo Gist lưu trữ dữ liệu.`);
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  });

  document.getElementById('btn-pull-gist').addEventListener('click', async () => {
    const token = document.getElementById('input-github-token').value.trim();
    const gistId = document.getElementById('input-gist-id').value.trim();

    if (!token || !gistId) {
      alert('Cần nhập cả Token và Gist ID');
      return;
    }

    store.setGitHubConfig(token, gistId);

    try {
      showToast('Đang tải từ Gist...');
      await store.pullFromGist();
      alert('Đồng bộ thành công! Đã tải dữ liệu mới nhất từ GitHub.');
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  });

  document.getElementById('btn-export-json').addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(store.data, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `qlct_sinhvien_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  });
}

function renderSettingsValues() {
  const auth = store.getGitHubConfig();
  document.getElementById('input-github-token').value = auth.githubToken || '';
  document.getElementById('input-gist-id').value = auth.gistId || '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
