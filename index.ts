import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const directoryPath = path.join(__dirname, "HTMLs");
const scriptFilePath = path.join(directoryPath, "script.js");
const logFilePath = path.join(__dirname, "logs.txt");

const port = 3000;

// Configurações da API do Proxmox
const PROXMOX_API_URL = "https://prox.nnovup.com.br/api2/json";
const PROXMOX_TOKEN = "14931bf6-55b0-4631-823c-03ad70b553da"; // Token de autenticação
const PROXMOX_USER = "apiuser@pve!apitoken";

// Definição do tipo para logs do Proxmox
interface ProxmoxLog {
  time: string; // Data e hora do log
  node: string; // Nome do node
  service: string; // Serviço relacionado ao log
  pid: string; // ID do processo
  user: string; // Nome do usuário
  severity: string; // Severidade do log
  message: string; // Mensagem do log
}

// Substituição do fetch para suportar ESM
const fetch = async (url: string, options?: any) => {
  const { default: fetch } = await import("node-fetch");
  return fetch(url, options);
};

// Função para autenticar e buscar logs do cluster
const fetchClusterLogs = async (): Promise<ProxmoxLog[]> => {
  try {
    const response = await fetch(`${PROXMOX_API_URL}/cluster/log`, {
      method: "GET",
      headers: {
        Authorization: `PVEAPIToken=${PROXMOX_USER}=${PROXMOX_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Erro ao buscar logs do Proxmox: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    // Mapeando os dados para preencher campos ausentes com "N/A"
    return (data as { data: ProxmoxLog[] }).data.map((log) => ({
      time: log.time || "N/A",
      node: log.node || "N/A",
      service: log.service || "N/A",
      pid: log.pid || "N/A",
      user: log.user || "N/A",
      severity: log.severity || "N/A",
      message: log.message || "N/A",
    }));
  } catch (error) {
    console.error("Erro ao buscar logs do cluster:", error);
    throw error;
  }
};

// Novo Endpoint para logs do Proxmox
app.get("/logs", async (req: Request, res: Response) => {
  try {
    const logs = await fetchClusterLogs();
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar logs do cluster." });
  }
});

// Configura o Express para servir arquivos estáticos
app.use("/HTMLs", express.static(directoryPath));

// Middleware para CORS
app.use(
  cors({
    origin: "https://gckyrp-3000.csb.app", // Ajuste a origem conforme necessário
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
  console.log(`Servidor rodando na porta ${port}`);
});
