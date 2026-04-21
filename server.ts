import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, updateDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for the server
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function checkAndSendReports() {
  try {
    console.log("Checking for scheduled reports...");
    const schedulesRef = collection(db, "report_schedules");
    const snapshot = await getDocs(schedulesRef);
    
    const now = new Date();

    for (const scheduleDoc of snapshot.docs) {
      const schedule = scheduleDoc.data();
      const lastSent = schedule.last_sent?.toDate ? schedule.last_sent.toDate() : new Date(0);
      const type = schedule.type;
      const email = schedule.email;
      const uid = schedule.uid;

      if (!type || !email || !uid) continue;

      let shouldSend = false;
      const hoursSinceLast = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

      if (type === 'daily' && hoursSinceLast >= 24) {
        shouldSend = true;
      } else if (type === 'weekly' && hoursSinceLast >= 24 * 7) {
        shouldSend = true;
      } else if (type === 'monthly' && hoursSinceLast >= 24 * 30) {
        shouldSend = true;
      }

      if (shouldSend) {
        console.log(`Generating ${type} report for ${email}...`);
        
        // Fetch data for the report - Simplify query to avoid index requirement for where + orderBy
        const salesRef = collection(db, "sales");
        const q = query(salesRef, where("uid", "==", uid));
        const salesSnap = await getDocs(q);
        
        // Sort in memory instead
        const sales = salesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => {
            const dateA = a.sale_date?.toDate ? a.sale_date.toDate() : new Date(a.sale_date || 0);
            const dateB = b.sale_date?.toDate ? b.sale_date.toDate() : new Date(b.sale_date || 0);
            return dateB.getTime() - dateA.getTime();
          });

        // Filter by period (e.g., only last day for daily)
        const periodMs = type === 'daily' ? 24 * 60 * 60 * 1000 : type === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        const recentSales = sales.filter((s: any) => {
          const sDate = s.sale_date?.toDate ? s.sale_date.toDate() : new Date(s.sale_date || 0);
          return now.getTime() - sDate.getTime() <= periodMs;
        });

        const totalRevenue = recentSales.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);
        const totalProfit = recentSales.reduce((sum: number, s: any) => sum + (Number(s.total_profit) || 0), 0);
        
        const reportBody = `
          SmartStock ${type.toUpperCase()} REPORT
          Period: Last ${type === 'daily' ? '24 Hours' : type === 'weekly' ? '7 Days' : '30 Days'}
          Generated: ${now.toLocaleString()}
          
          Total Revenue: $${totalRevenue.toFixed(2)}
          Total Profit: $${totalProfit.toFixed(2)}
          Sales in Period: ${recentSales.length}
          
          Thank you for using SmartStock!
        `;

        console.log(`--- SIMULATED EMAIL TO ${email} ---`);
        console.log(reportBody);
        console.log(`----------------------------------`);
        
        // Update last_sent
        await updateDoc(doc(db, "report_schedules", scheduleDoc.id), {
          last_sent: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error("Error in checkAndSendReports:", error);
  }
}

// Every hour
cron.schedule("0 * * * *", () => {
  checkAndSendReports().catch(console.error);
});

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.use(express.json());

    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    // Manual trigger for testing
    app.post("/api/admin/trigger-reports", async (req, res) => {
      try {
        await checkAndSendReports();
        res.json({ status: "triggered" });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

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
      // Safety check: run initial check after server starts
      checkAndSendReports().catch(err => console.error("Initial report check failed:", err));
    });
  } catch (err) {
    console.error("Critical server startup failure:", err);
    process.exit(1);
  }
}

startServer();
