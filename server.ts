import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock API for data upload
  app.post("/api/upload", (req, res) => {
    // In a real app, this would upload to S3
    setTimeout(() => {
      res.json({ 
        success: true, 
        database: "default", 
        table: "uploaded_data_" + Date.now(),
        columns: ["id", "name", "email", "status", "created_at"]
      });
    }, 2000);
  });

  // Mock API for SQL Query
  app.post("/api/query", (req, res) => {
    const { query } = req.body;
    // Simulate query execution
    setTimeout(() => {
      const mockData = [
        { id: 1, name: "John Doe", email: "john@example.com", status: "Active", created_at: "2023-01-01" },
        { id: 2, name: "Jane Smith", email: "jane@example.com", status: "Inactive", created_at: "2023-01-05" },
        { id: 3, name: "Bob Johnson", email: "bob@example.com", status: "Active", created_at: "2023-02-10" },
        { id: 4, name: "Alice Brown", email: "alice@example.com", status: "Pending", created_at: "2023-03-15" },
      ];
      res.json({
        results: mockData,
        executionTime: "0.45s",
        s3Url: "https://s3.amazonaws.com/athenalite-results/query_result_" + Date.now() + ".csv"
      });
    }, 1000);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
