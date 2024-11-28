import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express(); // Inicialize o app antes de configurar os middlewares
const port = 3000;

// Middleware para CORS
app.use(
  cors({
    origin: "https://dggy7k-3000.csb.app", // Permite apenas o frontend especificado
  })
);

// Middleware para processar JSON no corpo das requisições
app.use(express.json());

// Endpoint para salvar HTMLs
app.post("/save-html", (req: Request, res: Response) => {
  const { filename, content } = req.body;

  if (!filename || !content) {
    return res.status(400).send("Filename and content are required.");
  }

  const directoryPath = path.join(__dirname, "HTMLs");
  const filePath = path.join(directoryPath, filename);

  // Certifique-se de que o diretório existe
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  // Salvar o arquivo
  fs.writeFile(filePath, content, (err) => {
    if (err) {
      console.error("Erro ao salvar o arquivo:", err);
      return res.status(500).send("Falha ao salvar o arquivo HTML.");
    }

    res.send("Arquivo HTML salvo com sucesso.");
  });
});

// Endpoint inicial
app.get("/", (req, res) => {
  res.send("Hello CodeSandbox!");
});

// Inicializar o servidor
app.listen(port, () => {
  console.log(`Sandbox listening on port ${port}`);
});
