import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const directoryPath = path.join(__dirname, "HTMLs");
const scriptFilePath = path.join(directoryPath, "script.js");
const logFilePath = path.join(__dirname, "logs.txt");

const port = 3000;

// Configura o Express para servir arquivos estáticos
app.use("/HTMLs", express.static(directoryPath));

// Middleware para CORS
app.use(
  cors({
    origin: "https://ld2yy9-3000.csb.app/", // Ajuste a origem conforme necessário
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

// Certifique-se de que o arquivo de log existe
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, "");
}

// Middleware para registrar logs
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const client =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const route = req.originalUrl;

  // Interceptar a resposta para registrar o status
  const originalSend = res.send;
  res.send = function (body) {
    const status = res.statusCode < 400 ? "OK" : "ERROR";
    const logEntry = `${timestamp} - ${client} - ${route} - ${status}\n`;

    // Escrever no log
    fs.appendFile(logFilePath, logEntry, (err) => {
      if (err) console.error("Erro ao escrever no log:", err);
    });

    return originalSend.call(this, body);
  };

  next();
});

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

// Endpoint inicial - Exibe os logs em ordem do mais antigo para o mais recente
app.get("/", (req, res) => {
  fs.readFile(logFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Erro ao ler o log:", err);
      return res.status(500).send("Erro ao ler o log.");
    }

    // HTML para exibir os logs e recarregar a página automaticamente
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Logs</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.5; }
          pre { background-color: #f4f4f4; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
        </style>
        <script>
          setTimeout(() => {
            window.location.reload();
          }, 5000); // Recarregar a cada 5 segundos
        </script>
      </head>
      <body>
        <h1>Logs de Utilização</h1>
        <pre>${data || "Nenhum log disponível."}</pre>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(htmlContent);
  });
});

// Inicializar o servidor
app.listen(port, () => {
  console.log(`Sandbox listening on port ${port}`);
});
