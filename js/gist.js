/**
 * Module kết nối và đồng bộ với GitHub Gist API
 * Tối ưu hóa CORS: Tuyệt đối không gửi các header không được GitHub CORS cho phép (như Accept vendor hay Cache-Control)
 */
const GistService = {
  FILENAME: 'qlct_student_data.json',

  /**
   * Tạo header chuẩn được GitHub API CORS cho phép (Authorization, Content-Type)
   */
  getHeaders(token, isJson = false) {
    const cleanToken = (token || '').trim();
    // GitHub API chấp nhận "token <TOKEN>" (cho classic PAT) hoặc "Bearer <TOKEN>"
    const auth = cleanToken.startsWith('token ') || cleanToken.startsWith('Bearer ')
      ? cleanToken
      : (cleanToken.startsWith('ghp_') ? `token ${cleanToken}` : `Bearer ${cleanToken}`);

    const headers = {
      'Authorization': auth
    };

    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  },

  /**
   * Lọc bỏ hoàn toàn các thông tin nhạy cảm
   */
  sanitizeData(data) {
    const clone = JSON.parse(JSON.stringify(data));
    if (clone.settings) {
      delete clone.settings.githubToken;
      delete clone.settings.token;
    }
    delete clone.githubToken;
    delete clone.token;
    return clone;
  },

  /**
   * Kiểm tra xem Token có hợp lệ không
   */
  async verifyToken(token) {
    if (!token) throw new Error('Chưa nhập GitHub Token');
    
    try {
      const res = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: this.getHeaders(token, false)
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error('Token không đúng hoặc đã hết hạn/bị thu hồi (HTTP 401)');
        if (res.status === 403) throw new Error('Bị giới hạn truy cập GitHub API hoặc thiếu quyền (HTTP 403)');
        throw new Error(`GitHub trả về lỗi mã ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Không thể kết nối đến GitHub (Failed to fetch). Hãy kiểm tra kết nối mạng hoặc tắt tiện ích chặn quảng cáo/Brave Shields nếu có.');
      }
      throw err;
    }
  },

  /**
   * Tạo một Gist bí mật mới để lưu trữ dữ liệu
   */
  async createGist(token, rawData) {
    if (!token) throw new Error('Thiếu GitHub Token');

    const cleanData = this.sanitizeData(rawData);

    try {
      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: this.getHeaders(token, true),
        body: JSON.stringify({
          description: 'QLCT - Dữ liệu Quản lý Chi tiêu Sinh viên',
          public: false,
          files: {
            [this.FILENAME]: {
              content: JSON.stringify(cleanData, null, 2)
            }
          }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Không thể tạo Gist (${res.status})`);
      }

      const gist = await res.json();
      return gist.id;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Lỗi kết nối GitHub (Failed to fetch). Vui lòng thử lại sau vài giây.');
      }
      throw err;
    }
  },

  /**
   * Đọc dữ liệu từ Gist hiện có
   */
  async fetchGist(token, gistId) {
    if (!token || !gistId) throw new Error('Cần cả Token và Gist ID để lấy dữ liệu');

    // Thêm timestamp vào URL thay vì dùng header Cache-Control (tránh lỗi CORS)
    const url = `https://api.github.com/gists/${gistId.trim()}?_t=${Date.now()}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(token, false)
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error('Token không đúng hoặc đã bị thu hồi');
        if (res.status === 404) throw new Error('Không tìm thấy Gist ID này (kiểm tra lại ID hoặc quyền của Token)');
        throw new Error(`Lỗi tải Gist (${res.status})`);
      }

      const gist = await res.json();
      const file = gist.files[this.FILENAME] || Object.values(gist.files)[0];
      if (!file || !file.content) {
        throw new Error('Gist trống hoặc không tìm thấy file dữ liệu');
      }

      try {
        return JSON.parse(file.content);
      } catch (e) {
        throw new Error('Dữ liệu trên Gist không đúng định dạng JSON');
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Lỗi kết nối mạng đến Gist (Failed to fetch).');
      }
      throw err;
    }
  },

  /**
   * Cập nhật dữ liệu lên Gist
   */
  async updateGist(token, gistId, rawData) {
    if (!token || !gistId) throw new Error('Cần cả Token và Gist ID để lưu dữ liệu');

    const cleanData = this.sanitizeData(rawData);

    try {
      const res = await fetch(`https://api.github.com/gists/${gistId.trim()}`, {
        method: 'PATCH',
        headers: this.getHeaders(token, true),
        body: JSON.stringify({
          description: `QLCT - Cập nhật lúc ${new Date().toLocaleString('vi-VN')}`,
          files: {
            [this.FILENAME]: {
              content: JSON.stringify(cleanData, null, 2)
            }
          }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Lỗi cập nhật Gist (${res.status})`);
      }

      return true;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Lỗi kết nối lưu Gist (Failed to fetch).');
      }
      throw err;
    }
  }
};
