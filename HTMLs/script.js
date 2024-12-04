const API_BASE_URL = "https://prox.nnovup.com.br"; // Substitua pela URL correta
const API_USER = "apiuser@pve";
const API_TOKEN = "58fc95f1-afc7-47e6-8b7a-31e6971062ca";

async function makeRequest(url, method, body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `PVEAPIToken=${API_USER}!apitoken=${API_TOKEN}`,
    },
  };

  if (body) {
    options.body = new URLSearchParams(body);
  }

  try {
    console.log("Enviando requisição:", { url, options });
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro no conteúdo da resposta:", errorText);
      throw new Error(
        `Erro na solicitação: ${response.status} - ${response.statusText}`
      );
    }

    const jsonData = await response.json();
    console.log("Dados retornados:", jsonData);
    return jsonData;
  } catch (error) {
    console.error("Erro na requisição:", error);
    alert(`Erro na solicitação: ${error.message}`);
    throw error;
  }
}

async function createLab(vmid, node, name) {
  const newVmId = prompt("Digite o ID da nova VM (Linked Clone):");
  if (!newVmId) {
    alert("ID da nova VM é obrigatório.");
    return;
  }

  try {
    await makeRequest(
      `${API_BASE_URL}/api2/json/nodes/${node}/qemu/${vmid}/clone`,
      "POST",
      {
        newid: newVmId,
        name: `${name}-lab-${newVmId}`,
        snapname: "SNAP_1",
        full: 0,
      }
    );

    alert("Solicitação enviada! Verifique no Proxmox o status da operação.");
  } catch (error) {
    console.error("Erro ao criar laboratório:", error);
    alert("Erro ao criar laboratório. Verifique os logs.");
  }
}

async function startVM(vmid, node) {
  try {
    await makeRequest(
      `${API_BASE_URL}/api2/json/nodes/${node}/qemu/${vmid}/status/start`,
      "POST"
    );
    alert("Solicitação enviada para iniciar a VM.");
  } catch (error) {
    console.error("Erro ao iniciar a VM:", error);
    alert("Erro ao iniciar a VM. Verifique os logs.");
  }
}

async function stopVM(vmid, node) {
  try {
    await makeRequest(
      `${API_BASE_URL}/api2/json/nodes/${node}/qemu/${vmid}/status/stop`,
      "POST"
    );
    alert("Solicitação enviada para parar a VM.");
  } catch (error) {
    console.error("Erro ao parar a VM:", error);
    alert("Erro ao parar a VM. Verifique os logs.");
  }
}

async function connectVM(vmid, node) {
  try {
    // Obtém o ticket e a porta usando o endpoint `vncproxy`
    const response = await makeRequest(
      `${API_BASE_URL}/api2/json/nodes/${node}/qemu/${vmid}/vncproxy`,
      "POST"
    );

    const { ticket, port } = response.data;

    console.log("Ticket obtido:", ticket);
    console.log("Porta do VNC:", port);

    // Constrói a URL com os parâmetros necessários
    const url = `${API_BASE_URL}/?console=kvm&novnc=1&vmid=${vmid}&node=${node}&resize=off&port=${port}&vncticket=${encodeURIComponent(
      ticket
    )}`;

    // Abre o console noVNC em uma nova janela
    window.open(url, "_blank");
  } catch (error) {
    console.error("Erro ao conectar à VM:", error);
    alert("Erro ao conectar à VM. Verifique os logs.");
  }
}

// Expondo as funções ao escopo global
window.createLab = createLab;
window.startVM = startVM;
window.stopVM = stopVM;
window.connectVM = connectVM;
