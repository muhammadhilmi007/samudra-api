const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  HOST: process.env.HOST || 'localhost',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/samudra-erp',
  JWT_SECRET: process.env.JWT_SECRET || 'samudra_secret_key_dev',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE || 24,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FILE_UPLOAD_PATH: 'uploads',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Definisi status untuk berbagai entity
  STATUS: {
    PICKUP_REQUEST: {
      PENDING: 'PENDING',
      FINISH: 'FINISH'
    },
    STT: {
      PENDING: 'PENDING',
      MUAT: 'MUAT',
      TRANSIT: 'TRANSIT',
      LANSIR: 'LANSIR',
      TERKIRIM: 'TERKIRIM',
      RETURN: 'RETURN'
    },
    TRUCK_QUEUE: {
      MENUNGGU: 'MENUNGGU',
      MUAT: 'MUAT',
      BERANGKAT: 'BERANGKAT'
    },
    LOADING: {
      MUAT: 'MUAT',
      BERANGKAT: 'BERANGKAT',
      SAMPAI: 'SAMPAI'
    },
    VEHICLE_QUEUE: {
      MENUNGGU: 'MENUNGGU',
      LANSIR: 'LANSIR',
      KEMBALI: 'KEMBALI'
    },
    DELIVERY: {
      LANSIR: 'LANSIR',
      TERKIRIM: 'TERKIRIM',
      BELUM_SELESAI: 'BELUM SELESAI'
    },
    RETURN: {
      PROSES: 'PROSES',
      SAMPAI: 'SAMPAI'
    },
    COLLECTION: {
      LUNAS: 'LUNAS',
      BELUM_LUNAS: 'BELUM LUNAS'
    },
    JOURNAL: {
      DRAFT: 'DRAFT',
      FINAL: 'FINAL'
    },
    BANK_STATEMENT: {
      VALIDATED: 'VALIDATED',
      UNVALIDATED: 'UNVALIDATED'
    },
    HEADQUARTER_CASH: {
      DRAFT: 'DRAFT',
      MERGED: 'MERGED'
    },
    ASSET: {
      AKTIF: 'AKTIF',
      DIJUAL: 'DIJUAL',
      RUSAK: 'RUSAK'
    },
    PENDING_PACKAGE: {
      PENDING: 'PENDING',
      RESOLVED: 'RESOLVED'
    }
  },
  
  // Tipe pembayaran
  PAYMENT_TYPE: {
    CASH: 'CASH',
    COD: 'COD',
    CAD: 'CAD'
  },
  
  // Kode penerus
  KODE_PENERUS: {
    NO_FORWARDING: '70',
    PAID_BY_SENDER: '71',
    PAID_BY_RECIPIENT: '72',
    ADVANCED_BY_RECIPIENT_BRANCH: '73'
  }
};