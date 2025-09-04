# Auto-Gen UI Test Demo (Excel → Playwright)

> **Mục tiêu**: Cho phép **nhập test case trong Excel**, sau đó **tự động sinh mã kiểm thử (Playwright)** và chạy test UI trên trình duyệt.  
> **Đối tượng**: Demo cho lãnh đạo (CEO/Management) & đội kỹ thuật QA/DEV.

---

## 1) Tóm tắt giá trị & bối cảnh

- **Tăng tốc**: Viết kịch bản kiểm thử bằng **Excel** (thân thuộc với business/QA non-code) → tool **tự sinh code** chạy được ngay.
- **Giảm lỗi thủ công**: Chuẩn hóa format test case, sinh code **nhất quán** (selector, bước lặp lại, assert).
- **Minh bạch**: Kết quả có **HTML report**, video/screenshot khi lỗi.
- **Mở rộng dễ**: Thêm test mới = thêm dòng trong Excel → `npm run gen` → có file test mới.

---

## 2) Kiến trúc tổng quan

```
Excel (testcases.xlsx)
        │
        ▼
Generator (tools/gen-tests.ts) ──> tests-gen/*.spec.ts  (Playwright tests)
        │
        ▼
Playwright Runner ──────────────> HTML Report / Video / Screenshots
```

- **mapping.json**: Bản đồ selector/route (tách biệt code test).
- **index.html**: Trang demo (Login) để chạy thử end-to-end.
- **playwright.config.ts**: Cấu hình Playwright (baseURL, reporter, headless…).

---

## 3) Yêu cầu môi trường

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- Hệ điều hành: Windows / macOS / Linux

---

## 4) Cấu trúc thư mục dự án

```
auto-gen-demo/
├─ index.html                 # Trang demo (Login)
├─ mapping.json               # Map logical name -> CSS/XPath/URL
├─ package.json               # Scripts & devDependencies
├─ playwright.config.ts       # Cấu hình Playwright
├─ tsconfig.json              # TypeScript config
├─ tools/
│   └─ gen-tests.ts           # Generator: Excel -> Playwright .spec.ts
├─ tests-gen/                 # (Sinh tự động) Thư mục chứa file test
└─ testcases.xlsx             # File Excel test case (nguồn)
```

> **Gợi ý**: Có thể giữ nhiều file Excel (ví dụ `testcases_extended.xlsx`, `testcases_regression.xlsx`) và chọn file khi gen (chi tiết ở phần 9).

---

## 5) Cài đặt & chạy nhanh (Quick Start)

```bash
# 1) Cài package
npm install
npx playwright install

# 2) Chạy web server demo (mặc định http://localhost:8080/index.html)
npm run serve

# 3) Sinh mã test từ Excel (testcases.xlsx)
npm run gen

# 4) Chạy test + tạo report HTML
npm run test:report
npx playwright show-report
```

**Thông tin dữ liệu demo (đăng nhập thành công):**  
- Email: `user@ex.com`  
- Password: `12345678`  
- Sau khi đúng: URL sẽ chứa `/dashboard`  
- Sai thông tin → hiển thị `#error: "Invalid ..."`.  

---

## 6) Định dạng Excel (bắt buộc 11 cột)

| Cột         | Ý nghĩa                                                                 |
|-------------|-------------------------------------------------------------------------|
| Suite       | Tên nhóm test (ví dụ: Login)                                           |
| TestID      | Mã test (ví dụ: TC1)                                                   |
| TestName    | Tên hiển thị của test                                                  |
| StepNo      | Thứ tự bước (1, 2, 3, …)                                               |
| Action      | Hành động (xem bảng hỗ trợ bên dưới)                                   |
| Target      | Khóa tra trong `mapping.json` (hoặc CSS/XPath trực tiếp)               |
| Value       | Giá trị nhập/chọn (nếu có)                                             |
| ExpectType  | Loại assert (xem bảng hỗ trợ bên dưới)                                 |
| ExpectTarget| Mục tiêu assert (tra theo mapping, hoặc CSS/XPath)                     |
| ExpectValue | Giá trị kỳ vọng (chuỗi/text/URL regex)                                 |
| Url         | URL (nếu cần override thay vì lấy từ mapping)                          |

**Ví dụ (Valid Login):**
| Suite | TestID | TestName     | StepNo | Action     | Target     | Value      | ExpectType   | ExpectTarget | ExpectValue | Url |
|------|--------|--------------|--------|------------|------------|------------|--------------|--------------|-------------|-----|
| Login| TC1    | Valid Login  | 1      | GOTO       | page.login |            |              |              |             |     |
| Login| TC1    | Valid Login  | 2      | FILL       | email      | user@ex.com|              |              |             |     |
| Login| TC1    | Valid Login  | 3      | FILL       | password   | 12345678   |              |              |             |     |
| Login| TC1    | Valid Login  | 4      | CLICK      | submit     |            |              |              |             |     |
| Login| TC1    | Valid Login  | 5      | EXPECT_URL |            |            | url-contains |              | /dashboard  |     |

---

## 7) Action & ExpectType được hỗ trợ

