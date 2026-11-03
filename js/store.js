/**
 * Quản lý trạng thái, tính toán số dư thực tế, các hũ tiết kiệm và đồng bộ Gist
 */
class ExpenseStore {
  constructor() {
    this.STORAGE_KEY = 'qlct_student_storage_v2';
    this.syncStatus = 'local';
    this.syncMessage = 'Lưu cục bộ';
    this.subscribers = [];
    this.syncDebounceTimer = null;

    this.data = this.getDefaultData();
    this.loadFromLocal();
  }

  getDefaultData() {
    return {
      settings: {
        githubToken: '',
        gistId: '',
        lastSync: null
      },
      // Các khoản / hũ tiết kiệm
      savings: [
        {
          id: 'save_emergency',
          name: 'Quỹ phòng thân',
          icon: '🛡️',
          targetAmount: 1000000,
          currentAmount: 300000
        },
        {
          id: 'save_gadget',
          name: 'Mua tai nghe / đồ công nghệ',
          icon: '🎧',
          targetAmount: 800000,
          currentAmount: 200000
        }
      ],
      // Lịch sử giao dịch (Thu, Chi, Nạp/Rút tiết kiệm)
      transactions: [
        {
          id: 'tx_init_1',
          amount: 2000000,
          type: 'income', // 'income' (nhận tiền) hoặc 'expense' (chi)
          wallet: 'qr',
          category: 'allowance',
          note: 'Bố mẹ gửi đầu tháng',
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          timestamp: Date.now() - 3600000 * 24
        },
        {
          id: 'tx_init_2',
          amount: 35000,
          type: 'expense',
          wallet: 'qr',
          category: 'food',
          note: 'Cơm trưa',
          date: new Date().toISOString().split('T')[0],
          time: '12:15',
          timestamp: Date.now() - 3600000 * 4
        },
        {
          id: 'tx_init_3',
          amount: 25000,
          type: 'expense',
          wallet: 'cash',
          category: 'drink',
          note: 'Trà sữa / Cà phê',
          date: new Date().toISOString().split('T')[0],
          time: '15:30',
          timestamp: Date.now() - 3600000 * 2
        }
      ]
    };
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => cb(this));
  }

  loadFromLocal() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = {
          settings: { ...this.data.settings, ...(parsed.settings || {}) },
          savings: Array.isArray(parsed.savings) ? parsed.savings : this.data.savings,
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
        };
      }
    } catch (e) {
      console.error('Không thể đọc từ localStorage', e);
    }
  }

  saveToLocal() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Không thể lưu vào localStorage', e);
    }
  }

  queueGistSync() {
    const { githubToken, gistId } = this.data.settings;
    if (!githubToken || !gistId) {
      this.syncStatus = 'local';
      this.syncMessage = 'Chưa liên kết Gist';
      this.notify();
      return;
    }

    this.syncStatus = 'syncing';
    this.syncMessage = 'Đang lưu Gist...';
    this.notify();

    if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);

    this.syncDebounceTimer = setTimeout(async () => {
      try {
        await GistService.updateGist(githubToken, gistId, this.data);
        this.data.settings.lastSync = new Date().toISOString();
        this.saveToLocal();
        this.syncStatus = 'synced';
        this.syncMessage = 'Đã lưu GitHub';
      } catch (err) {
        console.error(err);
        this.syncStatus = 'error';
        this.syncMessage = 'Lỗi sync: ' + (err.message || 'Thất bại');
      }
      this.notify();
    }, 1200);
  }

  async pullFromGist() {
    const { githubToken, gistId } = this.data.settings;
    if (!githubToken || !gistId) throw new Error('Chưa cấu hình Token hoặc Gist ID');

    this.syncStatus = 'syncing';
    this.syncMessage = 'Đang tải từ Gist...';
    this.notify();

    try {
      const remoteData = await GistService.fetchGist(githubToken, gistId);
      if (remoteData) {
        this.data = {
          settings: { ...this.data.settings, ...(remoteData.settings || {}) },
          savings: Array.isArray(remoteData.savings) ? remoteData.savings : this.data.savings,
          transactions: Array.isArray(remoteData.transactions) ? remoteData.transactions : []
        };
        this.data.settings.lastSync = new Date().toISOString();
        this.saveToLocal();
        this.syncStatus = 'synced';
        this.syncMessage = 'Đã cập nhật từ Gist';
      }
    } catch (err) {
      this.syncStatus = 'error';
      this.syncMessage = 'Lỗi tải Gist: ' + err.message;
      this.notify();
      throw err;
    }
    this.notify();
  }

  async setupNewGist(token) {
    this.syncStatus = 'syncing';
    this.syncMessage = 'Đang tạo Gist mới...';
    this.notify();

    const gistId = await GistService.createGist(token, this.data);
    this.data.settings.githubToken = token;
    this.data.settings.gistId = gistId;
    this.data.settings.lastSync = new Date().toISOString();
    this.saveToLocal();

    this.syncStatus = 'synced';
    this.syncMessage = 'Đã kết nối Gist';
    this.notify();
    return gistId;
  }

  /**
   * Thêm giao dịch: Chi tiêu (-) hoặc Nhận tiền (+)
   */
  addTransaction({ amount, wallet, category, note, type = 'expense' }) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      amount: Number(amount),
      type, // 'expense' | 'income' | 'saving_deposit' | 'saving_withdraw'
      wallet, // 'qr' | 'cash'
      category,
      note: (note || '').trim(),
      date: dateStr,
      time: timeStr,
      timestamp: Date.now()
    };

    this.data.transactions.unshift(newTx);
    this.saveToLocal();
    this.queueGistSync();
    this.notify();
    return newTx;
  }

  deleteTransaction(id) {
    const tx = this.data.transactions.find(t => t.id === id);
    if (!tx) return;

    // Nếu xóa giao dịch nạp/rút tiết kiệm thì hoàn lại tiền trong hũ
    if (tx.type === 'saving_deposit' && tx.savingGoalId) {
      const goal = this.data.savings.find(g => g.id === tx.savingGoalId);
      if (goal) goal.currentAmount = Math.max(0, goal.currentAmount - tx.amount);
    } else if (tx.type === 'saving_withdraw' && tx.savingGoalId) {
      const goal = this.data.savings.find(g => g.id === tx.savingGoalId);
      if (goal) goal.currentAmount += tx.amount;
    }

    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    this.saveToLocal();
    this.queueGistSync();
    this.notify();
  }

  // ================= Quản lý Tiết Kiệm (Savings) =================

  /**
   * Tạo một hũ tiết kiệm mới
   */
  createSavingsGoal({ name, icon = '🐷', targetAmount = 0 }) {
    const newGoal = {
      id: 'save_' + Date.now(),
      name: name.trim(),
      icon: icon.trim() || '🐷',
      targetAmount: Number(targetAmount) || 0,
      currentAmount: 0
    };
    this.data.savings.push(newGoal);
    this.saveToLocal();
    this.queueGistSync();
    this.notify();
    return newGoal;
  }

  /**
   * Bỏ tiền vào hũ tiết kiệm (trích từ ví QR hoặc Tiền mặt)
   */
  depositToSavings(goalId, amount, wallet = 'qr') {
    const goal = this.data.savings.find(g => g.id === goalId);
    if (!goal) throw new Error('Không tìm thấy hũ tiết kiệm');

    const numAmount = Number(amount);
    if (numAmount <= 0) throw new Error('Số tiền phải lớn hơn 0');

    goal.currentAmount += numAmount;

    // Ghi nhận giao dịch bỏ heo (giảm tiền ví)
    const now = new Date();
    this.data.transactions.unshift({
      id: 'tx_save_dep_' + Date.now(),
      amount: numAmount,
      type: 'saving_deposit',
      wallet,
      category: 'saving',
      savingGoalId: goalId,
      note: `Bỏ heo: ${goal.name}`,
      date: now.toISOString().split('T')[0],
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      timestamp: Date.now()
    });

    this.saveToLocal();
    this.queueGistSync();
    this.notify();
  }

  /**
   * Rút tiền từ hũ tiết kiệm về lại ví
   */
  withdrawFromSavings(goalId, amount, wallet = 'qr') {
    const goal = this.data.savings.find(g => g.id === goalId);
    if (!goal) throw new Error('Không tìm thấy hũ tiết kiệm');

    const numAmount = Number(amount);
    if (numAmount <= 0) throw new Error('Số tiền phải lớn hơn 0');
    if (numAmount > goal.currentAmount) throw new Error('Số dư trong hũ không đủ');

    goal.currentAmount -= numAmount;

    // Ghi nhận giao dịch rút heo (tăng lại tiền ví)
    const now = new Date();
    this.data.transactions.unshift({
      id: 'tx_save_wd_' + Date.now(),
      amount: numAmount,
      type: 'saving_withdraw',
      wallet,
      category: 'saving',
      savingGoalId: goalId,
      note: `Đập heo rút: ${goal.name}`,
      date: now.toISOString().split('T')[0],
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      timestamp: Date.now()
    });

    this.saveToLocal();
    this.queueGistSync();
    this.notify();
  }

  deleteSavingsGoal(goalId) {
    this.data.savings = this.data.savings.filter(g => g.id !== goalId);
    this.saveToLocal();
    this.queueGistSync();
    this.notify();
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveToLocal();
    this.queueGistSync();
    this.notify();
  }

  /**
   * Tính toán toàn bộ số dư thực tế theo từng ví và tiền tiết kiệm
   */
  getFinancialSummary() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    let balanceQR = 0;
    let balanceCash = 0;
    let spentToday = 0;
    let spentTodayQR = 0;
    let spentTodayCash = 0;
    let totalSpentThisMonth = 0;
    let totalIncomeThisMonth = 0;

    this.data.transactions.forEach(t => {
      // 1. Nhận tiền (+)
      if (t.type === 'income') {
        if (t.wallet === 'qr') balanceQR += t.amount;
        else balanceCash += t.amount;

        if (t.date.startsWith(currentMonthPrefix)) {
          totalIncomeThisMonth += t.amount;
        }
      }
      // 2. Chi tiêu (-)
      else if (t.type === 'expense') {
        if (t.wallet === 'qr') balanceQR -= t.amount;
        else balanceCash -= t.amount;

        if (t.date.startsWith(currentMonthPrefix)) {
          totalSpentThisMonth += t.amount;
        }

        if (t.date === todayStr) {
          spentToday += t.amount;
          if (t.wallet === 'qr') spentTodayQR += t.amount;
          else spentTodayCash += t.amount;
        }
      }
      // 3. Nạp vào tiết kiệm (-) làm giảm tiền ví khả dụng
      else if (t.type === 'saving_deposit') {
        if (t.wallet === 'qr') balanceQR -= t.amount;
        else balanceCash -= t.amount;
      }
      // 4. Rút từ tiết kiệm (+) hoàn tiền về ví khả dụng
      else if (t.type === 'saving_withdraw') {
        if (t.wallet === 'qr') balanceQR += t.amount;
        else balanceCash += t.amount;
      }
    });

    // Tổng tiền tiết kiệm từ tất cả các hũ
    const totalSavings = this.data.savings.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const totalSpendable = balanceQR + balanceCash; // Tổng tiền khả dụng trong tay để tiêu

    return {
      todayStr,
      balanceQR,
      balanceCash,
      totalSpendable,
      totalSavings,
      totalNetWorth: totalSpendable + totalSavings, // Tổng tài sản của sinh viên
      spentToday,
      spentTodayQR,
      spentTodayCash,
      totalSpentThisMonth,
      totalIncomeThisMonth
    };
  }
}

const store = new ExpenseStore();
