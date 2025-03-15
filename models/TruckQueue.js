const mongoose = require('mongoose');

const TruckQueueSchema = new mongoose.Schema({
  truckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Truck harus diisi']
  },
  supirId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Supir harus diisi']
  },
  noTelp: {
    type: String,
    required: [true, 'Nomor telepon harus diisi']
  },
  kenekId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  noTelpKenek: {
    type: String
  },
  urutan: {
    type: Number,
    required: [true, 'Urutan harus diisi']
  },
  status: {
    type: String,
    enum: ['MENUNGGU', 'MUAT', 'BERANGKAT'],
    default: 'MENUNGGU'
  },
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang harus diisi']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Pembuat harus diisi']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt pada update
TruckQueueSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Otomatis mengatur urutan saat menyimpan truk baru dalam antrian
TruckQueueSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Cari urutan terakhir untuk cabang tertentu
      const lastQueue = await this.constructor.findOne({
        cabangId: this.cabangId
      }).sort({ urutan: -1 });
      
      if (lastQueue) {
        this.urutan = lastQueue.urutan + 1;
      } else {
        this.urutan = 1;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('TruckQueue', TruckQueueSchema);