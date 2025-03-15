const multer = require('multer');
const path = require('path');

// Konfigurasi penyimpanan
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  }
});

// Filter file yang diupload
const fileFilter = (req, file, cb) => {
  // Daftar tipe file yang diizinkan
  const fileTypes = /jpeg|jpg|png|pdf/;
  // Cek ekstensi file
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  // Cek mime type
  const mimetype = fileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Tipe file tidak didukung! Hanya jpeg, jpg, png, dan pdf yang diperbolehkan.'));
  }
};

// Inisialisasi multer
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// Middleware untuk upload file tunggal
exports.uploadSingle = (fieldName) => upload.single(fieldName);

// Middleware untuk upload beberapa file
exports.uploadMultiple = (fieldName, maxCount) => upload.array(fieldName, maxCount);

// Middleware untuk upload beberapa field
exports.uploadFields = (fields) => upload.fields(fields);