const { z } = require('zod');

// User validation schema
exports.userSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter'),
  jabatan: z.string().min(1, 'Jabatan harus diisi'),
  role: z.enum([
    'direktur',
    'manajer_admin',
    'manajer_keuangan',
    'manajer_pemasaran',
    'manajer_operasional',
    'manajer_sdm',
    'manajer_distribusi',
    'kepala_cabang',
    'kepala_gudang',
    'staff_admin',
    'staff_penjualan',
    'kasir',
    'debt_collector',
    'checker',
    'supir',
    'pelanggan'
  ]),
  email: z.string().email('Email tidak valid'),
  telepon: z.string().min(8, 'Telepon minimal 8 karakter'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
  fotoProfil: z.string().optional(),
  dokumen: z.object({
    ktp: z.string().optional(),
    npwp: z.string().optional(),
    lainnya: z.array(z.string()).optional()
  }).optional(),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  cabangId: z.string().min(1, 'Cabang harus diisi'),
  aktif: z.boolean().optional().default(true)
});

// Division validation schema
exports.divisionSchema = z.object({
  namaDivisi: z.string().min(2, 'Nama divisi minimal 2 karakter')
});

// Branch validation schema
exports.branchSchema = z.object({
  namaCabang: z.string().min(2, 'Nama cabang minimal 2 karakter'),
  divisiId: z.string().min(1, 'Divisi harus diisi'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
  kelurahan: z.string().min(2, 'Kelurahan minimal 2 karakter'),
  kecamatan: z.string().min(2, 'Kecamatan minimal 2 karakter'),
  kota: z.string().min(2, 'Kota minimal 2 karakter'),
  provinsi: z.string().min(2, 'Provinsi minimal 2 karakter'),
  kontakPenanggungJawab: z.object({
    nama: z.string().min(3, 'Nama penanggung jawab minimal 3 karakter'),
    telepon: z.string().min(8, 'Telepon minimal 8 karakter'),
    email: z.string().email('Email tidak valid').optional()
  })
});

// Customer validation schema
exports.customerSchema = z.object({
  nama: z.string().min(3, 'Nama pelanggan minimal 3 karakter'),
  tipe: z.enum(['pengirim', 'penerima', 'keduanya']),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
  kelurahan: z.string().optional().default(''),
  kecamatan: z.string().optional().default(''),
  kota: z.string().min(2, 'Kota minimal 2 karakter'),
  provinsi: z.string().min(2, 'Provinsi minimal 2 karakter'),
  telepon: z.string().min(8, 'Telepon minimal 8 karakter'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  perusahaan: z.string().optional().default(''),
  cabangId: z.string().min(1, 'Cabang harus diisi')
});

// Vehicle validation schema
exports.vehicleSchema = z.object({
  noPolisi: z.string().min(4, 'Nomor polisi minimal 4 karakter'),
  namaKendaraan: z.string().min(2, 'Nama kendaraan minimal 2 karakter'),
  supirId: z.string().optional(),
  noTeleponSupir: z.string().min(8, 'Nomor telepon supir minimal 8 karakter').optional(),
  noKTPSupir: z.string().min(16, 'Nomor KTP supir minimal 16 karakter').optional(),
  fotoKTPSupir: z.string().optional(),
  fotoSupir: z.string().optional(),
  alamatSupir: z.string().optional(),
  kenekId: z.string().optional(),
  noTeleponKenek: z.string().min(8, 'Nomor telepon kenek minimal 8 karakter').optional(),
  noKTPKenek: z.string().min(16, 'Nomor KTP kenek minimal 16 karakter').optional(),
  fotoKTPKenek: z.string().optional(),
  fotoKenek: z.string().optional(),
  alamatKenek: z.string().optional(),
  cabangId: z.string().min(1, 'Cabang harus diisi'),
  tipe: z.enum(['lansir', 'antar_cabang']),
  grup: z.string().optional()
});

// PickupRequest validation schema
exports.pickupRequestSchema = z.object({
  tanggal: z.string().or(z.date()).optional(),
  pengirimId: z.string().min(1, 'Pengirim harus diisi'),
  alamatPengambilan: z.string().min(5, 'Alamat pengambilan minimal 5 karakter'),
  tujuan: z.string().min(2, 'Tujuan minimal 2 karakter'),
  jumlahColly: z.number().min(1, 'Jumlah colly minimal 1'),
  status: z.enum(['PENDING', 'FINISH']).optional()
});

// Pickup validation schema
exports.pickupSchema = z.object({
  tanggal: z.string().or(z.date()).optional(),
  pengirimId: z.string().min(1, 'Pengirim harus diisi'),
  sttIds: z.array(z.string()).optional(),
  supirId: z.string().min(1, 'Supir harus diisi'),
  kenekId: z.string().optional(),
  kendaraanId: z.string().min(1, 'Kendaraan harus diisi'),
  waktuBerangkat: z.string().or(z.date()).optional(),
  waktuPulang: z.string().or(z.date()).optional(),
  estimasiPengambilan: z.string().optional()
});

// STT validation schema
exports.sttSchema = z.object({
  cabangAsalId: z.string().min(1, 'Cabang asal harus diisi'),
  cabangTujuanId: z.string().min(1, 'Cabang tujuan harus diisi'),
  pengirimId: z.string().min(1, 'Pengirim harus diisi'),
  penerimaId: z.string().min(1, 'Penerima harus diisi'),
  namaBarang: z.string().min(2, 'Nama barang minimal 2 karakter'),
  komoditi: z.string().min(2, 'Komoditi minimal 2 karakter'),
  packing: z.string().min(2, 'Packing minimal 2 karakter'),
  jumlahColly: z.number().min(1, 'Jumlah colly minimal 1'),
  berat: z.number().min(0.1, 'Berat minimal 0.1 kg'),
  hargaPerKilo: z.number().min(0, 'Harga per kilo tidak boleh negatif'),
  harga: z.number().min(0, 'Harga tidak boleh negatif').optional(),
  keterangan: z.string().optional(),
  kodePenerus: z.enum(['70', '71', '72', '73']).optional(),
  penerusId: z.string().optional(),
  paymentType: z.enum(['CASH', 'COD', 'CAD']),
  status: z.enum(['PENDING', 'MUAT', 'TRANSIT', 'LANSIR', 'TERKIRIM', 'RETURN']).optional()
});

// TruckQueue validation schema
exports.truckQueueSchema = z.object({
  truckId: z.string().min(1, 'Truck harus diisi'),
  supirId: z.string().min(1, 'Supir harus diisi'),
  noTelp: z.string().min(8, 'Nomor telepon minimal 8 karakter'),
  kenekId: z.string().optional(),
  noTelpKenek: z.string().optional(),
  urutan: z.number().optional(),
  status: z.enum(['MENUNGGU', 'MUAT', 'BERANGKAT']).optional()
});

// Loading validation schema
exports.loadingSchema = z.object({
  sttIds: z.array(z.string()).min(1, 'STT harus diisi minimal 1'),
  antrianTruckId: z.string().min(1, 'Antrian truck harus diisi'),
  checkerId: z.string().min(1, 'Checker harus diisi'),
  waktuBerangkat: z.string().or(z.date()).optional(),
  waktuSampai: z.string().or(z.date()).optional(),
  keterangan: z.string().optional(),
  status: z.enum(['MUAT', 'BERANGKAT', 'SAMPAI']).optional(),
  cabangMuatId: z.string().min(1, 'Cabang muat harus diisi'),
  cabangBongkarId: z.string().min(1, 'Cabang bongkar harus diisi')
});

// VehicleQueue validation schema
exports.vehicleQueueSchema = z.object({
  kendaraanId: z.string().min(1, 'Kendaraan harus diisi'),
  supirId: z.string().min(1, 'Supir harus diisi'),
  kenekId: z.string().optional(),
  urutan: z.number().optional(),
  status: z.enum(['MENUNGGU', 'LANSIR', 'KEMBALI']).optional()
});

// Delivery validation schema
exports.deliverySchema = z.object({
  sttIds: z.array(z.string()).min(1, 'STT harus diisi minimal 1'),
  antrianKendaraanId: z.string().min(1, 'Antrian kendaraan harus diisi'),
  checkerId: z.string().min(1, 'Checker harus diisi'),
  adminId: z.string().min(1, 'Admin harus diisi'),
  berangkat: z.string().or(z.date()).optional(),
  sampai: z.string().or(z.date()).optional(),
  estimasiLansir: z.string().optional(),
  kilometerBerangkat: z.number().optional(),
  kilometerPulang: z.number().optional(),
  namaPenerima: z.string().optional(),
  keterangan: z.string().optional(),
  status: z.enum(['LANSIR', 'TERKIRIM', 'BELUM SELESAI']).optional()
});

// Return validation schema
exports.returnSchema = z.object({
  sttIds: z.array(z.string()).min(1, 'STT harus diisi minimal 1'),
  tanggalKirim: z.string().or(z.date()).optional(),
  tanggalSampai: z.string().or(z.date()).optional(),
  tandaTerima: z.string().optional(),
  status: z.enum(['PROSES', 'SAMPAI']).optional()
});

// Collection validation schema
exports.collectionSchema = z.object({
  pelangganId: z.string().min(1, 'Pelanggan harus diisi'),
  tipePelanggan: z.enum(['Pengirim', 'Penerima']),
  sttIds: z.array(z.string()).min(1, 'STT harus diisi minimal 1'),
  overdue: z.boolean().optional(),
  tanggalBayar: z.string().or(z.date()).optional(),
  jumlahBayarTermin: z.array(
    z.object({
      termin: z.number(),
      tanggal: z.string().or(z.date()),
      jumlah: z.number().min(0, 'Jumlah bayar tidak boleh negatif')
    })
  ).optional(),
  status: z.enum(['LUNAS', 'BELUM LUNAS']).optional(),
  totalTagihan: z.number().min(0, 'Total tagihan tidak boleh negatif')
});

// Account validation schema
exports.accountSchema = z.object({
  kodeAccount: z.string().min(2, 'Kode akun minimal 2 karakter'),
  namaAccount: z.string().min(2, 'Nama akun minimal 2 karakter'),
  tipeAccount: z.enum(['Pendapatan', 'Biaya', 'Aset', 'Kewajiban', 'Ekuitas']),
  deskripsi: z.string().optional()
});

// Journal validation schema
exports.journalSchema = z.object({
  tanggal: z.string().or(z.date()),
  accountId: z.string().min(1, 'Akun harus diisi'),
  cabangId: z.string().min(1, 'Cabang harus diisi'),
  keterangan: z.string().min(2, 'Keterangan minimal 2 karakter'),
  debet: z.number().min(0, 'Debet tidak boleh negatif'),
  kredit: z.number().min(0, 'Kredit tidak boleh negatif'),
  tipe: z.enum(['Lokal', 'Pusat']),
  sttIds: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'FINAL']).optional()
});

