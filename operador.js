// ==========================================================
//  Tela do Operador — lista, abrir OP, identificação e apontamento
// ==========================================================

import { db, AMBIENTE } from "./firebase.js";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// ---- Listas de motivos (padrão da fábrica) ----
const MOTIVOS_PARADA = [
  ["AF", "Construir/ajuste/troca ferramenta"], ["AM", "Ajustar máquina"],
  ["CA", "Falta calibrador"], ["FE", "Falta de energia elétrica"],
  ["FM", "Falta de matéria-prima"], ["FO", "Falta de operador"],
  ["FP", "Falta de programação"], ["LM", "Limpeza de molde"],
  ["MA", "Construir/ajuste/troca mandril"], ["MO", "Montagem molde"],
  ["OU", "Outros"], ["PA", "Parada para afiação"],
  ["PC", "Parado pela chefia"], ["PCP", "PCP"],
  ["PL", "Parada para limpeza"], ["PM", "Parada para manutenção"],
  ["PP", "Peneirar pó"], ["PQ", "Parada pela qualidade"],
  ["PRO", "Processo / amostra"], ["RE", "Reunião"],
  ["RP", "Repasse de peças"], ["RT", "Retrabalho"],
  ["SP", "Setup"], ["TP", "Troca de programação"]
];

const MOTIVOS_PERDA = [
  ["01", "Ø externo maior"], ["02", "Ø externo menor"],
  ["03", "Ø interno maior"], ["04", "Ø interno menor"],
  ["05", "Altura maior"], ["06", "Altura menor"],
  ["07", "Comprimento maior"], ["08", "Comprimento menor"],
  ["09", "Parede maior"], ["10", "Parede menor"],
  ["11", "Rebarba"], ["12", "Deformação"],
  ["13", "Contaminação"], ["14", "Trincas"],
  ["15", "Peças misturadas"], ["16", "Sujeira"],
  ["17", "Marcas/arranhões"], ["18", "Matéria-prima trocada"],
  ["19", "Falha do material"], ["20", "Rugosidade"],
  ["21", "Identificação"], ["22", "Outros"]
];

const listaOps = document.getElementById("lista-ops");
const listaVazia = document.getElementById("lista-vazia");
const etiquetaAmbiente = document.getElementById("ambiente");

const telaLista = document.getElementById("tela-lista");
const telaOp = document.getElementById("tela-op");
const fichaOp = document.getElementById("ficha-op");
const btnVoltar = document.getElementById("btn-voltar");

etiquetaAmbiente.textContent = "ambiente de " + AMBIENTE;

let opsCarregadas = [];
let opAberta = null;
let assinaturaCtx = null;
let assinaturaVazia = true;
let cronoAutosave = null;

// ==========================================================
//  Janela de confirmação (modal do site)
// ==========================================================
const modal = document.getElementById("modal-confirmar");
const modalTexto = document.getElementById("modal-texto");
const modalCancelar = document.getElementById("modal-cancelar");
const modalConfirmarBtn = document.getElementById("modal-confirmar-btn");
let acaoConfirmar = null;

function confirmar(texto, aoConfirmar) {
  modalTexto.textContent = texto;
  acaoConfirmar = aoConfirmar;
  modal.style.display = "flex";
}
function fecharModal() {
  modal.style.display = "none";
  acaoConfirmar = null;
}
modalCancelar.addEventListener("click", fecharModal);
modalConfirmarBtn.addEventListener("click", function () {
  if (acaoConfirmar) acaoConfirmar();
  fecharModal();
});

// ==========================================================
//  Escuta as OPs ativas
// ==========================================================
const consulta = query(
  collection(db, "ordens_producao"),
  where("status", "==", "ativa"),
  orderBy("importadaEm", "asc")
);

onSnapshot(consulta, function (resultado) {
  opsCarregadas = [];
  resultado.forEach(function (documento) {
    const dados = documento.data();
    dados._id = documento.id;
    opsCarregadas.push(dados);
  });
  if (telaLista.style.display !== "none") montarLista(opsCarregadas);
}, function (erro) {
  console.error("Erro ao carregar OPs:", erro);
  listaOps.innerHTML = "<p class='erro'>Não foi possível carregar as OPs. Tente atualizar a página.</p>";
});

