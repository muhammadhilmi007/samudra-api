// models/Role.js
const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  namaRole: {
    type: String,
    required: [true, 'Nama role harus diisi'],
    unique: true,
    trim: true
  },
  permissions: {
    type: [String],
    required: true,
    default: []
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

// Update updatedAt on update
RoleSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('Role', RoleSchema);