// BranchCash validation schema
exports.branchCashSchema = z.object({
  tanggal: z.string().or(z.date()),
  tipeKas: z.enum(['Awal', 'Akhir', 'Kecil', 'Rekening', 'Tangan']),
  cabangId: z.string().min(1, 'Cabang harus diisi'),
  keterangan: z.string().min(2, 'Keterangan minimal 2 karakter'),
  debet: z.number().min(0, 'Debet tidak boleh negatif'),
  kredit: z.number().min(0, 'Kredit tidak boleh negatif'),
  saldo: z.number()
});

// HeadquarterCash validation schema
exports.headquarterCashSchema = z.object({
  tanggal: z.string().or(z.date()),
  tipeKas: z.enum(['Awal', 'Akhir', 'Kecil', 'Rekening', 'Ditangan', 'Bantuan']),
  keterangan: z.string().min(2, 'Keterangan minimal 2 karakter'),
  debet: z.number().min(0, 'Debet tidak boleh negatif'),
  kredit: z.number().min(0, 'Kredit tidak boleh negatif'),
  saldo: z.number(),
  status: z.enum(['DRAFT', 'MERGED']).optional()
});

// BankStatement validation schema
exports.bankStatementSchema = z.object({
  tanggal: z.string().or(z.date()),
  bank: z.string().min(2, 'Bank minimal 2 karakter'),
  noRekening: z.string().min(5, 'Nomor rekening minimal 5 karakter'),
  keterangan: z.string().min(2, 'Keterangan minimal 2 karakter'),
  debet: z.number().min(0, 'Debet tidak boleh negatif'),
  kredit: z.number().min(0, 'Kredit tidak boleh negatif'),
  saldo: z.number(),
  status: z.enum(['VALIDATED', 'UNVALIDATED']).optional(),
  cabangId: z.string().min(1, 'Cabang harus diisi')
});

