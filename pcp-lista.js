// ==========================================================
//  Lista de OPs no PCP + resumo completo da OP
// ==========================================================

import { db } from "./firebase.js";
import { collection, onSnapshot }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const MOTIVOS_PARADA = {
  AF: "Construir/ajuste/troca ferramenta", AM: "Ajustar máquina", CA: "Falta calibrador",
  FE: "Falta de energia elétrica", FM: "Falta de matéria-prima", FO: "Falta de operador",
  FP: "Falta de programação", LM: "Limpeza de molde", MA: "Construir/ajuste/troca mandril",
  MO: "Montagem molde", OU: "Outros", PA: "Parada para afiação", PC: "Parado pela chefia",
  PCP: "PCP", PL: "Parada para limpeza", PM: "Parada para manutenção", PP: "Peneirar pó",
  PQ: "Parada pela qualidade", PRO: "Processo / amostra", RE: "Reunião", RP: "Repasse de peças",
  RT: "Retrabalho", SP: "Setup", TP: "Troca de programação"
};
const MOTIVOS_PERDA = {
  "01": "Ø externo maior", "02": "Ø externo menor", "03": "Ø interno maior", "04": "Ø interno menor",
  "05": "Altura maior", "06": "Altura menor", "07": "Comprimento maior", "08": "Comprimento menor",
  "09": "Parede maior", "10": "Parede menor", "11": "Rebarba", "12": "Deformação", "13": "Contaminação",
  "14": "Trincas", "15": "Peças misturadas", "16": "Sujeira", "17": "Marcas/arranhões",
  "18": "Matéria-prima trocada", "19": "Falha do material", "20": "Rugosidade", "21": "Identificação", "22": "Outros"
};

const listaNaoIniciadas = document.getElementById("lista-nao-iniciadas");
const vazioNaoIniciadas = document.getElementById("vazio-nao-iniciadas");
const listaGeral = document.getElementById("lista-geral");
const vazioGeral = document.getElementById("vazio-geral");

const pcpPrincipal = document.getElementById("pcp-principal");
const pcpResumo = document.getElementById("pcp-resumo");
const conteudoResumo = document.getElementById("conteudo-resumo");
const btnVoltarPcp = document.getElementById("btn-voltar-pcp");

let opsCarregadas = [];

onSnapshot(collection(db, "ordens_producao"), function (resultado) {
  opsCarregadas = [];
  resultado.forEach(function (documento) {
    const dados = documento.data();
    dados._id = documento.id;
    opsCarregadas.push(dados);
  });
  if (pcpResumo.style.display === "none") montarListas(opsCarregadas);
}, function (erro) {
  console.error("Erro ao carregar OPs (PCP):", erro);
  listaGeral.innerHTML = "<p class='erro'>Não foi possível carregar as OPs.</p>";
});

function montarListas(ops) {
  const naoIniciadas = [];
  const geral = [];
  ops.forEach(function (op) {
    if (dataAberturaOP(op)) geral.push(op); else naoIniciadas.push(op);
  });
  naoIniciadas.sort(function (a, b) { return textoData(b.importadaEm) - textoData(a.importadaEm); });
  geral.sort(function (a, b) { return textoData(dataAberturaOP(b)) - textoData(dataAberturaOP(a)); });
  renderizarGrupo(listaNaoIniciadas, vazioNaoIniciadas, naoIniciadas);
  renderizarGrupo(listaGeral, vazioGeral, geral);
}