// ==========================================================
//  Lista
// ==========================================================
function montarLista(ops) {
  if (ops.length === 0) {
    listaOps.innerHTML = "";
    listaVazia.style.display = "block";
    return;
  }
  listaVazia.style.display = "none";

  let html = "";
  ops.forEach(function (op, indice) {
    const etapa = etapaAtualDa(op);
    const ocupada = etapa && etapa.status === "em_producao";
    const classeCartao = ocupada ? "op-card ocupada" : "op-card disponivel";
    const textoStatus = ocupada
      ? "Em produção por: " + (etapa.operadorNome || "operador")
      : "Aguardando alocação";
    const classeStatus = ocupada ? "status-ocupada" : "status-disponivel";

    html += "<div class='" + classeCartao + "' data-indice='" + indice + "'>";
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

  document.querySelectorAll(".op-card").forEach(function (cartao) {
    cartao.addEventListener("click", function () {
      const indice = parseInt(cartao.getAttribute("data-indice"), 10);
      abrirOP(opsCarregadas[indice]);
    });
  });
}

// ==========================================================
//  Abrir OP
// ==========================================================
function abrirOP(op) {
  opAberta = op;
  const etapa = etapaAtualDa(op);

  if (etapa && etapa.status === "em_producao") {
    fichaOp.innerHTML = montarFicha(op) + montarApontamento(op);
    telaLista.style.display = "none";
    telaOp.style.display = "block";
    window.scrollTo(0, 0);
    ligarApontamento();
  } else {
    fichaOp.innerHTML = montarFicha(op);
    telaLista.style.display = "none";
    telaOp.style.display = "block";
    window.scrollTo(0, 0);
    prepararAssinatura();
    document.getElementById("btn-iniciar-etapa").addEventListener("click", iniciarEtapa);
    document.getElementById("btn-limpar-assinatura").addEventListener("click", limparAssinatura);
  }
}

btnVoltar.addEventListener("click", voltarParaLista);

function voltarParaLista() {
  telaOp.style.display = "none";
  telaLista.style.display = "block";
  fichaOp.innerHTML = "";
  opAberta = null;
  montarLista(opsCarregadas);
  window.scrollTo(0, 0);
}

// ==========================================================
//  Ficha (dados) + identificação (se etapa livre)
// ==========================================================
function montarFicha(op) {
  const etapa = etapaAtualDa(op);
  let html = "";

  html += "<div class='op-aberta-cabecalho'>";
  html += "  <h2>OP " + (op.numero || "—") + "</h2>";
  html += "  <p>Etapa atual: <strong>" + (etapa ? etapa.operacao : "—") + "</strong></p>";
  html += "</div>";

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

  if (op.parametrosMoldagem && op.parametrosMoldagem.length > 0) {
    html += "<div class='cartao'><h3>Parâmetros de moldagem</h3>";
    html += "<table class='tabela-param'>";
    html += "<tr><th>Parâmetro</th><th>Especificado</th><th>Tol. mín.</th><th>Tol. máx.</th></tr>";
    op.parametrosMoldagem.forEach(function (p) {
      html += "<tr><td>" + p.parametro + "</td><td>" + p.valor + "</td><td>" + p.tolMin + "</td><td>" + p.tolMax + "</td></tr>";
    });
    html += "</table></div>";
  }

  if (!(etapa && etapa.status === "em_producao")) {
    html += "<div class='cartao cartao-identificacao'>";
    html += "  <h3>Identificação do operador</h3>";
    html += "  <label class='rotulo-campo' for='nome-operador'>Nome completo</label>";
    html += "  <input type='text' id='nome-operador' class='input-nome' placeholder='Digite seu nome completo'>";
    html += "  <label class='rotulo-campo'>Assinatura</label>";
    html += "  <canvas id='quadro-assinatura' class='quadro-assinatura'></canvas>";
    html += "  <button id='btn-limpar-assinatura' class='botao-limpar'>Limpar assinatura</button>";
    html += "  <button id='btn-iniciar-etapa' class='botao-iniciar-etapa'>Iniciar etapa</button>";
    html += "  <p id='msg-iniciar' class='msg-iniciar'></p>";
    html += "</div>";
  }

  return html;
}

// ==========================================================
//  Tela 2 — Apontamento
// ==========================================================
function montarApontamento(op) {
  const etapa = etapaAtualDa(op);
  const ap = etapa.apontamentos || {};
  let html = "";

  html += "<div class='cartao cartao-apontamento'>";
  html += "  <h3>Apontamento — " + (etapa.operacao || "etapa") + "</h3>";
  html += "  <div class='resumo-peca'>";
  html += "    <span><strong>OP:</strong> " + (op.numero || "—") + "</span>";
  html += "    <span><strong>Cliente:</strong> " + (op.cliente || "—") + "</span>";
  html += "    <span><strong>Produto:</strong> " + (op.produto || "—") + "</span>";
  html += "    <span><strong>Qtde:</strong> " + (op.quantidade || "—") + "</span>";
  html += "    <span><strong>Operador:</strong> " + (etapa.operadorNome || "—") + "</span>";
  html += "  </div>";

  html += "  <div class='linha-inicio'>";
  html += "    <button id='btn-iniciar-processo' class='botao-iniciar-processo'>Iniciar processo</button>";
  html += "    <div class='campo-hora'><label>Hora de início</label>";
  html += "      <input type='time' id='hora-inicio' value='" + (ap.horaInicio || "") + "'></div>";
  html += "  </div>";

  html += "  <div class='grade-apontamento'>";
  html += "    <div class='campo-ap'><label>Hora de fim</label><input type='time' id='hora-fim' value='" + (ap.horaFim || "") + "'></div>";
  html += "    <div class='campo-ap'><label>Qtde produzida</label><input type='number' id='qtde-produzida' value='" + (ap.qtdeProduzida || "") + "' min='0'></div>";
  html += "  </div>";

  html += "  <div class='bloco-perda'>";
  html += "    <div class='grade-apontamento'>";
  html += "      <div class='campo-ap'><label>Perdas (qtde)</label><input type='number' id='qtde-perda' value='" + (ap.qtdePerda || "") + "' min='0'></div>";
  html += "      <div class='campo-ap'><label>Motivo da perda</label>" + selectMotivos("motivo-perda", MOTIVOS_PERDA, ap.motivoPerda) + "</div>";
  html += "    </div>";
  html += "  </div>";

  html += "  <div class='bloco-paradas'>";
  html += "    <div class='paradas-topo'><label>Paradas</label>";
  html += "      <button id='btn-add-parada' class='botao-add-parada'>+ Adicionar parada</button></div>";
  html += "    <div id='lista-paradas'></div>";
  html += "  </div>";

  html += "  <p id='aviso-autosave' class='aviso-autosave'></p>";
  html += "</div>";
  return html;
}

function selectMotivos(id, lista, selecionado) {
  const idAttr = id ? " id='" + id + "'" : "";
  let s = "<select" + idAttr + "><option value=''>Selecionar…</option>";
  lista.forEach(function (m) {
    const sel = (selecionado === m[0]) ? " selected" : "";
    s += "<option value='" + m[0] + "'" + sel + ">" + m[0] + " — " + m[1] + "</option>";
  });
  s += "</select>";
  return s;
}

// ==========================================================
//  Liga os eventos da Tela 2
// ==========================================================
function ligarApontamento() {
  const etapa = etapaAtualDa(opAberta);
  const ap = etapa.apontamentos || {};

  document.getElementById("btn-iniciar-processo").addEventListener("click", function () {
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2, "0");
    const mm = String(agora.getMinutes()).padStart(2, "0");
    document.getElementById("hora-inicio").value = hh + ":" + mm;
    agendarAutosave();
  });

  ["hora-inicio", "hora-fim", "qtde-produzida", "qtde-perda", "motivo-perda"].forEach(function (id) {
    const el = document.getElementById(id);
    el.addEventListener("input", agendarAutosave);
    el.addEventListener("change", agendarAutosave);
  });

  const paradas = ap.paradas || [];
  paradas.forEach(function (p) { adicionarParada(p); });

  document.getElementById("btn-add-parada").addEventListener("click", function () {
    adicionarParada(null);
    agendarAutosave();
  });
}

function adicionarParada(dados) {
  const container = document.getElementById("lista-paradas");
  const div = document.createElement("div");
  div.className = "linha-parada";
  div.innerHTML =
    "<div class='campo-ap'><label>Início</label><input type='time' class='parada-inicio' value='" + ((dados && dados.inicio) || "") + "'></div>" +
    "<div class='campo-ap'><label>Fim</label><input type='time' class='parada-fim' value='" + ((dados && dados.fim) || "") + "'></div>" +
    "<div class='campo-ap campo-ap-largo'><label>Motivo</label>" + selectMotivos("", MOTIVOS_PARADA, dados && dados.motivo) + "</div>" +
    "<button class='botao-remover-parada' title='Remover parada'>×</button>";

  div.querySelectorAll("input, select").forEach(function (el) {
    el.addEventListener("input", agendarAutosave);
    el.addEventListener("change", agendarAutosave);
  });

  div.querySelector(".botao-remover-parada").addEventListener("click", function () {
    confirmar("Tem certeza que deseja apagar esta parada?", function () {
      div.remove();
      agendarAutosave();
    });
  });

  container.appendChild(div);
}

// ==========================================================
//  Autosave
// ==========================================================
function agendarAutosave() {
  const aviso = document.getElementById("aviso-autosave");
  if (aviso) { aviso.textContent = "salvando…"; aviso.className = "aviso-autosave salvando"; }
  if (cronoAutosave) clearTimeout(cronoAutosave);
  cronoAutosave = setTimeout(salvarApontamento, 1000);
}

async function salvarApontamento() {
  const aviso = document.getElementById("aviso-autosave");
  try {
    const paradas = [];
    document.querySelectorAll("#lista-paradas .linha-parada").forEach(function (linha) {
      paradas.push({
        inicio: linha.querySelector(".parada-inicio").value,
        fim: linha.querySelector(".parada-fim").value,
        motivo: linha.querySelector("select").value
      });
    });

    const apontamento = {
      horaInicio: document.getElementById("hora-inicio").value,
      horaFim: document.getElementById("hora-fim").value,
      qtdeProduzida: document.getElementById("qtde-produzida").value,
      qtdePerda: document.getElementById("qtde-perda").value,
      motivoPerda: document.getElementById("motivo-perda").value,
      paradas: paradas,
      atualizadoEm: new Date().toISOString()
    };

    const referencia = doc(db, "ordens_producao", opAberta._id);
    const atual = await getDoc(referencia);
    const dados = atual.data();
    const indiceEtapa = (dados.etapaAtual || 1) - 1;

    if (apontamento.horaInicio && !dados.etapas[indiceEtapa].horarioInicioProcesso) {
      dados.etapas[indiceEtapa].horarioInicioProcesso = new Date().toISOString();
    }

    dados.etapas[indiceEtapa].apontamentos = apontamento;
    await updateDoc(referencia, { etapas: dados.etapas });

    if (aviso) { aviso.textContent = "✓ salvo"; aviso.className = "aviso-autosave salvo"; }
  } catch (erro) {
    console.error("Erro no autosave:", erro);
    if (aviso) { aviso.textContent = "⚠ erro ao salvar"; aviso.className = "aviso-autosave erro-salvar"; }
  }
}

// ==========================================================
//  Assinatura
// ==========================================================
function prepararAssinatura() {
  const canvas = document.getElementById("quadro-assinatura");
  const largura = canvas.offsetWidth;
  canvas.width = largura;
  canvas.height = 160;

  assinaturaCtx = canvas.getContext("2d");
  assinaturaCtx.lineWidth = 2.5;
  assinaturaCtx.lineCap = "round";
  assinaturaCtx.strokeStyle = "#1f2933";
  assinaturaVazia = true;

  let desenhando = false;
  function posicao(evento) {
    const r = canvas.getBoundingClientRect();
    const p = evento.touches ? evento.touches[0] : evento;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function comecar(e) { e.preventDefault(); desenhando = true; assinaturaVazia = false; const p = posicao(e); assinaturaCtx.beginPath(); assinaturaCtx.moveTo(p.x, p.y); }
  function mover(e) { if (!desenhando) return; e.preventDefault(); const p = posicao(e); assinaturaCtx.lineTo(p.x, p.y); assinaturaCtx.stroke(); }
  function parar() { desenhando = false; }

  canvas.addEventListener("mousedown", comecar);
  canvas.addEventListener("mousemove", mover);
  canvas.addEventListener("mouseup", parar);
  canvas.addEventListener("mouseleave", parar);
  canvas.addEventListener("touchstart", comecar, { passive: false });
  canvas.addEventListener("touchmove", mover, { passive: false });
  canvas.addEventListener("touchend", parar);
}

function limparAssinatura() {
  const canvas = document.getElementById("quadro-assinatura");
  assinaturaCtx.clearRect(0, 0, canvas.width, canvas.height);
  assinaturaVazia = true;
}

// ==========================================================
//  Iniciar etapa
// ==========================================================
async function iniciarEtapa() {
  const botao = document.getElementById("btn-iniciar-etapa");
  const msg = document.getElementById("msg-iniciar");
  const nome = document.getElementById("nome-operador").value.trim();

  if (!nome) { msg.textContent = "Digite seu nome completo."; msg.className = "msg-iniciar erro-msg"; return; }
  if (assinaturaVazia) { msg.textContent = "Assine no quadro antes de iniciar."; msg.className = "msg-iniciar erro-msg"; return; }

  botao.disabled = true;
  msg.textContent = "Iniciando…";
  msg.className = "msg-iniciar";

  try {
    const referencia = doc(db, "ordens_producao", opAberta._id);
    const atual = await getDoc(referencia);
    const dados = atual.data();
    const indiceEtapa = (dados.etapaAtual || 1) - 1;
    const etapa = dados.etapas[indiceEtapa];

    if (etapa.status === "em_producao") {
      msg.textContent = "Esta etapa já foi assumida por " + (etapa.operadorNome || "outro operador") + ".";
      msg.className = "msg-iniciar erro-msg";
      return;
    }

    const canvas = document.getElementById("quadro-assinatura");
    etapa.status = "em_producao";
    etapa.operadorNome = nome;
    etapa.operadorAssinatura = canvas.toDataURL("image/png");
    etapa.horarioAbertura = new Date().toISOString();
    etapa.horarioInicioProcesso = null;
    etapa.dispositivo = null;
    etapa.apontamentos = null;

    dados.etapas[indiceEtapa] = etapa;
    await updateDoc(referencia, { etapas: dados.etapas });

    opAberta = dados;
    opAberta._id = referencia.id;
    fichaOp.innerHTML = montarFicha(opAberta) + montarApontamento(opAberta);
    window.scrollTo(0, 0);
    ligarApontamento();
  } catch (erro) {
    console.error("Erro ao iniciar etapa:", erro);
    msg.textContent = "❌ Erro ao iniciar: " + erro.message;
    msg.className = "msg-iniciar erro-msg";
    botao.disabled = false;
  }
}

// ==========================================================
//  Auxiliares
// ==========================================================
function etapaAtualDa(op) {
  if (!op.etapas || op.etapas.length === 0) return null;
  const indice = (op.etapaAtual || 1) - 1;
  return op.etapas[indice] || op.etapas[0];
}

function campo(rotulo, valor) {
  const conteudo = valor ? valor : "—";
  return "<div class='campo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + conteudo + "</span></div>";
}

function campoLargo(rotulo, valor) {
  const conteudo = valor ? valor : "—";
  return "<div class='campo campo-largo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + conteudo + "</span></div>";
}
