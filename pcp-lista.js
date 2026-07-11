// ==========================================================
//  Lista de OPs no PCP — 3 grupos, resumo, arquivar, corrigir (modo)
// ==========================================================

import { db } from "./firebase.js";
import { collection, onSnapshot, doc, getDoc, updateDoc }
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
const listaEmAndamento = document.getElementById("lista-em-andamento");
const vazioEmAndamento = document.getElementById("vazio-em-andamento");
const listaArquivadas = document.getElementById("lista-arquivadas");
const vazioArquivadas = document.getElementById("vazio-arquivadas");

const pcpPrincipal = document.getElementById("pcp-principal");
const pcpResumo = document.getElementById("pcp-resumo");
const conteudoResumo = document.getElementById("conteudo-resumo");
const btnVoltarPcp = document.getElementById("btn-voltar-pcp");

let opsCarregadas = [];
let opNoResumo = null;
let modoCorrecao = false;   // se está editando a OP

document.querySelectorAll(".titulo-grupo").forEach(function (botao) {
  botao.addEventListener("click", function () {
    const alvo = document.getElementById("wrap-" + botao.getAttribute("data-alvo").replace("lista-", ""));
    const seta = botao.querySelector(".seta-grupo");
    const recolhido = botao.classList.toggle("recolhido");
    if (recolhido) { alvo.style.display = "none"; seta.textContent = "▸"; botao.setAttribute("aria-expanded", "false"); }
    else { alvo.style.display = "block"; seta.textContent = "▾"; botao.setAttribute("aria-expanded", "true"); }
  });
});

// ---- Janela de confirmação ----
let modalPcp, modalPcpTexto, modalPcpCancelar, modalPcpConfirmar, acaoConfirmarPcp;
function prepararModal() {
  modalPcp = document.createElement("div");
  modalPcp.className = "modal-fundo";
  modalPcp.style.display = "none";
  modalPcp.innerHTML =
    "<div class='modal-caixa'><p id='modal-pcp-texto' class='modal-texto'></p>" +
    "<div class='modal-botoes'><button id='modal-pcp-cancelar' class='modal-btn-cancelar'>Cancelar</button>" +
    "<button id='modal-pcp-confirmar' class='modal-btn-confirmar'>Confirmar</button></div></div>";
  document.body.appendChild(modalPcp);
  modalPcpTexto = document.getElementById("modal-pcp-texto");
  modalPcpCancelar = document.getElementById("modal-pcp-cancelar");
  modalPcpConfirmar = document.getElementById("modal-pcp-confirmar");
  modalPcpCancelar.addEventListener("click", fecharModalPcp);
  modalPcpConfirmar.addEventListener("click", function () {
    const acao = acaoConfirmarPcp;
    fecharModalPcp();
    if (acao) acao();
  });
}
function confirmarPcp(texto, aoConfirmar) {
  modalPcpTexto.textContent = texto;
  acaoConfirmarPcp = aoConfirmar;
  modalPcp.style.display = "flex";
}
function fecharModalPcp() { modalPcp.style.display = "none"; acaoConfirmarPcp = null; }
prepararModal();

onSnapshot(collection(db, "ordens_producao"), function (resultado) {
  opsCarregadas = [];
  resultado.forEach(function (documento) {
    const dados = documento.data();
    dados._id = documento.id;
    opsCarregadas.push(dados);
  });
  // Não remexe a tela se estiver no meio de uma correção
  if (pcpResumo.style.display === "none") montarListas(opsCarregadas);
}, function (erro) {
  console.error("Erro ao carregar OPs (PCP):", erro);
  listaEmAndamento.innerHTML = "<p class='erro'>Não foi possível carregar as OPs.</p>";
});

function montarListas(ops) {
  const naoIniciadas = [];
  const emAndamento = [];
  const arquivadas = [];
  ops.forEach(function (op) {
    if (op.status === "finalizada_arquivada") arquivadas.push(op);
    else if (dataAberturaOP(op)) emAndamento.push(op);
    else naoIniciadas.push(op);
  });
  naoIniciadas.sort(function (a, b) { return textoData(b.importadaEm) - textoData(a.importadaEm); });
  emAndamento.sort(function (a, b) { return textoData(dataAberturaOP(b)) - textoData(dataAberturaOP(a)); });
  arquivadas.sort(function (a, b) { return textoData(b.arquivadaEm) - textoData(a.arquivadaEm); });
  renderizarGrupo(listaNaoIniciadas, vazioNaoIniciadas, naoIniciadas, false);
  renderizarGrupo(listaEmAndamento, vazioEmAndamento, emAndamento, false);
  renderizarGrupo(listaArquivadas, vazioArquivadas, arquivadas, true);
}

