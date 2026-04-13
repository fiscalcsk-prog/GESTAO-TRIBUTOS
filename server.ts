import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/move-files", async (req, res) => {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ success: false, message: "Lista de arquivos inválida." });
    }

    const results = [];
    const logDir = path.join(process.cwd(), "logs");
    await fs.mkdir(logDir, { recursive: true });

    for (const file of files) {
      const { id, sourcePath, destPath } = file;
      
      try {
        // 1. Validate fields
        if (!sourcePath || !destPath) {
          throw new Error("Caminhos de origem e destino são obrigatórios.");
        }

        const fileName = path.basename(sourcePath);

        // 2. Check if source exists
        try {
          const stats = await fs.stat(sourcePath);
          if (!stats.isFile()) {
            throw new Error("O caminho de origem não é um arquivo.");
          }
        } catch (err: any) {
          throw new Error(err.code === 'ENOENT' ? "Arquivo de origem não encontrado." : err.message);
        }

        // 3. Check if destination directory exists
        const destDir = path.dirname(destPath);
        try {
          const dirStats = await fs.stat(destDir);
          if (!dirStats.isDirectory()) {
            throw new Error("O diretório de destino não é válido.");
          }
        } catch (err: any) {
          throw new Error(err.code === 'ENOENT' ? "Diretório de destino não encontrado." : err.message);
        }

        // 4. Move the file
        await fs.rename(sourcePath, destPath);

        // 5. Log the operation
        const logEntry = `[${new Date().toISOString()}] MOVED: ${fileName} (${sourcePath} -> ${destPath})\n`;
        await fs.appendFile(path.join(logDir, "file_move.log"), logEntry);

        results.push({ id, success: true, message: "Movido com sucesso!" });
      } catch (error: any) {
        results.push({ id, success: false, message: error.message });
      }
    }

    res.json({ success: true, results });
  });

  app.post("/api/validate-attachments", async (req, res) => {
    const { attachments } = req.body;
    if (!attachments || !Array.isArray(attachments)) {
      return res.status(400).json({ success: false, message: "Lista de anexos inválida." });
    }

    const results = await Promise.all(attachments.map(async (filePath: string) => {
      try {
        await fs.access(filePath);
        return { path: filePath, exists: true };
      } catch {
        return { path: filePath, exists: false };
      }
    }));

    res.json({ success: true, results });
  });

  app.post("/api/send-batch-emails", async (req, res) => {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ success: false, message: "Lista de e-mails inválida." });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const results = [];
    const logDir = path.join(process.cwd(), "logs");
    await fs.mkdir(logDir, { recursive: true });

    for (const emailData of emails) {
      const { id, clientName, to, cc, bcc, subject, body, imagePath, attachments } = emailData;
      
      try {
        // Validation
        if (!to || !subject || !body) {
          throw new Error("Campos obrigatórios ausentes (Para, Assunto ou Corpo).");
        }

        const mailOptions: any = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to,
          cc,
          bcc,
          subject,
          html: body,
          attachments: []
        };

        // Handle attachments
        if (attachments && Array.isArray(attachments)) {
          for (const filePath of attachments) {
            if (filePath) {
              try {
                await fs.access(filePath);
                mailOptions.attachments.push({
                  filename: path.basename(filePath),
                  path: filePath
                });
              } catch {
                throw new Error(`Anexo não encontrado: ${filePath}`);
              }
            }
          }
        }

        // Handle optional image
        if (imagePath) {
          try {
            await fs.access(imagePath);
            const cid = `img_${Math.random().toString(36).substr(2, 9)}`;
            mailOptions.attachments.push({
              filename: path.basename(imagePath),
              path: imagePath,
              cid
            });
            mailOptions.html = `${mailOptions.html}<br/><img src="cid:${cid}" style="max-width: 100%;"/>`;
          } catch {
            // Image is optional, but if path provided and not found, we log it but don't fail the whole email unless requested
            console.warn(`Imagem opcional não encontrada: ${imagePath}`);
          }
        }

        await transporter.sendMail(mailOptions);

        const logEntry = `[${new Date().toISOString()}] EMAIL SENT: ${clientName} (${to}) - Subject: ${subject}\n`;
        await fs.appendFile(path.join(logDir, "email_batch.log"), logEntry);

        results.push({ id, success: true, message: "Enviado com sucesso!" });
      } catch (error: any) {
        const logEntry = `[${new Date().toISOString()}] EMAIL ERROR: ${clientName} (${to}) - Error: ${error.message}\n`;
        await fs.appendFile(path.join(logDir, "email_batch.log"), logEntry);
        results.push({ id, success: false, message: error.message });
      }
    }

    res.json({ success: true, results });
  });

  // Vite middleware for development
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
