/**
 * Module kết nối và đồng bộ với GitHub Gist API
 */
const GistService = {
  FILENAME: 'qlct_student_data.json',

  /**
   * Lọc bỏ hoàn toàn các thông tin nhạy cảm (Token, mật khẩu)
   * Tuyệt đối không bao giờ để chuỗi Token xuất hiện trong nội dung file Gist!
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
    const res = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Token không hợp lệ hoặc đã bị GitHub thu hồi.');
      throw new Error(`Lỗi kết nối GitHub (${res.status})`);
    }
    const user = await res.json();
    return user;
  },

  /**
   * Tạo một Gist bí mật mới để lưu trữ dữ liệu (Chỉ gửi dữ liệu chi tiêu, KHÔNG gửi Token)
   */
  async createGist(token, rawData) {
    if (!token) throw new Error('Thiếu GitHub Token');

    const cleanData = this.sanitizeData(rawData);

    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: 'QLCT - Dữ liệu Quản lý Chi tiêu Sinh viên (Private)',
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
  },

  /**
   * Đọc dữ liệu từ Gist hiện có
   */
  async fetchGist(token, gistId) {
    if (!token || !gistId) throw new Error('Cần cả Token và Gist ID để lấy dữ liệu');
    const res = await fetch(`https://api.github.com/gists/${gistId.trim()}`, {
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Accept': 'application/vnd.github+json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('Token không hợp lệ hoặc đã bị thu hồi');
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
  },

  /**
   * Cập nhật dữ liệu lên Gist (Chỉ gửi dữ liệu chi tiêu, KHÔNG gửi Token)
   */
  async updateGist(token, gistId, rawData) {
    if (!token || !gistId) throw new Error('Cần cả Token và Gist ID để lưu dữ liệu');

    const cleanData = this.sanitizeData(rawData);

    const res = await fetch(`https://api.github.com/gists/${gistId.trim()}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
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
  }
};
