import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("smartstock.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'assistant', 'viewer')) DEFAULT 'viewer'
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    buying_price REAL,
    selling_price REAL,
    supplier_name TEXT,
    batch_number TEXT,
    expiry_date TEXT,
    arrival_date TEXT,
    image_url TEXT,
    low_stock_threshold INTEGER DEFAULT 5
  );
`);

// Migration: Remove brand constraint if it exists
const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'").get();
if (tableInfo && tableInfo.sql.includes("CHECK(brand IN")) {
  console.log("Migrating products table to remove brand constraint...");
  db.transaction(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      ALTER TABLE products RENAME TO products_old;
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        quantity INTEGER DEFAULT 0,
        buying_price REAL,
        selling_price REAL,
        supplier_name TEXT,
        batch_number TEXT,
        expiry_date TEXT,
        arrival_date TEXT,
        image_url TEXT,
        low_stock_threshold INTEGER DEFAULT 5
      );
      INSERT INTO products SELECT * FROM products_old;
      DROP TABLE products_old;
      PRAGMA foreign_keys=ON;
    `);
  })();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS social_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    platform TEXT,
    caption TEXT,
    scheduled_at DATETIME,
    status TEXT DEFAULT 'posted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    category TEXT DEFAULT 'Regular'
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    total_amount REAL,
    total_profit REAL,
    payment_method TEXT,
    assistant_id INTEGER,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(assistant_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price REAL,
    unit_profit REAL,
    FOREIGN KEY(sale_id) REFERENCES sales(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, brand, category, quantity, buying_price, selling_price, supplier_name, batch_number, expiry_date, arrival_date, image_url, low_stock_threshold } = req.body;
    const info = db.prepare(`
      INSERT INTO products (name, brand, category, quantity, buying_price, selling_price, supplier_name, batch_number, expiry_date, arrival_date, image_url, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, brand, category, quantity, buying_price, selling_price, supplier_name, batch_number, expiry_date, arrival_date, image_url, low_stock_threshold);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, brand, category, quantity, buying_price, selling_price, supplier_name, batch_number, expiry_date, arrival_date, image_url, low_stock_threshold } = req.body;
    db.prepare(`
      UPDATE products SET 
        name = ?, brand = ?, category = ?, quantity = ?, buying_price = ?, selling_price = ?, 
        supplier_name = ?, batch_number = ?, expiry_date = ?, arrival_date = ?, image_url = ?, low_stock_threshold = ?
      WHERE id = ?
    `).run(name, brand, category, quantity, buying_price, selling_price, supplier_name, batch_number, expiry_date, arrival_date, image_url, low_stock_threshold, id);
    res.json({ success: true });
  });

  app.get("/api/customers", (req, res) => {
    const customers = db.prepare("SELECT * FROM customers").all();
    res.json(customers);
  });

  app.post("/api/customers", (req, res) => {
    const { name, phone, email, address, category } = req.body;
    const info = db.prepare(`
      INSERT INTO customers (name, phone, email, address, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, phone, email, address, category);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/sales", (req, res) => {
    const { customer_id, items, payment_method, assistant_id } = req.body;
    
    const transaction = db.transaction(() => {
      let totalAmount = 0;
      let totalProfit = 0;

      // Calculate totals
      for (const item of items) {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
        if (!product || product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product?.name || 'unknown product'}`);
        }
        totalAmount += item.quantity * product.selling_price;
        totalProfit += item.quantity * (product.selling_price - product.buying_price);
      }

      // Create sale
      const saleInfo = db.prepare(`
        INSERT INTO sales (customer_id, total_amount, total_profit, payment_method, assistant_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(customer_id, totalAmount, totalProfit, payment_method, assistant_id);
      const saleId = saleInfo.lastInsertRowid;

      // Create sale items and update stock
      for (const item of items) {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, unit_profit)
          VALUES (?, ?, ?, ?, ?)
        `).run(saleId, item.product_id, item.quantity, product.selling_price, product.selling_price - product.buying_price);

        db.prepare("UPDATE products SET quantity = quantity - ? WHERE id = ?").run(item.quantity, item.product_id);

        // Check for low stock
        const updatedProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
        if (updatedProduct.quantity <= updatedProduct.low_stock_threshold) {
          db.prepare("INSERT INTO notifications (type, message) VALUES (?, ?)").run(
            'LOW_STOCK', 
            `Product ${updatedProduct.name} is low in stock (${updatedProduct.quantity} left)`
          );
        }
      }
      return saleId;
    });

    try {
      const saleId = transaction();
      res.json({ id: saleId });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/reports/sales", (req, res) => {
    const sales = db.prepare(`
      SELECT s.*, c.name as customer_name 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.sale_date DESC
    `).all();
    res.json(sales);
  });

  app.get("/api/reports/dashboard", (req, res) => {
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get().count;
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE quantity <= low_stock_threshold AND quantity > 0").get().count;
    const outOfStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE quantity = 0").get().count;
    const totalSales = db.prepare("SELECT SUM(total_amount) as total FROM sales").get().total || 0;
    const totalProfit = db.prepare("SELECT SUM(total_profit) as total FROM sales").get().total || 0;

    const salesByDay = db.prepare(`
      SELECT DATE(sale_date) as date, SUM(total_amount) as amount
      FROM sales
      GROUP BY DATE(sale_date)
      ORDER BY date DESC
      LIMIT 7
    `).all();

    res.json({
      stats: { totalProducts, lowStock, outOfStock, totalSales, totalProfit },
      salesByDay: salesByDay.reverse()
    });
  });

  app.get("/api/notifications", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC").all();
    res.json(notifications);
  });

  app.post("/api/notifications/read", (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1").run();
    res.json({ success: true });
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.put("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address, category } = req.body;
    db.prepare(`
      UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, category = ?
      WHERE id = ?
    `).run(name, phone, email, address, category, id);
    res.json({ success: true });
  });

  app.delete("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM customers WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/customers/:id/history", (req, res) => {
    const { id } = req.params;
    const history = db.prepare(`
      SELECT s.*, GROUP_CONCAT(p.name || ' (x' || si.quantity || ')') as items_summary
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      WHERE s.customer_id = ?
      GROUP BY s.id
      ORDER BY s.sale_date DESC
    `).all(id);
    res.json(history);
  });

  app.get("/api/reports/performance", (req, res) => {
    const brandPerformance = db.prepare(`
      SELECT p.brand, SUM(si.unit_price * si.quantity) as revenue, SUM(si.unit_profit * si.quantity) as profit
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.brand
    `).all();

    const categoryPerformance = db.prepare(`
      SELECT p.category, SUM(si.unit_price * si.quantity) as revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.category
      ORDER BY revenue DESC
      LIMIT 5
    `).all();

    const topProducts = db.prepare(`
      SELECT p.name, SUM(si.quantity) as total_sold, SUM(si.unit_price * si.quantity) as revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `).all();

    res.json({ brandPerformance, categoryPerformance, topProducts });
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/ai/caption", async (req, res) => {
    const { productName, brand, price, type } = req.body;
    // Note: In this environment, we call Gemini from frontend as per guidelines.
    // However, if the user wants a "complete app", I'll stick to the frontend call.
    // I'll just leave this as a placeholder or remove it.
    res.status(501).json({ error: "Use frontend Gemini SDK" });
  });

  app.get("/api/social-posts", (req, res) => {
    const posts = db.prepare(`
      SELECT sp.*, p.name as product_name, p.brand as product_brand
      FROM social_posts sp
      JOIN products p ON sp.product_id = p.id
      ORDER BY sp.created_at DESC
    `).all();
    res.json(posts);
  });

  app.post("/api/social-posts", (req, res) => {
    const { product_id, platform, caption, scheduled_at, status } = req.body;
    const info = db.prepare(`
      INSERT INTO social_posts (product_id, platform, caption, scheduled_at, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(product_id, platform, caption, scheduled_at, status || 'posted');
    res.json({ id: info.lastInsertRowid });
  });

  // Background task for scheduled posts
  setInterval(() => {
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE social_posts 
      SET status = 'posted' 
      WHERE status = 'scheduled' AND scheduled_at <= ?
    `).run(now);
    if (result.changes > 0) {
      console.log(`Processed ${result.changes} scheduled posts at ${now}`);
    }
  }, 60000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