function renderizarGrupo(container, elementoVazio, ops, enxuto) {
  if (ops.length === 0) { container.innerHTML = ""; elementoVazio.style.display = "block"; return; }
  elementoVazio.style.display = "none";
  let html = "";
  ops.forEach(function (op) {
    if (enxuto) {
      html += "<div class='card-pcp card-arquivado' data-id='" + op._id + "'>";
      html += "<div class='card-arquivado-linha'>";
      html += "<span class='op-numero'>OP " + (op.numero || "—") + "</span>";
      html += "<span class='arquivado-data'>Arquivada: " + formatarDataHora(op.arquivadaEm) + "</span></div>";
      html += "<p class='op-cliente'>" + (op.cliente || "—") + "</p>";
      html += "<p class='op-peca'>" + (op.descricao || op.produto || "—") + "</p></div>";
    } else {
      const info = statusDaOP(op);
      html += "<div class='card-pcp " + info.classe + "' data-id='" + op._id + "'>";
      html += "<div class='card-pcp-topo'><span class='op-numero'>OP " + (op.numero || "—") + "</span>";
      html += "<span class='selo-status " + info.selo + "'>" + info.texto + "</span></div>";
      html += "<div class='card-pcp-corpo'><p class='op-cliente'>" + (op.cliente || "—") + "</p>";
      html += "<p class='op-peca'>" + (op.descricao || op.produto || "—") + "</p>";
      html += "<div class='card-pcp-rodape'><span>Importada: " + formatarDataHora(op.importadaEm) + "</span>";
      if (dataAberturaOP(op)) html += "<span>1ª abertura: " + formatarDataHora(dataAberturaOP(op)) + "</span>";
      html += "</div></div></div>";
    }
  });
  container.innerHTML = html;
  container.querySelectorAll(".card-pcp").forEach(function (card) {
    card.addEventListener("click", function () {
      const op = opsCarregadas.find(function (o) { return o._id === card.getAttribute("data-id"); });
      if (op) abrirResumo(op);
    });
  });
}

function abrirResumo(op) {
  opNoResumo = op;
  modoCorrecao = false;
  desenharResumo();
  pcpPrincipal.style.display = "none";
  pcpResumo.style.display = "block";
  window.scrollTo(0, 0);
}

function desenharResumo() {
  conteudoResumo.innerHTML = montarResumo(opNoResumo, modoCorrecao);

  conteudoResumo.querySelectorAll(".btn-assinatura").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const alvo = document.getElementById(btn.getAttribute("data-alvo"));
      if (alvo.style.display === "none") { alvo.style.display = "block"; btn.textContent = "Ocultar assinatura"; }
      else { alvo.style.display = "none"; btn.textContent = "Ver assinatura"; }
    });
  });

  const btnArquivar = document.getElementById("btn-arquivar");
  if (btnArquivar) btnArquivar.addEventListener("click", function () {
    confirmarPcp("Deseja arquivar esta OP? Ela será marcada como finalizada em definitivo.", arquivarOP);
  });

  const btnCorrigir = document.getElementById("btn-corrigir");
  if (btnCorrigir) btnCorrigir.addEventListener("click", function () {
    modoCorrecao = true;
    desenharResumo();
    window.scrollTo(0, 0);
  });

  const btnSalvarCorrecao = document.getElementById("btn-salvar-correcao");
  if (btnSalvarCorrecao) btnSalvarCorrecao.addEventListener("click", concluirCorrecao);
}

btnVoltarPcp.addEventListener("click", function () {
  pcpResumo.style.display = "none";
  pcpPrincipal.style.display = "block";
  conteudoResumo.innerHTML = "";
  opNoResumo = null;
  modoCorrecao = false;
  montarListas(opsCarregadas);
  window.scrollTo(0, 0);
});

// Encerra o modo de correção e devolve a OP para "aguardando PCP"
async function concluirCorrecao() {
  modoCorrecao = false;
  desenharResumo();
  window.scrollTo(0, 0);
}

async function arquivarOP() {
  if (!opNoResumo) return;
  try {
    const referencia = doc(db, "ordens_producao", opNoResumo._id);
    const emailPcp = window.emailPcpLogado || "desconhecido";
    const registro = { acao: "arquivou", autor: emailPcp, em: new Date().toISOString() };
    const atual = await getDoc(referencia);
    const historico = (atual.data().historicoPcp) || [];
    historico.push(registro);
    await updateDoc(referencia, {
      status: "finalizada_arquivada",
      arquivadaEm: new Date().toISOString(),
      arquivadaPor: emailPcp,
      historicoPcp: historico
    });
    pcpResumo.style.display = "none";
    pcpPrincipal.style.display = "block";
    conteudoResumo.innerHTML = "";
    opNoResumo = null;
    window.scrollTo(0, 0);
  } catch (erro) {
    console.error("Erro ao arquivar OP:", erro);
    alert("Não foi possível arquivar a OP: " + erro.message);
  }
}

