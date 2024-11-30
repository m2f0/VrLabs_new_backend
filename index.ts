import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express(); // Inicialize o app antes de configurar os middlewares
const directoryPath = path.join(__dirname, "HTMLs"); // Caminho do diretório HTMLs
const scriptFilePath = path.join(directoryPath, "script.js"); // Caminho para o arquivo script.js

const port = 3000;

// Configura o Express para servir arquivos estáticos
app.use("/HTMLs", express.static(directoryPath));

// Middleware para CORS
app.use(
  cors({
    origin: "https://mp9rks-3000.csb.app", // Permite apenas o frontend especificado
  })
);

// Middleware para processar JSON no corpo das requisições
app.use(express.json());

// Certifique-se de que a pasta HTMLs existe
if (!fs.existsSync(directoryPath)) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

// Certifique-se de que o script.js existe
if (!fs.existsSync(scriptFilePath)) {
  fs.writeFileSync(
    scriptFilePath,
    `
    console.log("Script carregado com sucesso!");

    function handleButtonClick() {
      alert("Botão clicado no script externo!");
    }
    `
  );
}

// Endpoint para salvar HTMLs
app.post("/save-html", (req: Request, res: Response) => {
  const { filename, content } = req.body;

  if (!filename || !content) {
    return res.status(400).send("Filename and content are required.");
  }

  const filePath = path.join(directoryPath, filename);

  // Salvar o arquivo
  fs.writeFile(filePath, content, (err) => {
    if (err) {
      console.error("Erro ao salvar o arquivo:", err);
      return res.status(500).send("Falha ao salvar o arquivo HTML.");
    }

    res.send("Arquivo HTML salvo com sucesso.");
  });
});

// Endpoint para listar os arquivos existentes no diretório HTMLs
app.get("/list-htmls", (req: Request, res: Response) => {
  // Ler os arquivos do diretório
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error("Erro ao listar os arquivos:", err);
      return res.status(500).send("Erro ao listar os arquivos.");
    }

    // Retornar a lista de arquivos como JSON
    res.json({ files });
  });
});

app.delete("/delete-html/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "HTMLs", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Arquivo não encontrado.");
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Erro ao excluir o arquivo:", err);
      return res.status(500).send("Erro ao excluir o arquivo.");
    }

    res.send("Arquivo excluído com sucesso.");
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
