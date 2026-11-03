# 🎓 QLCT Sinh Viên - Quản Lý Chi Tiêu & Tiết Kiệm

Ứng dụng quản lý chi tiêu & heo đất tiết kiệm cá nhân tối giản dành riêng cho sinh viên đại học. Ứng dụng chạy mượt trên trình duyệt điện thoại (PWA/Web App) và sử dụng **GitHub Gist API** để đồng bộ dữ liệu đám mây hoàn toàn miễn phí, riêng tư, không cần thuê server.

---

## 🌟 Tính Năng Dành Riêng Cho Đời Sống Sinh Viên

1. **Ghi nhận tiền linh hoạt (Thu & Chi):**
   * **💰 Nhận tiền (+):** Khi nào bố mẹ gửi trợ cấp, nhận lương làm thêm hoặc có ai trả nợ, chỉ cần bấm **Nhận tiền (+)** $\rightarrow$ chọn nguồn ví (QR/Bank hoặc Tiền mặt) $\rightarrow$ số dư ví tự động tăng lên.
   * **💸 Chi tiêu (-):** Chạm danh mục 1-chạm (Cơm 🍚, Trà sữa 🧋, Xăng xe ⛽, Tạp hóa 🛒, Mua sắm 🛍️, Học tập 📚, Đi chơi 🎮). Hỗ trợ gõ tắt đơn vị nghìn (`25` hoặc `25k` = 25.000đ).
2. **🐷 Chế độ Heo Đất Tiết Kiệm (Savings Mode):**
   * **Tổng số tiền đã tiết kiệm được:** Luôn hiển thị to rõ ở đầu tab Tiết kiệm.
   * **Tự tạo các hũ tiết kiệm riêng biệt:** Ví dụ: *Quỹ phòng thân 🛡️*, *Mua tai nghe / đồ công nghệ 🎧*, *Đi du lịch Đà Lạt ✈️*... có thể đặt mục tiêu hoặc để tự do.
   * **Bỏ Heo (+):** Trích một khoản từ ví QR hoặc Tiền mặt cất vào hũ. Tiền khả dụng trong ví sẽ giảm đi để bạn không tiện tay tiêu mất.
   * **Rút Tiền (-):** Khi cần dùng, có thể đập heo rút tiền ngược lại về ví bất kỳ lúc nào.
3. **Theo dõi 2 nguồn tiền độc lập:**
   * **📱 Ví QR / Ngân hàng** (tiêu quẹt mã VietQR, MoMo)
   * **💵 Tiền mặt trong bóp**
4. **☁️ Đồng bộ đám mây bằng GitHub Gist Token:**
   * Dữ liệu lưu dưới dạng JSON trong một Gist riêng tư trên tài khoản GitHub cá nhân của bạn.
   * Hoàn toàn miễn phí, an toàn tuyệt đối, không lo mất dữ liệu khi đổi điện thoại.

---

## 🚀 Cách Mở & Sử Dụng Trên Điện Thoại

### Cách 1: Đưa lên GitHub Pages (Khuyên dùng để mở trên điện thoại)
1. Đẩy thư mục này lên một repository GitHub của bạn (ví dụ đặt tên repo là `qlct`).
2. Vào repo trên GitHub: **Settings** -> **Pages** -> Tại mục **Branch** chọn `main` (hoặc `master`), thư mục `/(root)` rồi bấm **Save**.
3. Sau 1 phút, GitHub sẽ cấp cho bạn một đường link web (dạng `https://username.github.io/qlct/`).
4. Mở link đó trên Safari (iPhone) hoặc Chrome (Android):
   * Bấm **Chia sẻ** (Safari) hoặc dấu **3 chấm** (Chrome) -> Chọn **"Thêm vào màn hình chính" (Add to Home Screen)**.
   * Ứng dụng sẽ xuất hiện như một app thật trên điện thoại!

### Cách 2: Xem thử ngay trên máy tính
- Chỉ cần nhấp đúp vào file `index.html` để mở trong trình duyệt Chrome/Edge/Firefox.
- Nhấn phím `F12` $\rightarrow$ Bấm vào biểu tượng điện thoại (`Ctrl + Shift + M`) để trải nghiệm giao diện điện thoại di động.

---

## 🔑 Hướng Dẫn Lấy GitHub Gist Token (1 Phút)

1. Đăng nhập vào [GitHub.com](https://github.com).
2. Nhấp vào ảnh đại diện góc trên bên phải -> Chọn **Settings**.
3. Cuộn xuống cuối thanh bên trái, chọn **Developer Settings**.
4. Chọn **Personal access tokens** -> **Tokens (classic)**.
5. Bấm nút **Generate new token** -> **Generate new token (classic)**.
6. Điền:
   - **Note:** `QLCT Token`
   - **Select scopes:** Tích chọn đúng 1 ô duy nhất là `[x] gist`.
7. Bấm **Generate token** và sao chép mã (bắt đầu bằng `ghp_...`).
8. Mở app QLCT -> Vào tab **⚙️ Gist** -> Dán Token vào rồi bấm **✨ Tạo Gist Mới**!