function renderizarGrupo(container, elementoVazio, ops) {
  if (ops.length === 0) { container.innerHTML = ""; elementoVazio.style.display = "block"; return; }
  elementoVazio.style.display = "none";
  let html = "";
  ops.forEach(function (op) {
    const info = statusDaOP(op);
    html += "<div class='card-pcp " + info.classe + "' data-id='" + op._id + "'>";
    html += "<div class='card-pcp-topo'><span class='op-numero'>OP " + (op.numero || "—") + "</span>";
    html += "<span class='selo-status " + info.selo + "'>" + info.texto + "</span></div>";
    html += "<div class='card-pcp-corpo'><p class='op-cliente'>" + (op.cliente || "—") + "</p>";
    html += "<p class='op-peca'>" + (op.descricao || op.produto || "—") + "</p>";
    html += "<div class='card-pcp-rodape'><span>Importada: " + formatarDataHora(op.importadaEm) + "</span>";
    if (dataAberturaOP(op)) html += "<span>1ª abertura: " + formatarDataHora(dataAberturaOP(op)) + "</span>";
    html += "</div></div></div>";
  });
  container.innerHTML = html;

  container.querySelectorAll(".card-pcp").forEach(function (card) {
    card.addEventListener("click", function () {
      const op = opsCarregadas.find(function (o) { return o._id === card.getAttribute("data-id"); });
      if (op) abrirResumo(op);
    });
  });
}

// ----------------------------------------------------------
//  Resumo completo da OP
// ----------------------------------------------------------
function abrirResumo(op) {
  conteudoResumo.innerHTML = montarResumo(op);
  pcpPrincipal.style.display = "none";
  pcpResumo.style.display = "block";
  window.scrollTo(0, 0);

  // Botões "ver assinatura"
  conteudoResumo.querySelectorAll(".btn-assinatura").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const alvo = document.getElementById(btn.getAttribute("data-alvo"));
      if (alvo.style.display === "none") { alvo.style.display = "block"; btn.textContent = "Ocultar assinatura"; }
      else { alvo.style.display = "none"; btn.textContent = "Ver assinatura"; }
    });
  });
}

btnVoltarPcp.addEventListener("click", function () {
  pcpResumo.style.display = "none";
  pcpPrincipal.style.display = "block";
  conteudoResumo.innerHTML = "";
  montarListas(opsCarregadas);
  window.scrollTo(0, 0);
});

function montarResumo(op) {
  const info = statusDaOP(op);
  let html = "";

  html += "<div class='op-aberta-cabecalho'><h2>OP " + (op.numero || "—") + "</h2>";
  html += "<p>" + info.texto + "</p></div>";

  // Dados da OP
  html += "<div class='cartao'><h3>Dados da OP</h3><div class='campos'>";
  html += campo("Número da OP", op.numero);
  html += campoLargo("Cliente", op.cliente);
  html += campo("Pedido do cliente", op.pedidoCliente);
  html += campo("Produto", op.produto);
  html += campoLargo("Descrição", op.descricao);
  html += campo("Quantidade", op.quantidade);
  html += campo("Início previsto", op.iniPrevisto);
  html += campo("Fim efetivo", op.fimEfetivo);
  html += campo("Desenho", op.desenho);
  html += "</div></div>";

  if (op.materiaPrima && op.materiaPrima.length > 0) {
    html += "<div class='cartao'><h3>Matéria-prima</h3>";
    op.materiaPrima.forEach(function (mp) {
      html += "<div class='campos'>";
      html += campo("Código", mp.codigo);
      html += campo("Lote", mp.lote);
      html += campo("Qtde MP", mp.qtdeMP);
      html += campoLargo("Descrição", mp.descricao);
      html += "</div>";
    });
    html += "</div>";
  }

  // Etapas — todas abertas em sequência
  html += "<div class='cartao'><h3>Etapas e apontamentos</h3>";
  if (op.etapas && op.etapas.length > 0) {
    op.etapas.forEach(function (etapa, indice) {
      html += montarEtapaResumo(etapa, indice);
    });
  } else {
    html += "<p class='texto-vazio'>Sem etapas registradas.</p>";
  }
  html += "</div>";

  return html;
}

