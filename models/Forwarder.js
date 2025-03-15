const mongoose = require('mongoose');

const ForwarderSchema = new mongoose.Schema({
  namaPenerus: {
    type: String,
    required: [true, 'Nama penerus harus diisi'],
    trim: true
  },
  alamat: {
    type: String,
    required: [true, 'Alamat harus diisi']
  },
  telepon: {
    type: String,
    required: [true, 'Telepon harus diisi']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Email tidak valid'
    ]
  },
  kontakPerson: {
    type: String,
    required: [true, 'Kontak person harus diisi']
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
ForwarderSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('Forwarder', ForwarderSchema);