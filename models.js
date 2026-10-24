const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true }));

const productSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, default: '', maxlength: 5000 },
  price: { type: Number, required: true, min: 0, max: 100000000 },
  stock: { type: Number, required: true, min: 0, max: 1000000, default: 0 },
  category: { type: String, default: 'General', maxlength: 120 },
  gender: { type: String, default: '', maxlength: 30 },
  brand: { type: String, default: 'StyleStreet Edit', maxlength: 120 },
  image: { type: String, default: '' },
  images: { type: [String], default: [] },
  mrp: { type: Number, min: 0, max: 100000000 },
  discountPercent: { type: Number, min: 0, max: 100 },
  sourceUrl: { type: String, default: '', maxlength: 1000 },
  sourceName: { type: String, default: '', maxlength: 120 },
  externalId: { type: String, unique: true, sparse: true },
}, { timestamps: true });
productSchema.index({ name: 1 });
productSchema.index({ category: 1, gender: 1 });
productSchema.index({ externalId: 1 }, { unique: true, sparse: true });
const Product = mongoose.model('Product', productSchema);

const Order = mongoose.model('Order', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, maxlength: 180 },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 100 },
  }],
  total: { type: Number, required: true, min: 0 },
  address: { type: String, required: true, minlength: 10, maxlength: 500, trim: true },
  status: { type: String, enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
}, { timestamps: true });
const orderSchema = Order.schema;
orderSchema.index({ user: 1, createdAt: -1 });

module.exports = { User, Product, Order };