**Actions:**
- `GOTO` — Mở trang (lấy từ `Url` hoặc từ `Target` tra `mapping.json`)
- `FILL` — Nhập text vào ô (Email/Password…)
- `CLICK` — Click button/link
- `CHECK` / `UNCHECK` — Tích/bỏ checkbox
- `SELECT` — Chọn option trong `<select>`
- `WAIT` — Chờ (Value = milliseconds)

**Assertions:**
- `EXPECT_URL` — So khớp URL
  - `ExpectType = url-contains` → chứa chuỗi (dùng RegExp an toàn)
  - `ExpectType = url-equals` → bằng tuyệt đối
- `EXPECT_TEXT`
  - `ExpectType = text-contains` → phần text chứa chuỗi
  - `ExpectType = text-equals` → text bằng tuyệt đối
  - Sử dụng `ExpectTarget` để trỏ tới selector (ví dụ `error` → `#error`)
- `EXPECT_VISIBLE` / `EXPECT_HIDDEN`
  - Ưu tiên `ExpectTarget`, nếu trống sẽ dùng `Target`

> **Mẹo**: Luôn **trim** dữ liệu trong Excel; tránh thừa khoảng trắng ở `ExpectValue`.

---

## 8) mapping.json (map selector/route)

```json
{
  "page.login": "/index.html",
  "email": "#email",
  "password": "#password",
  "submit": "#submitBtn",
  "error": "#error",
  "success": "#success"
}
```

- **Thay đổi** khi UI đổi ID/class/XPath → không cần sửa Excel.
- Có thể đặt **full URL** tại `page.login` (ví dụ chạy trên cổng khác).

---

## 9) Sử dụng nhiều file Excel (tùy chọn)

Generator hỗ trợ truyền tên file Excel qua tham số:

```bash
# Đọc file mặc định
npm run gen

# Đọc file khác
npm run gen -- testcases_extended.xlsx
npm run gen -- testcases_regression.xlsx
```

> Có thể thêm alias trong `package.json`:
```json
"scripts": {
  "gen:extended": "ts-node tools/gen-tests.ts testcases_extended.xlsx",
  "gen:regression": "ts-node tools/gen-tests.ts testcases_regression.xlsx"
}
```

---

## 10) Cấu hình Playwright & Script npm

**playwright.config.ts**
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests-gen',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

**package.json (scripts gợi ý)**
```json
"scripts": {
  "gen": "ts-node tools/gen-tests.ts",
  "test": "playwright test",
  "test:report": "playwright test --reporter=html",
  "serve": "npx http-server . -p 8080"
}
```

> Lần đầu chạy: `npx playwright install`

---

## 11) Troubleshooting (nhanh & thực tế)

- **`Missing script: server`** → Dùng `npm run serve` (không phải `server`).
- **`http-server not found`** → `npm i -D http-server` hoặc `npm i -g http-server`.
- **`__dirname is not defined` / lỗi ESM** → Đưa generator về **CommonJS**:
  - Xóa `"type": "module"` trong `package.json`
  - `tsconfig.json` dùng `"module": "commonjs"`
  - Script: `"gen": "ts-node tools/gen-tests.ts"`
- **Sinh ra `await expect(page).toHaveURL(//);`** → Do `EXPECT_URL` thiếu `ExpectValue`. Điền `/dashboard` hoặc dùng `url-equals` với full URL.
- **`EXPECT_TEXT` chọn wrong selector** → Điền đúng `ExpectTarget` (ví dụ `error`), generator sẽ map sang `#error`.
- **`No report found`** → Bật reporter HTML trong `playwright.config.ts`, rồi `npm run test:report`.

---

## 12) Mở rộng & tích hợp

- **CI/CD**: Chạy `npm ci && npx playwright install --with-deps && npm run gen && npm run test:report` trong pipeline (GitHub Actions/GitLab CI).
- **Data-driven**: Nhân bản test với nhiều bộ dữ liệu bằng cách thêm nhiều dòng Steps với `TestID` giống nhau.
- **A11y**: Có thể tích hợp `@axe-core/playwright` cho kiểm thử accessibility.
- **Visual Regression**: Dùng `expect(locator).toHaveScreenshot()` cho màn hình ổn định.

---

## 13) Phụ lục: Trang demo & hành vi

**index.html** là trang Login tối giản:
- Thành công: `user@ex.com` / `12345678` → báo `#success` rồi redirect `/dashboard`.
- Thất bại: hiện `#error` (“Invalid …”).

> Mục đích: minh họa end-to-end từ **GOTO → nhập liệu → click → assert URL/text**.

---

## 14) Kết luận

Giải pháp **Auto-Gen UI Test** giúp:
- **Chuẩn hóa** cách viết test giữa Business/QA/DEV.
- **Tự động hóa** khâu sinh code lặp lại, giảm rủi ro lỗi người.
- **Minh bạch** kết quả qua báo cáo HTML/Video, dễ trình bày với lãnh đạo.
- **Mở rộng nhanh** khi yêu cầu tăng: chỉ việc **thêm dòng trong Excel**.

Nếu cần, có thể **đóng gói** thành template nội bộ (starter kit) để đội ngũ áp dụng cho nhiều dự án khác nhau.

---
