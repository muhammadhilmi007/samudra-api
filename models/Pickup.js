const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['PENDING', 'BERANGKAT', 'SELESAI', 'CANCELLED'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
});

const pickupSchema = new mongoose.Schema({
  noPengambilan: {
    type: String,
    required: true,
    unique: true
  },
  tanggal: {
    type: Date,
    required: true,
    default: Date.now
  },
  pengirimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  alamatPengambilan: {
    type: String,
    required: true,
    minlength: [10, 'Alamat pengambilan minimal 10 karakter'],
    maxlength: [500, 'Alamat pengambilan maksimal 500 karakter']
  },
  tujuan: {
    type: String,
    required: true,
    minlength: [3, 'Tujuan minimal 3 karakter'],
    maxlength: [200, 'Tujuan maksimal 200 karakter']
  },
  jumlahColly: {
    type: Number,
    required: true,
    min: [1, 'Jumlah colly harus lebih dari 0'],
    max: [1000, 'Jumlah colly maksimal 1000']
  },
  supirId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  kenekId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  kendaraanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  estimasiPengambilan: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Estimasi pengambilan harus lebih dari waktu sekarang'
    }
  },
  waktuBerangkat: Date,
  waktuPulang: Date,
  status: {
    type: String,
    enum: ['PENDING', 'BERANGKAT', 'SELESAI', 'CANCELLED'],
    default: 'PENDING'
  },
  statusHistory: [statusHistorySchema],
  notes: {
    type: String,
    maxlength: [1000, 'Catatan maksimal 1000 karakter']
  },
  sttIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT'
  }],
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupRequest'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
pickupSchema.index({ noPengambilan: 1 });
pickupSchema.index({ status: 1 });
pickupSchema.index({ pengirimId: 1 });
pickupSchema.index({ supirId: 1 });
pickupSchema.index({ kendaraanId: 1 });
pickupSchema.index({ cabangId: 1 });
pickupSchema.index({ tanggal: 1 });

// Virtual field for total STTs
pickupSchema.virtual('totalSTT').get(function() {
  return this.sttIds ? this.sttIds.length : 0;
});

// Pre-save middleware to validate status transitions
pickupSchema.pre('save', async function(next) {
  if (!this.isModified('status')) return next();

  const validTransitions = {
    'PENDING': ['BERANGKAT', 'CANCELLED'],
    'BERANGKAT': ['SELESAI', 'CANCELLED'],
    'SELESAI': ['CANCELLED'],
    'CANCELLED': ['PENDING']
  };

  if (this.isNew) {
    if (this.status !== 'PENDING') {
      throw new Error('Status awal harus PENDING');
    }
  } else {
    const oldDoc = await this.constructor.findById(this._id);
    if (!validTransitions[oldDoc.status]?.includes(this.status)) {
      throw new Error(`Tidak dapat mengubah status dari ${oldDoc.status} ke ${this.status}`);
    }
  }

  next();
});

// Pre-save middleware to validate vehicle and driver availability
pickupSchema.pre('save', async function(next) {
  if (!this.isModified('status') || this.status !== 'BERANGKAT') return next();

  const activePickup = await this.constructor.findOne({
    _id: { $ne: this._id },
    $or: [
      { kendaraanId: this.kendaraanId, status: 'BERANGKAT' },
      { supirId: this.supirId, status: 'BERANGKAT' }
    ]
  });

  if (activePickup) {
    throw new Error(
      activePickup.kendaraanId.equals(this.kendaraanId)
        ? 'Kendaraan sedang digunakan dalam pengambilan lain'
        : 'Supir sedang bertugas dalam pengambilan lain'
    );
  }

  next();
});

module.exports = mongoose.model('Pickup', pickupSchema);