// Asset validation schema
exports.assetSchema = z.object({
  namaAset: z.string().min(2, 'Nama aset minimal 2 karakter'),
  tipeAset: z.string().min(2, 'Tipe aset minimal 2 karakter'),
  tanggalPembelian: z.string().or(z.date()),
  nilaiPembelian: z.number().min(0, 'Nilai pembelian tidak boleh negatif'),
  nilaiSekarang: z.number().min(0, 'Nilai sekarang tidak boleh negatif'),
  persentasePenyusutan: z.number().min(0, 'Persentase penyusutan tidak boleh negatif').max(100, 'Persentase penyusutan tidak boleh lebih dari 100%'),
  statusAset: z.enum(['AKTIF', 'DIJUAL', 'RUSAK']).optional(),
  lokasiAset: z.string().min(2, 'Lokasi aset minimal 2 karakter')
});

// PendingPackage validation schema
exports.pendingPackageSchema = z.object({
  sttId: z.string().min(1, 'STT harus diisi'),
  cabangAsalId: z.string().min(1, 'Cabang asal harus diisi'),
  cabangTujuanId: z.string().min(1, 'Cabang tujuan harus diisi'),
  alasanPending: z.string().min(5, 'Alasan pending minimal 5 karakter'),
  action: z.string().min(5, 'Tindakan minimal 5 karakter'),
  status: z.enum(['PENDING', 'RESOLVED']).optional()
});

