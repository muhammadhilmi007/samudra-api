const mongoose = require('mongoose');

const DivisionSchema = new mongoose.Schema({
  namaDivisi: {
    type: String,
    required: [true, 'Nama divisi harus diisi'],
    unique: true,
    trim: true
  }
}, {
  timestamps: true // Use mongoose timestamps
});
module.exports = mongoose.model('Division', DivisionSchema);