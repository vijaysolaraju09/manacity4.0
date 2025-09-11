const mongoose = require('mongoose');
const ShopSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: String,
  location: String,
  address: String,
  image: String,
  banner: String,
  description: String,
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Shop', ShopSchema);
