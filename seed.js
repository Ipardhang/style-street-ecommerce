require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Product } = require('./models');

(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
    await mongoose.connect(process.env.MONGO_URI);
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    await User.findOneAndUpdate(
      { email },
      { name: 'Administrator', email, password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: 'admin' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin bootstrap.');
  }

  if (!(await Product.countDocuments())) {
    await Product.create([
      { name: 'Oversized Cotton Tee', description: 'Heavyweight relaxed streetwear fit', price: 799, stock: 100, category: 'Clothing', gender: 'men' },
      { name: 'Utility Cargo Pants', description: 'Relaxed fit with utility pockets', price: 1499, stock: 60, category: 'Clothing', gender: 'men' },
      { name: 'Everyday Crossbody Bag', description: 'Compact everyday street accessory', price: 999, stock: 40, category: 'Accessories' },
      { name: 'Classic Sneakers', description: 'Clean everyday sneaker silhouette', price: 1999, stock: 50, category: 'Shoes' }
    ]);
  }
  console.log('Seed completed.');
  await mongoose.disconnect();
})().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
