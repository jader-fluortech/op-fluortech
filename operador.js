// ==========================================================
//  Tela do Operador — lista as OPs ativas do chão de fábrica
//  (Etapa C: só listar. Abrir e apontar vem na Etapa D.)
// ==========================================================

import { db, AMBIENTE } from "./firebase.js";
import { collection, query, where, orderBy, onSnapshot }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const listaOps = document.getElementById("lista-ops");
const listaVazia = document.getElementById("lista-vazia");
const etiquetaAmbiente = document.getElementById("ambiente");

etiquetaAmbiente.textContent = "ambiente de " + AMBIENTE;

// ----------------------------------------------------------
//  Escuta as OPs ativas em tempo real.
//  onSnapshot = a lista se atualiza sozinha quando algo muda
//  no banco (ex.: outro operador assume uma OP).
// ----------------------------------------------------------
const consulta = query(
  collection(db, "ordens_producao"),
  where("status", "==", "ativa"),
  orderBy("importadaEm", "asc")   // mais antigas primeiro (ordem de chegada)
);

onSnapshot(consulta, function (resultado) {
  const ops = [];
  resultado.forEach(function (documento) {
    ops.push(documento.data());
  });
  montarLista(ops);
}, function (erro) {
  console.error("Erro ao carregar OPs:", erro);
  listaOps.innerHTML = "<p class='erro'>Não foi possível carregar as OPs. Tente atualizar a página.</p>";
});

// ----------------------------------------------------------
//  Monta a lista visual das OPs
// ----------------------------------------------------------
function montarLista(ops) {
  // Nenhuma OP ativa
  if (ops.length === 0) {
    listaOps.innerHTML = "";
    listaVazia.style.display = "block";
    return;
  }
  listaVazia.style.display = "none";

  let html = "";
  ops.forEach(function (op) {
    // Descobre a etapa atual e seu status
    const etapa = etapaAtualDa(op);
    const ocupada = etapa && etapa.status === "em_producao";

    const classeCartao = ocupada ? "op-card ocupada" : "op-card disponivel";
    const textoStatus = ocupada
      ? "Em produção por: " + (etapa.operadorNome || "operador")
      : "Aguardando alocação";
    const classeStatus = ocupada ? "status-ocupada" : "status-disponivel";

    html += "<div class='" + classeCartao + "'>";
    html += "  <div class='op-card-topo'>";
    html += "    <span class='op-numero'>OP " + (op.numero || "—") + "</span>";
    html += "    <span class='" + classeStatus + "'>" + textoStatus + "</span>";
    html += "  </div>";
    html += "  <div class='op-card-corpo'>";
    html += "    <p class='op-cliente'>" + (op.cliente || "—") + "</p>";
    html += "    <p class='op-peca'>" + (op.descricao || op.produto || "—") + "</p>";
    html += "    <p class='op-etapa'>Etapa atual: <strong>" +
              (etapa ? etapa.operacao : "—") + "</strong></p>";
    html += "  </div>";
    html += "</div>";
  });

  listaOps.innerHTML = html;
}

// ----------------------------------------------------------
//  Descobre qual é a etapa atual da OP (pelo campo etapaAtual)
// ----------------------------------------------------------
function etapaAtualDa(op) {
  if (!op.etapas || op.etapas.length === 0) return null;
  const indice = (op.etapaAtual || 1) - 1;
  return op.etapas[indice] || op.etapas[0];
}