function montarResumo(op, emCorrecao) {
  const info = statusDaOP(op);
  let html = "";

  html += "<div class='op-aberta-cabecalho'><h2>OP " + (op.numero || "—") + "</h2>";
  html += "<p>" + info.texto + "</p></div>";

  if (emCorrecao) {
    html += "<div class='aviso-correcao'>✎ Modo de correção — clique num campo de apontamento para editá-lo.</div>";
  }

  if (op.status === "finalizada_aguardando_pcp") {
    html += "<div class='acoes-pcp'>";
    if (!emCorrecao) {
      html += "<button id='btn-corrigir' class='botao-corrigir'>Corrigir OP</button>";
      html += "<button id='btn-arquivar' class='botao-arquivar'>Arquivar OP</button>";
    } else {
      html += "<button id='btn-salvar-correcao' class='botao-arquivar'>Salvar alterações</button>";
    }
    html += "</div>";
  }

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

  html += "<div class='cartao'><h3>Etapas e apontamentos</h3>";
  if (op.etapas && op.etapas.length > 0) {
    op.etapas.forEach(function (etapa, indice) { html += montarEtapaResumo(etapa, indice); });
  } else {
    html += "<p class='texto-vazio'>Sem etapas registradas.</p>";
  }
  html += "</div>";

  if (op.historicoPcp && op.historicoPcp.length > 0) {
    html += "<div class='cartao'><h3>Histórico do PCP</h3>";
    op.historicoPcp.forEach(function (h) {
      html += "<p class='linha-historico'>" + formatarDataHora(h.em) + " — <strong>" + h.autor + "</strong> " + h.acao + "</p>";
    });
    html += "</div>";
  }

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
  h += "<span class='selo-status " + classeSelo + "'>" + statusEtapa + "</span></div>";
  h += "<span class='etapa-recurso'>" + (etapa.recurso || "") + (etapa.recursoCodigo ? " (" + etapa.recursoCodigo + ")" : "") + "</span>";

  if (etapa.status === "pendente") {
    h += "<p class='texto-vazio'>Ainda não iniciada.</p></div>";
    return h;
  }

  h += "<div class='campos etapa-campos'>";
  h += campo("Operador", etapa.operadorNome);
  h += campo("OP aberta em", formatarDataHora(etapa.horarioAbertura));
  h += campo("Início do processo (sistema)", formatarDataHora(etapa.horarioInicioProcesso));
  h += campo("Etapa concluída em", formatarDataHora(etapa.horarioFimEtapa));
  h += "</div>";

  h += "<div class='campos etapa-campos'>";
  h += campo("Hora início (apontada)", ap.horaInicio);
  h += campo("Hora fim (apontada)", ap.horaFim);
  h += campo("Qtde produzida", ap.qtdeProduzida);
  h += campo("Perdas", ap.qtdePerda);
  h += campoLargo("Motivo da perda", ap.motivoPerda ? (ap.motivoPerda + " — " + (MOTIVOS_PERDA[ap.motivoPerda] || "")) : null);
  h += "</div>";

  if (ap.paradas && ap.paradas.length > 0) {
    h += "<div class='etapa-paradas'><span class='etapa-subtitulo'>Paradas</span>";
    ap.paradas.forEach(function (p, i) {
      const motivo = p.motivo ? (p.motivo + " — " + (MOTIVOS_PARADA[p.motivo] || "")) : "—";
      h += "<div class='parada-resumo'>Parada " + (i + 1) + ": " + (p.inicio || "—") + " às " + (p.fim || "—") + " · " + motivo + "</div>";
    });
    h += "</div>";
  }

  if (etapa.operadorAssinatura) {
    const idImg = "assin-" + indice;
    h += "<button class='btn-assinatura' data-alvo='" + idImg + "'>Ver assinatura</button>";
    h += "<div id='" + idImg + "' class='assinatura-img' style='display:none;'>";
    h += "<img src='" + etapa.operadorAssinatura + "' alt='Assinatura do operador'></div>";
  }

  h += "</div>";
  return h;
}

function statusDaOP(op) {
  if (op.status === "finalizada_arquivada") return { texto: "Finalizada – arquivada", classe: "st-finalizada", selo: "selo-finalizada" };
  if (op.status === "finalizada_aguardando_pcp") return { texto: "Finalizada – aguardando PCP", classe: "st-aguardando", selo: "selo-aguardando" };
  const etapa = etapaAtualDa(op);
  const nomeEtapa = etapa ? etapa.operacao : "—";
  if (etapa && etapa.status === "em_producao") {
    return { texto: "Ativa — " + nomeEtapa + ": em produção por " + (etapa.operadorNome || "operador"), classe: "st-ativa", selo: "selo-producao" };
  }
  return { texto: "Ativa — " + nomeEtapa + ": aguardando alocação", classe: "st-ativa", selo: "selo-livre" };
}

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
