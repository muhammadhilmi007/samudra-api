const mongoose = require('mongoose');

const DivisionSchema = new mongoose.Schema({
  namaDivisi: {
    type: String,
    required: [true, 'Nama divisi harus diisi'],
    unique: true,
    trim: true
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
DivisionSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('Division', DivisionSchema);