// Forwarder validation schema
exports.forwarderSchema = z.object({
  namaPenerus: z.string().min(2, 'Nama penerus minimal 2 karakter'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
  telepon: z.string().min(8, 'Telepon minimal 8 karakter'),
  email: z.string().email('Email tidak valid').optional(),
  kontakPerson: z.string().min(2, 'Kontak person minimal 2 karakter')
});

// Auth validation schema
exports.loginSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter')
});

exports.changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Password lama minimal 6 karakter'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter')
});

// Helper function to validate with Zod and format errors
exports.validate = (schema, data) => {
  try {
    schema.parse(data);
    return { valid: true, errors: null };
  } catch (error) {
    const formattedErrors = {};
    error.errors.forEach((err) => {
      formattedErrors[err.path[0]] = err.message;
    });
    return { valid: false, errors: formattedErrors };
  }
};

// utils/validators.js (add to existing file)

// Traditional validator for customer creation and update
const customerValidationRules = {
  nama: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Nama pelanggan tidak boleh kosong'
    },
    trim: true,
    escape: true
  },
  tipe: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Tipe pelanggan tidak boleh kosong'
    },
    isIn: {
      options: [['pengirim', 'penerima', 'keduanya', 'Pengirim', 'Penerima', 'Keduanya']],
      errorMessage: 'Tipe pelanggan harus berupa pengirim, penerima, atau keduanya'
    },
    customSanitizer: {
      options: (value) => {
        return value.toLowerCase();
      }
    }
  },
  alamat: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Alamat tidak boleh kosong'
    },
    trim: true
  },
  kelurahan: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Kelurahan tidak boleh kosong'
    },
    trim: true
  },
  kecamatan: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Kecamatan tidak boleh kosong'
    },
    trim: true
  },
  kota: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Kota tidak boleh kosong'
    },
    trim: true
  },
  provinsi: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Provinsi tidak boleh kosong'
    },
    trim: true
  },
  telepon: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Telepon tidak boleh kosong'
    },
    trim: true
  },
  email: {
    in: ['body'],
    optional: { options: { nullable: true, checkFalsy: true } },
    isEmail: {
      errorMessage: 'Email tidak valid'
    },
    normalizeEmail: true
  },
  perusahaan: {
    in: ['body'],
    optional: { options: { nullable: true, checkFalsy: true } },
    trim: true
  },
  cabangId: {
    in: ['body'],
    optional: { options: { nullable: false } },
    isMongoId: {
      errorMessage: 'Format cabangId tidak valid'
    }
  }
};

