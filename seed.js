require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Product } = require('./models');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({ email: { $in: ['admin@shop.com', 'user@shop.com'] } });
  await User.create([
    { name: 'Admin', email: 'admin@shop.com', password: await bcrypt.hash('admin123', 10), role: 'admin' },
    { name: 'Demo User', email: 'user@shop.com', password: await bcrypt.hash('user123', 10) },
  ]);
  if (!(await Product.countDocuments())) {
    await Product.create([
      { name: 'Wireless Headphones', description: 'Over-ear, 30h battery', price: 2499, stock: 25, category: 'Electronics' },
      { name: 'Cotton T-Shirt', description: 'Soft, regular fit', price: 499, stock: 100, category: 'Clothing' },
      { name: 'Steel Water Bottle', description: '750ml insulated', price: 699, stock: 60, category: 'Home' },
      { name: 'Notebook Pack', description: 'Set of 3, ruled', price: 249, stock: 150, category: 'Stationery' },
    ]);
  }
  console.log('Seeded. Admin: admin@shop.com / admin123 | User: user@shop.com / user123');
  process.exit(0);
})();
