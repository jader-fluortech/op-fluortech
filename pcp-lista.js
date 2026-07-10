// ==========================================================
//  Lista de OPs no PCP — todas as OPs, agrupadas e ordenadas
// ==========================================================

import { db } from "./firebase.js";
import { collection, onSnapshot }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const listaNaoIniciadas = document.getElementById("lista-nao-iniciadas");
const vazioNaoIniciadas = document.getElementById("vazio-nao-iniciadas");
const listaGeral = document.getElementById("lista-geral");
const vazioGeral = document.getElementById("vazio-geral");

// ----------------------------------------------------------
//  Escuta TODAS as OPs em tempo real
// ----------------------------------------------------------
onSnapshot(collection(db, "ordens_producao"), function (resultado) {
  const ops = [];
  resultado.forEach(function (documento) {
    const dados = documento.data();
    dados._id = documento.id;
    ops.push(dados);
  });
  montarListas(ops);
}, function (erro) {
  console.error("Erro ao carregar OPs (PCP):", erro);
  listaGeral.innerHTML = "<p class='erro'>Não foi possível carregar as OPs.</p>";
});

// ----------------------------------------------------------
//  Separa em dois grupos e ordena
// ----------------------------------------------------------
function montarListas(ops) {
  const naoIniciadas = [];
  const geral = [];

  ops.forEach(function (op) {
    if (dataAberturaOP(op)) {
      geral.push(op);          // já foi aberta por algum operador
    } else {
      naoIniciadas.push(op);   // ninguém abriu ainda
    }
  });

  // Não iniciadas: mais recentes (por importação) no topo
  naoIniciadas.sort(function (a, b) {
    return textoData(b.importadaEm) - textoData(a.importadaEm);
  });

  // Geral: por hora de abertura da OP (mais recente no topo)
  geral.sort(function (a, b) {
    return textoData(dataAberturaOP(b)) - textoData(dataAberturaOP(a));
  });

  renderizarGrupo(listaNaoIniciadas, vazioNaoIniciadas, naoIniciadas);
  renderizarGrupo(listaGeral, vazioGeral, geral);
}

// ----------------------------------------------------------
//  Desenha um grupo de OPs
// ----------------------------------------------------------
function renderizarGrupo(container, elementoVazio, ops) {
  if (ops.length === 0) {
    container.innerHTML = "";
    elementoVazio.style.display = "block";
    return;
  }
  elementoVazio.style.display = "none";

  let html = "";
  ops.forEach(function (op) {
    const info = statusDaOP(op);
    html += "<div class='card-pcp " + info.classe + "'>";
    html += "  <div class='card-pcp-topo'>";
    html += "    <span class='op-numero'>OP " + (op.numero || "—") + "</span>";
    html += "    <span class='selo-status " + info.selo + "'>" + info.texto + "</span>";
    html += "  </div>";
    html += "  <div class='card-pcp-corpo'>";
    html += "    <p class='op-cliente'>" + (op.cliente || "—") + "</p>";
    html += "    <p class='op-peca'>" + (op.descricao || op.produto || "—") + "</p>";
    html += "    <div class='card-pcp-rodape'>";
    html += "      <span>Importada: " + formatarDataHora(op.importadaEm) + "</span>";
    if (dataAberturaOP(op)) {
      html += "      <span>1ª abertura: " + formatarDataHora(dataAberturaOP(op)) + "</span>";
    }
    html += "    </div>";
    html += "  </div>";
    html += "</div>";
  });
  container.innerHTML = html;
}

// ----------------------------------------------------------
//  Descobre o status e o texto de exibição da OP
// ----------------------------------------------------------
function statusDaOP(op) {
  if (op.status === "finalizada") {
    return { texto: "Finalizada", classe: "st-finalizada", selo: "selo-finalizada" };
  }
  if (op.status === "finalizada_aguardando_pcp") {
    return { texto: "Finalizada – aguardando PCP", classe: "st-aguardando", selo: "selo-aguardando" };
  }
  // Ativa: mostra a etapa atual e a alocação
  const etapa = etapaAtualDa(op);
  const nomeEtapa = etapa ? etapa.operacao : "—";
  if (etapa && etapa.status === "em_producao") {
    return {
      texto: "Ativa — " + nomeEtapa + ": em produção por " + (etapa.operadorNome || "operador"),
      classe: "st-ativa", selo: "selo-producao"
    };
  }
  return {
    texto: "Ativa — " + nomeEtapa + ": aguardando alocação",
    classe: "st-ativa", selo: "selo-livre"
  };
}

// ----------------------------------------------------------
//  Auxiliares
// ----------------------------------------------------------
// Data em que o PRIMEIRO operador abriu a OP (1ª etapa com horarioAbertura)
function dataAberturaOP(op) {
  if (!op.etapas) return null;
  for (let i = 0; i < op.etapas.length; i++) {
    if (op.etapas[i].horarioAbertura) return op.etapas[i].horarioAbertura;
  }
  return null;
}

function etapaAtualDa(op) {
  if (!op.etapas || op.etapas.length === 0) return null;
  const i = (op.etapaAtual || 1) - 1;
  return op.etapas[i] || op.etapas[0];
}

function textoData(iso) {
  return iso ? new Date(iso).getTime() : 0;
}

function formatarDataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