function montarEtapaResumo(etapa, indice) {
  const ap = etapa.apontamentos || {};
  const statusEtapa = etapa.status === "concluida" ? "Concluída"
    : etapa.status === "em_producao" ? "Em produção" : "Pendente";
  const classeSelo = etapa.status === "concluida" ? "selo-finalizada"
    : etapa.status === "em_producao" ? "selo-producao" : "selo-pendente";

  let h = "<div class='etapa-resumo'>";
  h += "<div class='etapa-resumo-topo'>";
  h += "<span class='etapa-nome'>" + (indice + 1) + ". " + (etapa.operacao || "Etapa") + "</span>";
  h += "<span class='selo-status " + classeSelo + "'>" + statusEtapa + "</span>";
  h += "</div>";
  h += "<span class='etapa-recurso'>" + (etapa.recurso || "") + (etapa.recursoCodigo ? " (" + etapa.recursoCodigo + ")" : "") + "</span>";

  if (etapa.status === "pendente") {
    h += "<p class='texto-vazio'>Ainda não iniciada.</p></div>";
    return h;
  }

  // Operador + horários
  h += "<div class='campos etapa-campos'>";
  h += campo("Operador", etapa.operadorNome);
  h += campo("OP aberta em", formatarDataHora(etapa.horarioAbertura));
  h += campo("Início do processo (sistema)", formatarDataHora(etapa.horarioInicioProcesso));
  h += campo("Etapa concluída em", formatarDataHora(etapa.horarioFimEtapa));
  h += "</div>";

  // Apontamento
  h += "<div class='campos etapa-campos'>";
  h += campo("Hora início (apontada)", ap.horaInicio);
  h += campo("Hora fim (apontada)", ap.horaFim);
  h += campo("Qtde produzida", ap.qtdeProduzida);
  h += campo("Perdas", ap.qtdePerda);
  h += campoLargo("Motivo da perda", ap.motivoPerda ? (ap.motivoPerda + " — " + (MOTIVOS_PERDA[ap.motivoPerda] || "")) : null);
  h += "</div>";

  // Paradas
  if (ap.paradas && ap.paradas.length > 0) {
    h += "<div class='etapa-paradas'><span class='etapa-subtitulo'>Paradas</span>";
    ap.paradas.forEach(function (p, i) {
      const motivo = p.motivo ? (p.motivo + " — " + (MOTIVOS_PARADA[p.motivo] || "")) : "—";
      h += "<div class='parada-resumo'>Parada " + (i + 1) + ": " + (p.inicio || "—") + " às " + (p.fim || "—") + " · " + motivo + "</div>";
    });
    h += "</div>";
  }

  // Assinatura (expansível)
  if (etapa.operadorAssinatura) {
    const idImg = "assin-" + indice;
    h += "<button class='btn-assinatura' data-alvo='" + idImg + "'>Ver assinatura</button>";
    h += "<div id='" + idImg + "' class='assinatura-img' style='display:none;'>";
    h += "<img src='" + etapa.operadorAssinatura + "' alt='Assinatura do operador'>";
    h += "</div>";
  }

  h += "</div>";
  return h;
}

// ----------------------------------------------------------
//  Status
// ----------------------------------------------------------
function statusDaOP(op) {
  if (op.status === "finalizada") return { texto: "Finalizada", classe: "st-finalizada", selo: "selo-finalizada" };
  if (op.status === "finalizada_aguardando_pcp") return { texto: "Finalizada – aguardando PCP", classe: "st-aguardando", selo: "selo-aguardando" };
  const etapa = etapaAtualDa(op);
  const nomeEtapa = etapa ? etapa.operacao : "—";
  if (etapa && etapa.status === "em_producao") {
    return { texto: "Ativa — " + nomeEtapa + ": em produção por " + (etapa.operadorNome || "operador"), classe: "st-ativa", selo: "selo-producao" };
  }
  return { texto: "Ativa — " + nomeEtapa + ": aguardando alocação", classe: "st-ativa", selo: "selo-livre" };
}

// ----------------------------------------------------------
//  Auxiliares
// ----------------------------------------------------------
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
function textoData(iso) { return iso ? new Date(iso).getTime() : 0; }
function formatarDataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function campo(rotulo, valor) {
  return "<div class='campo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + (valor || "—") + "</span></div>";
}
function campoLargo(rotulo, valor) {
  return "<div class='campo campo-largo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + (valor || "—") + "</span></div>";
}