// utils/validators.js (add to existing file)

// Validator for STT creation and update
const sttSchema = {
  cabangAsalId: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Cabang asal tidak boleh kosong'
    },
    isMongoId: {
      errorMessage: 'Format cabang asal tidak valid'
    }
  },
  cabangTujuanId: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Cabang tujuan tidak boleh kosong'
    },
    isMongoId: {
      errorMessage: 'Format cabang tujuan tidak valid'
    }
  },
  pengirimId: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Pengirim tidak boleh kosong'
    },
    isMongoId: {
      errorMessage: 'Format pengirim tidak valid'
    }
  },
  penerimaId: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Penerima tidak boleh kosong'
    },
    isMongoId: {
      errorMessage: 'Format penerima tidak valid'
    }
  },
  namaBarang: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Nama barang tidak boleh kosong'
    },
    trim: true
  },
  komoditi: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Komoditi tidak boleh kosong'
    },
    trim: true
  },
  packing: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Packing tidak boleh kosong'
    },
    trim: true
  },
  jumlahColly: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Jumlah colly tidak boleh kosong'
    },
    isInt: {
      options: { min: 1 },
      errorMessage: 'Jumlah colly minimal 1'
    },
    toInt: true
  },
  berat: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Berat tidak boleh kosong'
    },
    isFloat: {
      options: { min: 0.1 },
      errorMessage: 'Berat minimal 0.1 kg'
    },
    toFloat: true
  },
  hargaPerKilo: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Harga per kilo tidak boleh kosong'
    },
    isFloat: {
      options: { min: 0 },
      errorMessage: 'Harga per kilo minimal 0'
    },
    toFloat: true
  },
  harga: {
    in: ['body'],
    optional: { options: { nullable: true } },
    isFloat: {
      options: { min: 0 },
      errorMessage: 'Harga minimal 0'
    },
    toFloat: true
  },
  keterangan: {
    in: ['body'],
    optional: { options: { nullable: true } },
    trim: true
  },
  kodePenerus: {
    in: ['body'],
    optional: { options: { nullable: false, checkFalsy: true } },
    isIn: {
      options: [['70', '71', '72', '73']],
      errorMessage: 'Kode penerus tidak valid'
    },
    default: '70'
  },
  penerusId: {
    in: ['body'],
    optional: { options: { nullable: true } },
    isMongoId: {
      errorMessage: 'Format penerus tidak valid'
    }
  },
  paymentType: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Tipe pembayaran tidak boleh kosong'
    },
    isIn: {
      options: [['CASH', 'COD', 'CAD']],
      errorMessage: 'Tipe pembayaran tidak valid (CASH/COD/CAD)'
    }
  }
};

// Validator for STT status update
const statusUpdateSchema = {
  status: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Status tidak boleh kosong'
    },
    isIn: {
      options: [['PENDING', 'MUAT', 'TRANSIT', 'LANSIR', 'TERKIRIM', 'RETURN']],
      errorMessage: 'Status tidak valid'
    }
  },
  keterangan: {
    in: ['body'],
    optional: { options: { nullable: true } },
    trim: true
  },
  location: {
    in: ['body'],
    optional: { options: { nullable: true } },
    trim: true
  }
};



// Export validators
module.exports = {
  sttSchema,
  statusUpdateSchema,
  customerSchema: exports.customerSchema,  // Export the Zod schema
  customerValidationRules  // Export the traditional validation rules
};