const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true }));

const Product = mongoose.model('Product', new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  category: { type: String, default: 'General' },
  gender: { type: String, default: '' },
  brand: { type: String, default: 'StyleStreet Edit' },
  image: { type: String, default: '' },
  images: { type: [String], default: [] },
  mrp: { type: Number, min: 0 },
  discountPercent: { type: Number, min: 0, max: 100 },
  sourceUrl: { type: String, default: '' },
  sourceName: { type: String, default: '' },
  externalId: { type: String, unique: true, sparse: true },
}, { timestamps: true }));

const Order = mongoose.model('Order', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: String, price: Number, qty: Number,
  }],
  total: { type: Number, required: true },
  address: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
}, { timestamps: true }));

module.exports = { User, Product, Order };
