# Dokumentasi API Sistem ERP Samudra

## Pengantar

Dokumentasi ini berisi informasi tentang RESTful API untuk sistem ERP Logistik & Pengiriman "Samudra". API ini menyediakan akses ke berbagai fitur sistem, termasuk manajemen cabang, pegawai, pelanggan, pengiriman, dan keuangan.

## Base URL

```
http://localhost:5000/api
```

## Autentikasi

Sebagian besar endpoint memerlukan autentikasi. Gunakan token JWT yang diperoleh dari endpoint login.

### Mendapatkan Token

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123456789",
    "nama": "Nama Pengguna",
    "email": "user@example.com",
    "role": "staff_admin",
    "cabangId": "123456789"
  }
}
```

### Menggunakan Token

Sertakan token di header Authorization untuk semua endpoint yang memerlukan autentikasi:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Endpoint API

### Autentikasi & Manajemen Pengguna

#### Login
- **Endpoint**: `POST /auth/login`
- **Akses**: Publik
- **Deskripsi**: Login pengguna dan mendapatkan token JWT

#### Mendapatkan Data Pengguna
- **Endpoint**: `GET /auth/me`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan informasi pengguna yang sedang login

#### Logout
- **Endpoint**: `POST /auth/logout`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Logout pengguna

#### Ubah Password
- **Endpoint**: `PUT /auth/change-password`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mengubah password pengguna
- **Request Body**:
  ```json
  {
    "currentPassword": "current_password",
    "newPassword": "new_password"
  }
  ```

#### Mendapatkan Semua Pengguna
- **Endpoint**: `GET /users`
- **Akses**: Direktur, Manajer Admin, Manajer SDM, Kepala Cabang
- **Deskripsi**: Mendapatkan daftar semua pengguna
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `role`: Filter berdasarkan peran
  - `aktif`: Filter berdasarkan status aktif (true/false)

#### Mendapatkan Pengguna Berdasarkan ID
- **Endpoint**: `GET /users/:id`
- **Akses**: Direktur, Manajer Admin, Manajer SDM, Kepala Cabang
- **Deskripsi**: Mendapatkan informasi pengguna berdasarkan ID

#### Membuat Pengguna Baru
- **Endpoint**: `POST /users`
- **Akses**: Direktur, Manajer Admin, Manajer SDM
- **Deskripsi**: Membuat pengguna baru
- **Request Body**:
  ```json
  {
    "nama": "Nama Lengkap",
    "jabatan": "Jabatan",
    "role": "staff_admin",
    "email": "email@example.com",
    "telepon": "08123456789",
    "alamat": "Alamat lengkap",
    "username": "username",
    "password": "password",
    "cabangId": "id_cabang"
  }
  ```

#### Mengupdate Pengguna
- **Endpoint**: `PUT /users/:id`
- **Akses**: Direktur, Manajer Admin, Manajer SDM
- **Deskripsi**: Mengupdate informasi pengguna
- **Request Body**: (field yang ingin diupdate)
  ```json
  {
    "nama": "Nama Baru",
    "jabatan": "Jabatan Baru",
    "email": "newemail@example.com"
  }
  ```

#### Menghapus Pengguna
- **Endpoint**: `DELETE /users/:id`
- **Akses**: Direktur, Manajer Admin, Manajer SDM
- **Deskripsi**: Menonaktifkan pengguna (soft delete)

#### Mendapatkan Pengguna Berdasarkan Cabang
- **Endpoint**: `GET /users/by-branch/:branchId`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan pengguna berdasarkan cabang

### Manajemen Retur

#### Mendapatkan Semua Retur
- **Endpoint**: `GET /returns`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan daftar semua retur
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `status`: Filter berdasarkan status

#### Mendapatkan Retur Berdasarkan ID
- **Endpoint**: `GET /returns/:id`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan informasi retur berdasarkan ID

#### Membuat Retur Baru
- **Endpoint**: `POST /returns`
- **Akses**: Staff Admin, Kepala Cabang
- **Deskripsi**: Membuat retur baru
- **Request Body**:
  ```json
  {
    "sttIds": ["id_stt_1", "id_stt_2"],
    "tanggalKirim": "2023-12-02T10:00:00Z",
    "tandaTerima": "TTD penerima"
  }
  ```

#### Mengupdate Retur
- **Endpoint**: `PUT /returns/:id`
- **Akses**: Staff Admin, Kepala Cabang
- **Deskripsi**: Mengupdate informasi retur
- **Request Body**: (field yang ingin diupdate)
  ```json
  {
    "tanggalSampai": "2023-12-03T15:30:00Z"
  }
  ```

#### Mengupdate Status Retur
- **Endpoint**: `PUT /returns/:id/status`
- **Akses**: Staff Admin, Kepala Cabang
- **Deskripsi**: Mengupdate status retur
- **Request Body**:
  ```json
  {
    "status": "SAMPAI"
  }
  ```

### Manajemen Penagihan (Collection)

#### Mendapatkan Semua Penagihan
- **Endpoint**: `GET /collections`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan daftar semua penagihan
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `pelangganId`: Filter berdasarkan pelanggan
  - `status`: Filter berdasarkan status
  - `overdue`: Filter berdasarkan overdue (true/false)

#### Mendapatkan Penagihan Berdasarkan ID
- **Endpoint**: `GET /collections/:id`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan informasi penagihan berdasarkan ID

#### Membuat Penagihan Baru
- **Endpoint**: `POST /collections`
- **Akses**: Debt Collector, Kasir, Manajer Keuangan
- **Deskripsi**: Membuat penagihan baru
- **Request Body**:
  ```json
  {
    "pelangganId": "id_pelanggan",
    "tipePelanggan": "Pengirim",
    "sttIds": ["id_stt_1", "id_stt_2", "id_stt_3"],
    "totalTagihan": 750000
  }
  ```

#### Mengupdate Penagihan
- **Endpoint**: `PUT /collections/:id`
- **Akses**: Debt Collector, Kasir, Manajer Keuangan
- **Deskripsi**: Mengupdate informasi penagihan
- **Request Body**: (field yang ingin diupdate)
  ```json
  {
    "jumlahBayarTermin": [
      {
        "termin": 1,
        "tanggal": "2023-12-05T14:30:00Z",
        "jumlah": 375000
      }
    ]
  }
  ```

#### Mengupdate Status Penagihan
- **Endpoint**: `PUT /collections/:id/status`
- **Akses**: Debt Collector, Kasir, Manajer Keuangan
- **Deskripsi**: Mengupdate status penagihan
- **Request Body**:
  ```json
  {
    "status": "LUNAS",
    "tanggalBayar": "2023-12-10T09:15:00Z"
  }
  ```

#### Generate Invoice Penagihan
- **Endpoint**: `GET /collections/generate-invoice/:id`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Generate file PDF Invoice Penagihan

### Manajemen Akun (Account)

#### Mendapatkan Semua Akun
- **Endpoint**: `GET /accounts`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan daftar semua akun
- **Query Parameters**:
  - `tipeAccount`: Filter berdasarkan tipe akun

#### Mendapatkan Akun Berdasarkan ID
- **Endpoint**: `GET /accounts/:id`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan informasi akun berdasarkan ID

#### Membuat Akun Baru
- **Endpoint**: `POST /accounts`
- **Akses**: Manajer Keuangan, Direktur
- **Deskripsi**: Membuat akun baru
- **Request Body**:
  ```json
  {
    "kodeAccount": "1-1001",
    "namaAccount": "Kas Operasional",
    "tipeAccount": "Aset",
    "deskripsi": "Kas untuk operasional sehari-hari"
  }
  ```

#### Mengupdate Akun
- **Endpoint**: `PUT /accounts/:id`
- **Akses**: Manajer Keuangan, Direktur
- **Deskripsi**: Mengupdate informasi akun
- **Request Body**: (field yang ingin diupdate)
  ```json
  {
    "namaAccount": "Kas Operasional Harian",
    "deskripsi": "Kas untuk operasional harian cabang"
  }
  ```

#### Menghapus Akun
- **Endpoint**: `DELETE /accounts/:id`
- **Akses**: Manajer Keuangan, Direktur
- **Deskripsi**: Menghapus akun

### Manajemen Jurnal (Journal)

#### Mendapatkan Semua Jurnal
- **Endpoint**: `GET /journals`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan daftar semua jurnal
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `tipe`: Filter berdasarkan tipe jurnal
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Mendapatkan Jurnal Berdasarkan ID
- **Endpoint**: `GET /journals/:id`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan informasi jurnal berdasarkan ID

#### Membuat Jurnal Baru
- **Endpoint**: `POST /journals`
- **Akses**: Kasir, Staff Admin, Manajer Keuangan
- **Deskripsi**: Membuat jurnal baru
- **Request Body**:
  ```json
  {
    "tanggal": "2023-12-01T08:00:00Z",
    "accountId": "id_account",
    "cabangId": "id_cabang",
    "keterangan": "Pembayaran STT #12345",
    "debet": 500000,
    "kredit": 0,
    "tipe": "Lokal",
    "sttIds": ["id_stt_1"]
  }
  ```

#### Mengupdate Jurnal
- **Endpoint**: `PUT /journals/:id`
- **Akses**: Kasir, Staff Admin, Manajer Keuangan
- **Deskripsi**: Mengupdate informasi jurnal
- **Request Body**: (field yang ingin diupdate)
  ```json
  {
    "keterangan": "Revisi: Pembayaran STT #12345",
    "debet": 550000
  }
  ```

#### Menghapus Jurnal
- **Endpoint**: `DELETE /journals/:id`
- **Akses**: Manajer Keuangan
- **Deskripsi**: Menghapus jurnal (Hanya untuk jurnal dengan status DRAFT)

### Manajemen Kas

#### Mendapatkan Semua Kas
- **Endpoint**: `GET /cash`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan daftar semua kas
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `tipeKas`: Filter berdasarkan tipe kas
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Mendapatkan Kas Berdasarkan ID
- **Endpoint**: `GET /cash/:id`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan informasi kas berdasarkan ID

#### Membuat Kas Baru
- **Endpoint**: `POST /cash`
- **Akses**: Kasir, Manajer Keuangan
- **Deskripsi**: Membuat transaksi kas baru
- **Request Body**:
  ```json
  {
    "tanggal": "2023-12-01T08:00:00Z",
    "tipeKas": "Awal",
    "cabangId": "id_cabang",
    "keterangan": "Saldo awal harian",
    "debet": 1000000,
    "kredit": 0
  }
  ```

#### Mengupdate Kas
- **Endpoint**: `PUT /cash/:id`
- **Akses**: Kasir, Manajer Keuangan
- **Deskripsi**: Mengupdate informasi kas
- **Request Body**: (field yang ingin diupdate)
  ```json
  {
    "keterangan": "Revisi: Saldo awal harian",
    "debet": 1500000
  }
  ```

### Manajemen Mutasi Rekening

#### Mendapatkan Semua Mutasi Rekening
- **Endpoint**: `GET /bank-statements`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan daftar semua mutasi rekening
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `status`: Filter berdasarkan status
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Mendapatkan Mutasi Rekening Berdasarkan ID
- **Endpoint**: `GET /bank-statements/:id`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan informasi mutasi rekening berdasarkan ID

#### Membuat Mutasi Rekening Baru
- **Endpoint**: `POST /bank-statements`
- **Akses**: Kasir, Manajer Keuangan
- **Deskripsi**: Membuat mutasi rekening baru
- **Request Body**:
  ```json
  {
    "tanggal": "2023-12-01T10:30:00Z",
    "bank": "BCA",
    "noRekening": "1234567890",
    "keterangan": "Setoran tunai",
    "debet": 2000000,
    "kredit": 0,
    "cabangId": "id_cabang"
  }
  ```

#### Mengupdate Mutasi Rekening
- **Endpoint**: `PUT /bank-statements/:id`
- **Akses**: Kasir, Manajer Keuangan
- **Deskripsi**: Mengupdate informasi mutasi rekening
- **Request Body**: (field yang ingin diupdate)
  ```json
  {
    "keterangan": "Revisi: Setoran tunai dari penagihan",
    "debet": 2500000
  }
  ```

#### Validasi Mutasi Rekening
- **Endpoint**: `PUT /bank-statements/:id/validate`
- **Akses**: Staff Admin, Manajer Keuangan
- **Deskripsi**: Memvalidasi mutasi rekening
- **Request Body**:
  ```json
  {
    "status": "VALIDATED"
  }
  ```

### Manajemen Aset

#### Mendapatkan Semua Aset
- **Endpoint**: `GET /assets`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan daftar semua aset
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `tipeAset`: Filter berdasarkan tipe aset
  - `statusAset`: Filter berdasarkan status aset

#### Mendapatkan Aset Berdasarkan ID
- **Endpoint**: `GET /assets/:id`
- **Akses**: Pengguna terautentikasi dengan role tertentu
- **Deskripsi**: Mendapatkan informasi aset berdasarkan ID

#### Membuat Aset Baru
- **Endpoint**: `POST /assets`
- **Akses**: Manajer Keuangan, Direktur
- **Deskripsi**: Membuat aset baru
- **Request Body**:
  ```json
  {
    "namaAset": "Komputer Kantor",
    "tipeAset": "Elektronik",
    "tanggalPembelian": "2023-01-15T00:00:00Z",
    "nilaiPembelian": 15000000,
    "persentasePenyusutan": 20,
    "lokasiAset": "Ruang Admin",
    "cabangId": "id_cabang"
  }
  ```

#### Mengupdate Aset
- **Endpoint**: `PUT /assets/:id`
- **Akses**: Manajer Keuangan, Direktur
- **Deskripsi**: Mengupdate informasi aset
- **Request Body**: (field yang ingin diupdate)
  ```json
  {
    "lokasiAset": "Ruang Manajer",
    "statusAset": "DIJUAL"
  }
  ```

#### Menghapus Aset
- **Endpoint**: `DELETE /assets/:id`
- **Akses**: Manajer Keuangan, Direktur
- **Deskripsi**: Menghapus aset

### Manajemen Pending Barang

#### Mendapatkan Semua Pending Barang
- **Endpoint**: `GET /pending-packages`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan daftar semua pending barang
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `status`: Filter berdasarkan status

#### Mendapatkan Pending Barang Berdasarkan ID
- **Endpoint**: `GET /pending-packages/:id`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan informasi pending barang berdasarkan ID

#### Membuat Pending Barang Baru
- **Endpoint**: `POST /pending-packages`
- **Akses**: Staff Admin, Checker
- **Deskripsi**: Membuat pending barang baru
- **Request Body**:
  ```json
  {
    "sttId": "id_stt",
    "cabangAsalId": "id_cabang_asal",
    "cabangTujuanId": "id_cabang_tujuan",
    "alasanPending": "Alamat penerima tidak jelas",
    "action": "Hubungi pengirim untuk konfirmasi alamat"
  }
  ```

#### Mengupdate Pending Barang
- **Endpoint**: `PUT /pending-packages/:id`
- **Akses**: Staff Admin, Checker
- **Deskripsi**: Mengupdate informasi pending barang
- **Request Body**: (field yang ingin diupdate)
  ```json
  {
    "alasanPending": "Alamat penerima tidak ditemukan",
    "action": "Barang dikembalikan ke cabang asal"
  }
  ```

#### Mengupdate Status Pending Barang
- **Endpoint**: `PUT /pending-packages/:id/status`
- **Akses**: Staff Admin, Checker
- **Deskripsi**: Mengupdate status pending barang
- **Request Body**:
  ```json
  {
    "status": "RESOLVED"
  }
  ```

### Laporan

#### Laporan Daftar Muat Barang
- **Endpoint**: `GET /reports/loading-manifest`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan daftar muat barang
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Laporan Penjualan
- **Endpoint**: `GET /reports/sales`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan penjualan
- **Query Parameters**:
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Laporan Penjualan per Cabang
- **Endpoint**: `GET /reports/sales-by-branch/:branchId`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan penjualan per cabang
- **Query Parameters**:
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Laporan Omzet
- **Endpoint**: `GET /reports/revenue`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan omzet
- **Query Parameters**:
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Laporan Omzet Bulanan
- **Endpoint**: `GET /reports/revenue/monthly`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan omzet bulanan
- **Query Parameters**:
  - `year`: Filter berdasarkan tahun

#### Laporan Omzet Harian
- **Endpoint**: `GET /reports/revenue/daily`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan omzet harian
- **Query Parameters**:
  - `year`: Filter berdasarkan tahun
  - `month`: Filter berdasarkan bulan

#### Laporan Retur
- **Endpoint**: `GET /reports/returns`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan retur
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Laporan Piutang
- **Endpoint**: `GET /reports/receivables`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan piutang
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `status`: Filter berdasarkan status
  - `overdue`: Filter berdasarkan overdue (true/false)

#### Laporan Penagihan
- **Endpoint**: `GET /reports/collections`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan penagihan
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Laporan Kas Harian per Kantor
- **Endpoint**: `GET /reports/cash-daily/:branchId`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan kas harian per kantor
- **Query Parameters**:
  - `date`: Filter berdasarkan tanggal

#### Laporan Neraca
- **Endpoint**: `GET /reports/balance-sheet`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan neraca
- **Query Parameters**:
  - `date`: Tanggal neraca

#### Laporan Laba Rugi
- **Endpoint**: `GET /reports/profit-loss`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan laporan laba rugi
- **Query Parameters**:
  - `startDate`: Filter berdasarkan tanggal mulai
  - `endDate`: Filter berdasarkan tanggal akhir

#### Statistik Dashboard
- **Endpoint**: `GET /reports/dashboard-stats`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Mendapatkan statistik untuk dashboard
- **Query Parameters**:
  - `cabangId`: Filter berdasarkan cabang (opsional)

#### Export Laporan
- **Endpoint**: `GET /reports/export/:reportType`
- **Akses**: Pengguna terautentikasi
- **Deskripsi**: Export laporan ke format Excel atau PDF
- **Query Parameters**:
  - `format`: Format export (excel/pdf)
  - Parameter lain sesuai dengan jenis laporan

### Mobile API

#### Mendapatkan Request Pengambilan (Mobile)
- **Endpoint**: `GET /mobile/pickup-requests`
- **Akses**: Pengguna terautentikasi (supir, kenek)
- **Deskripsi**: Mendapatkan daftar request pengambilan untuk aplikasi mobile

#### Update Status Request Pengambilan (Mobile)
- **Endpoint**: `PUT /mobile/pickup-requests/:id/status`
- **Akses**: Pengguna terautentikasi (supir, kenek)
- **Deskripsi**: Mengupdate status request pengambilan dari aplikasi mobile

#### Mendapatkan Antrian Truck (Mobile)
- **Endpoint**: `GET /mobile/truck-queues`
- **Akses**: Pengguna terautentikasi (checker, kepala gudang)
- **Deskripsi**: Mendapatkan daftar antrian truck untuk aplikasi mobile

#### Tambah Antrian Truck (Mobile)
- **Endpoint**: `POST /mobile/truck-queues`
- **Akses**: Pengguna terautentikasi (checker, kepala gudang)
- **Deskripsi**: Menambahkan antrian truck dari aplikasi mobile

#### Mendapatkan STT untuk Penugasan Truck (Mobile)
- **Endpoint**: `GET /mobile/stt/truck-assignment`
- **Akses**: Pengguna terautentikasi (checker)
- **Deskripsi**: Mendapatkan daftar STT untuk penugasan truck dari aplikasi mobile

#### Assign STT ke Truck (Mobile)
- **Endpoint**: `POST /mobile/stt/truck-assignment`
- **Akses**: Pengguna terautentikasi (checker)
- **Deskripsi**: Menugaskan STT ke truck dari aplikasi mobile

#### Mendapatkan Lansir (Mobile)
- **Endpoint**: `GET /mobile/deliveries`
- **Akses**: Pengguna terautentikasi (supir, checker)
- **Deskripsi**: Mendapatkan daftar lansir untuk aplikasi mobile

#### Update Status Lansir (Mobile)
- **Endpoint**: `PUT /mobile/deliveries/:id/status`
- **Akses**: Pengguna terautentikasi (supir, checker)
- **Deskripsi**: Mengupdate status lansir dari aplikasi mobile

#### Tracking STT (Mobile)
- **Endpoint**: `GET /mobile/tracking/:sttNumber`
- **Akses**: Publik
- **Deskripsi**: Melacak status STT dari aplikasi mobile

## Kode Status HTTP

API ini menggunakan kode status HTTP standar untuk menunjukkan keberhasilan atau kegagalan request:

- `200 OK`: Request berhasil
- `201 Created`: Resource baru berhasil dibuat
- `400 Bad Request`: Request tidak valid atau parameter yang diperlukan tidak ada
- `401 Unauthorized`: Autentikasi diperlukan atau gagal
- `403 Forbidden`: Pengguna tidak memiliki hak akses untuk resource yang diminta
- `404 Not Found`: Resource tidak ditemukan
- `500 Internal Server Error`: Terjadi kesalahan pada server

## Format Response

API ini menggunakan format response JSON standar:

### Response Sukses

```json
{
  "success": true,
  "data": { ... },  // Data yang diminta
  "message": "..."  // Pesan sukses (opsional)
}
```

Untuk endpoints yang mengembalikan daftar, response juga dapat menyertakan informasi pagination:

```json
{
  "success": true,
  "count": 10,         // Jumlah item yang dikembalikan
  "pagination": {      // Informasi pagination
    "next": {
      "page": 2,
      "limit": 10
    },
    "prev": null
  },
  "total": 45,         // Total item di database
  "data": [ ... ]      // Array data
}
```

### Response Error

```json
{
  "success": false,
  "message": "...",  // Pesan error
  "errors": { ... }  // Detail error (opsional)
}
```

## Pagination

Untuk endpoints yang mengembalikan banyak data, API mendukung pagination dengan query parameters:

- `page`: Nomor halaman yang ingin ditampilkan (default: 1)
- `limit`: Jumlah item per halaman (default: 10)

Contoh request:

```
GET /api/stt?page=2&limit=20
```

## Filter Data

Beberapa endpoints mendukung filter data dengan query parameters, seperti:

- `startDate` & `endDate`: Untuk filter berdasarkan rentang tanggal
- `cabangId`: Untuk filter berdasarkan cabang
- `status`: Untuk filter berdasarkan status

## Sorting

Beberapa endpoints mendukung sorting data dengan query parameters:

- `sort`: Field yang digunakan untuk sorting
- `order`: Arah sorting (asc/desc, default: desc)

Contoh request:

```
GET /api/stt?sort=createdAt&order=desc
```

## Rate Limiting

API ini menerapkan rate limiting untuk mencegah penyalahgunaan. Batas default adalah 100 requests per IP per jam. Header berikut akan disertakan dalam response:

- `X-RateLimit-Limit`: Batas total requests
- `X-RateLimit-Remaining`: Jumlah requests yang tersisa
- `X-RateLimit-Reset`: Waktu (dalam detik) sebelum batas reset

## Pengembangan Lebih Lanjut

Dokumentasi API ini akan terus diperbarui seiring dengan pengembangan sistem. Fitur-fitur baru akan ditambahkan sesuai kebutuhan.

## Informasi Kontak

Jika Anda memiliki pertanyaan atau masalah terkait API ini, silakan hubungi tim pengembangan Samudra ERP di:

- Email: developer@samudra-erp.com
- Telepon: 021-1234567#   s a m u d r a - a p i  
 