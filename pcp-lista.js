// ==========================================================
//  Lista de OPs no PCP — resumo, arquivar, corrigir + auditoria
//  Correção: alterações ficam em rascunho e só gravam ao "Salvar e voltar"
// ==========================================================

import { db } from "./firebase.js";
import { collection, onSnapshot, doc, getDoc, updateDoc }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { storage } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";

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

// Modal de documentos (OP já criada)
const modalDocs = document.getElementById("modal-docs");
const btnFecharDocs = document.getElementById("btn-fechar-docs");
const docsExistentes = document.getElementById("docs-existentes");
const inputDocsNovos = document.getElementById("docs-novos");
const listaDocsNovos = document.getElementById("lista-docs-novos");
const btnSalvarDocs = document.getElementById("btn-salvar-docs");
const msgDocs = document.getElementById("msg-docs");

let docsDaOp = [];
let docsNovos = [];
let docsRemovidos = [];

const ROTULOS_LEGIVEIS = {
  horaInicio: "Hora início (apontada)",
  horaFim: "Hora fim (apontada)",
  qtdeProduzida: "Qtde produzida",
  qtdePerda: "Perdas"
};

// Definição das colunas de cada FF (para exibir a tabela no pop-up).
// Ao adicionar uma nova FF, basta incluir a definição aqui.
const DEF_FF = {
  ff002: {
    nome: "FF-002 Tamboreamento",
    colunas: [
      { rot: "Data", campo: "data" },
      { rot: "Qtde Total", campo: "qtdeTotal" },
      { rot: "Qtde Parcial", campo: "qtdeParcial" },
      { rot: "Nº Máq.", campo: "maquina" },
      { rot: "Horário Inicial", campo: "horaInicial" },
      { rot: "Horário Final", campo: "horaFinal" },
      { rot: "Responsável", fonte: "responsavel" },
      { rot: "Diário de Bordo", campo: "observacoes" }
    ]
  },
  ff004: {
    nome: "FF-004 Sinterização",
    abas: [
      {
        chave: "sinterizacao",
        titulo: "Sinterização",
        colunas: [
          { rot: "Data Entrada", campo: "dataEntrada" },
          { rot: "Hora Entrada", campo: "horaEntrada" },
          { rot: "Nº OP", fonte: "numeroOp" },
          { rot: "Nº Bandeja", campo: "bandeja" },
          { rot: "Sub-lote", campo: "subLote" },
          { rot: "Parede (mm)", campo: "parede" },
          { rot: "Visto Moldagem", campo: "vistoMoldagem", tipo: "assinatura" },
          { rot: "Hora Ent. Forno", campo: "horaEntradaForno" },
          { rot: "Data Ent. Forno", campo: "dataEntradaForno" },
          { rot: "Nº Forno", campo: "forno" },
          { rot: "Hora Saída Forno", campo: "horaSaidaForno" },
          { rot: "Data Saída Forno", campo: "dataSaidaForno" },
          { rot: "Visto Controlador", campo: "vistoControlador", tipo: "assinatura" },
          { rot: "ID Gráfico", campo: "idGrafico" }
        ]
      },
      {
        chave: "descanso",
        titulo: "Descanso",
        colunas: [
          { rot: "Data Entrada", campo: "dataEntrada" },
          { rot: "Hora Entrada", campo: "horaEntrada" },
          { rot: "Nº OP", fonte: "numeroOp" },
          { rot: "Nº Bandeja", campo: "bandeja" },
          { rot: "Parede (mm)", campo: "parede" },
          { rot: "Hora Saída", campo: "horaSaida" },
          { rot: "Data Saída", campo: "dataSaida" },
          { rot: "Visto Controlador", campo: "vistoControlador", tipo: "assinatura" }
        ]
      }
    ]
  },
  ff008: {
    nome: "FF-008 Ranhura e Corte",
    abas: [
      {
        chave: "ranhura",
        titulo: "Ranhura",
        colunas: [
          { rot: "Data", campo: "data" },
          { rot: "Nº OP", campo: "numeroOp" },
          { rot: "Cliente", campo: "cliente" },
          { rot: "Desenho", campo: "desenho" },
          { rot: "Qtd Ranhuras — Esp.", campo: "qtdEsp" },
          { rot: "Qtd Ranhuras — Enc.", campo: "qtdEnc" },
          { rot: "Qtd Ranhuras — Laudo", campo: "qtdLaudo" },
          { rot: "Largura L1 — Esp.", campo: "largL1Esp" },
          { rot: "Largura L1 — Enc.", campo: "largL1Enc" },
          { rot: "Largura L1 — Laudo", campo: "largL1Laudo" },
          { rot: "Largura L2 — Esp.", campo: "largL2Esp" },
          { rot: "Largura L2 — Enc.", campo: "largL2Enc" },
          { rot: "Largura L2 — Laudo", campo: "largL2Laudo" },
          { rot: "Prof. L1 — Esp.", campo: "profL1Esp" },
          { rot: "Prof. L1 — Enc.", campo: "profL1Enc" },
          { rot: "Prof. L1 — Laudo", campo: "profL1Laudo" },
          { rot: "Prof. L2 — Esp.", campo: "profL2Esp" },
          { rot: "Prof. L2 — Enc.", campo: "profL2Enc" },
          { rot: "Prof. L2 — Laudo", campo: "profL2Laudo" },
          { rot: "Responsável", campo: "responsavel" },
          { rot: "Dispositivo", campo: "dispositivo" },
          { rot: "Instrumento", campo: "instrumento" },
          { rot: "Data (rodapé)", campo: "dataRodape" },
          { rot: "Diário de Bordo", campo: "diarioBordo" }
        ]
      },
      {
        chave: "corte",
        titulo: "Corte",
        colunas: [
          { rot: "Data", campo: "data" },
          { rot: "Nº OP", campo: "numeroOp" },
          { rot: "Cliente", campo: "cliente" },
          { rot: "Desenho", campo: "desenho" },
          { rot: "Ângulo reto — Enc.", campo: "retoEnc" },
          { rot: "Ângulo reto — Laudo", campo: "retoLaudo" },
          { rot: "Ângulo agudo — Enc.", campo: "agudoEnc" },
          { rot: "Ângulo agudo — Laudo", campo: "agudoLaudo" },
          { rot: "Forma Z — Enc.", campo: "zEnc" },
          { rot: "Forma Z — Laudo", campo: "zLaudo" },
          { rot: "Responsável", campo: "responsavel" },
          { rot: "Dispositivo", campo: "dispositivo" },
          { rot: "Instrumento", campo: "instrumento" },
          { rot: "Data (rodapé)", campo: "dataRodape" },
          { rot: "Diário de Bordo", campo: "diarioBordo" }
        ]
      }
    ]
  }
};

const filtroNumero = document.getElementById("filtro-numero");
const filtroLote = document.getElementById("filtro-lote");
const filtroDataDe = document.getElementById("filtro-data-de");
const filtroDataAte = document.getElementById("filtro-data-ate");
const btnBuscarArquivadas = document.getElementById("btn-buscar-arquivadas");
const btnLimparArquivadas = document.getElementById("btn-limpar-arquivadas");
const msgFiltro = document.getElementById("msg-filtro");

let opsCarregadas = [];
let opNoResumo = null;
let modoCorrecao = false;
let rascunho = [];   // alterações pendentes: {etapaIdx, chave, campo, de, para}

document.querySelectorAll(".titulo-grupo").forEach(function (botao) {
  botao.addEventListener("click", function () {
    const alvo = document.getElementById("wrap-" + botao.getAttribute("data-alvo").replace("lista-", ""));
    const seta = botao.querySelector(".seta-grupo");
    const recolhido = botao.classList.toggle("recolhido");
    if (recolhido) { alvo.style.display = "none"; seta.textContent = "▸"; botao.setAttribute("aria-expanded", "false"); }
    else { alvo.style.display = "block"; seta.textContent = "▾"; botao.setAttribute("aria-expanded", "true"); }
  });
});

// ---- Janela de confirmação (2 botões) ----
let modalPcp, modalPcpTexto, modalPcpCancelar, modalPcpConfirmar, acaoConfirmarPcp, acaoCancelarPcp;
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
  modalPcpCancelar.addEventListener("click", function () {
    const acao = acaoCancelarPcp;
    fecharModalPcp();
    if (acao) acao();
  });
  modalPcpConfirmar.addEventListener("click", function () {
    const acao = acaoConfirmarPcp;
    fecharModalPcp();
    if (acao) acao();
  });
}
function confirmarPcp(texto, aoConfirmar, aoCancelar) {
  modalPcpTexto.textContent = texto;
  acaoConfirmarPcp = aoConfirmar;
  acaoCancelarPcp = aoCancelar || null;
  modalPcp.style.display = "flex";
}
function fecharModalPcp() { modalPcp.style.display = "none"; acaoConfirmarPcp = null; acaoCancelarPcp = null; }
prepararModal();

// ---- Modal de 3 opções (Salvar / Descartar / Cancelar) ----
let modal3, modal3Texto, acao3Salvar, acao3Descartar;
function prepararModal3() {
  modal3 = document.createElement("div");
  modal3.className = "modal-fundo";
  modal3.style.display = "none";
  modal3.innerHTML =
    "<div class='modal-caixa'><p id='m3-texto' class='modal-texto'></p>" +
    "<div class='modal-botoes'>" +
    "<button id='m3-cancelar' class='modal-btn-cancelar'>Cancelar</button>" +
    "<button id='m3-descartar' class='modal-btn-descartar'>Descartar</button>" +
    "<button id='m3-salvar' class='modal-btn-confirmar'>Salvar</button>" +
    "</div></div>";
  document.body.appendChild(modal3);
  modal3Texto = document.getElementById("m3-texto");
  document.getElementById("m3-cancelar").addEventListener("click", fecharModal3);
  document.getElementById("m3-salvar").addEventListener("click", function () {
    const a = acao3Salvar; fecharModal3(); if (a) a();
  });
  document.getElementById("m3-descartar").addEventListener("click", function () {
    const a = acao3Descartar; fecharModal3(); if (a) a();
  });
}
function confirmar3(texto, aoSalvar, aoDescartar) {
  modal3Texto.textContent = texto;
  acao3Salvar = aoSalvar;
  acao3Descartar = aoDescartar;
  modal3.style.display = "flex";
}
function fecharModal3() { modal3.style.display = "none"; acao3Salvar = null; acao3Descartar = null; }
prepararModal3();

// ---- Modal de visualização de registros de FF (só leitura) ----
let modalFF;
function prepararModalFF() {
  modalFF = document.createElement("div");
  modalFF.className = "modal-fundo";
  modalFF.style.display = "none";
  modalFF.innerHTML =
    "<div class='modal-caixa modal-ff-caixa'>" +
    "<div class='modal-registro-topo'><h2 id='modal-ff-titulo'></h2>" +
    "<button id='modal-ff-fechar' class='modal-fechar'>×</button></div>" +
    "<div id='modal-ff-conteudo'></div></div>";
  document.body.appendChild(modalFF);
  document.getElementById("modal-ff-fechar").addEventListener("click", fecharModalFF);
  modalFF.addEventListener("click", function (e) { if (e.target === modalFF) fecharModalFF(); });
}
function fecharModalFF() { modalFF.style.display = "none"; }
prepararModalFF();

// Abre o pop-up com a(s) tabela(s) dos registros de uma FF (só desta OP)
function abrirRegistrosFF(codigoFf) {
  const def = DEF_FF[codigoFf];
  const todos = (opNoResumo.registrosFF || []).filter(function (r) { return r.ff === codigoFf; });
  todos.sort(function (a, b) { return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(); });

  document.getElementById("modal-ff-titulo").textContent = def ? def.nome : codigoFf;

  let html = "";
  if (codigoFf === "ff008") {
    html = montarFF008(todos);
  } else if (def && def.abas) {
    // FF com múltiplas abas (ex: FF-004) — uma tabela por aba
    def.abas.forEach(function (aba) {
      const regsAba = todos.filter(function (r) { return (r.aba || "sinterizacao") === aba.chave; });
      html += "<h3 class='titulo-aba-ff'>" + aba.titulo + "</h3>";
      html += montarTabelaFF(aba.colunas, regsAba);
    });
  } else {
    // FF de tabela única (ex: FF-002)
    html += montarTabelaFF(def ? def.colunas : [], todos);
  }

  document.getElementById("modal-ff-conteudo").innerHTML = html;

  // liga os botões de assinatura ("assinado ✓")
  document.getElementById("modal-ff-conteudo").querySelectorAll(".btn-ver-assin-pcp").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const idx = parseInt(btn.getAttribute("data-idx"), 10);
      const campo = btn.getAttribute("data-campo");
      const reg = todos[idx];
      if (reg && reg.campos && reg.campos[campo]) {
        abrirAssinaturaPcp(btn.getAttribute("data-rot"), reg.campos[campo]);
      }
    });
  });

  modalFF.style.display = "flex";
}

// Renderiza os registros da FF-008 como cartões (mesmo layout do operador)
function montarFF008(regs) {
  const CAR = {
    ranhura: { titulo: "Ranhura", comEsp: true, itens: [
      { chave: "qtd", rot: "Quantidade de Ranhuras" },
      { chave: "largL1", rot: "Largura — Lado 1" },
      { chave: "largL2", rot: "Largura — Lado 2" },
      { chave: "profL1", rot: "Profundidade — Lado 1" },
      { chave: "profL2", rot: "Profundidade — Lado 2" }
    ] },
    corte: { titulo: "Corte", comEsp: false, itens: [
      { chave: "reto", rot: "Ângulo reto (90°)" },
      { chave: "agudo", rot: "Ângulo agudo (menor que 90°)" },
      { chave: "z", rot: "Corte forma Z" }
    ] }
  };
  function txf(v) { return (v === undefined || v === null || String(v).trim() === "") ? "—" : String(v); }
  function dataBRf(iso) { if (!iso) return "—"; const p = String(iso).split("-"); return (p.length === 3) ? (p[2] + "/" + p[1] + "/" + p[0]) : String(iso); }
  function pil(v) {
    if (v === "Aprovado") return "<span style='background:#e3f5ea;color:#0b7a3b;padding:2px 8px;border-radius:10px;font-size:12px;'>Aprovado</span>";
    if (v === "Reprovado") return "<span style='background:#fdeaea;color:#b3261e;padding:2px 8px;border-radius:10px;font-size:12px;'>Reprovado</span>";
    return "—";
  }
  let html = "";
  ["ranhura", "corte"].forEach(function (abaKey) {
    const def = CAR[abaKey];
    const lista = regs.filter(function (r) { return (r.aba || "ranhura") === abaKey; });
    html += "<h3 class='titulo-aba-ff'>" + def.titulo + "</h3>";
    if (lista.length === 0) { html += "<p class='texto-vazio'>Sem registros.</p>"; return; }
    lista.forEach(function (r) {
      const c = r.campos || {};
      html += "<div style='border:1px solid #e1e5ea;border-radius:10px;padding:12px 14px;margin-bottom:14px;background:#fff;'>";
      html += "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;'><strong>OP " + txf(c.numeroOp || r.numeroOp) + "</strong><span>" + dataBRf(c.data) + "</span></div>";
      html += "<div style='font-size:12px;color:#5f6b7a;margin:4px 0;'>Cliente: " + txf(c.cliente || r.cliente) + " · Desenho: " + txf(c.desenho) + "</div>";
      html += "<table class='tabela-ff-pcp'><thead><tr><th>Característica</th>";
      if (def.comEsp) html += "<th>Especificado</th>";
      html += "<th>Encontrado</th><th>Laudo</th></tr></thead><tbody>";
      def.itens.forEach(function (it) {
        html += "<tr><td>" + it.rot + "</td>";
        if (def.comEsp) html += "<td>" + txf(c[it.chave + "Esp"]) + "</td>";
        html += "<td>" + txf(c[it.chave + "Enc"]) + "</td>";
        html += "<td>" + pil(c[it.chave + "Laudo"]) + "</td></tr>";
      });
      html += "</tbody></table>";
      html += "<div style='font-size:12px;color:#5f6b7a;margin:4px 0;'>Responsável: " + txf(c.responsavel) + " · Dispositivo: " + txf(c.dispositivo) + " · Instrumento: " + txf(c.instrumento) + " · Data: " + dataBRf(c.dataRodape) + "</div>";
      if (c.diarioBordo && String(c.diarioBordo).trim()) html += "<div style='font-size:12px;color:#5f6b7a;margin:4px 0;'>Diário de bordo: " + txf(c.diarioBordo) + "</div>";
      html += "</div>";
    });
  });
  return html;
}

// Monta uma tabela de registros a partir de colunas + lista
function montarTabelaFF(colunas, registros) {
  let html = "<div class='tabela-wrap-ff'><table class='tabela-ff-pcp'><thead><tr>";
  colunas.forEach(function (col) { html += "<th>" + col.rot + "</th>"; });
  html += "</tr></thead><tbody>";
  if (registros.length === 0) {
    html += "<tr><td colspan='" + colunas.length + "' class='texto-vazio'>Sem registros.</td></tr>";
  }
  registros.forEach(function (r, idx) {
    const c = r.campos || {};
    html += "<tr>";
    colunas.forEach(function (col) {
      if (col.tipo === "assinatura") {
        if (c[col.campo]) {
          html += "<td><button class='btn-ver-assin-pcp' data-idx='" + idx + "' data-campo='" + col.campo + "' data-rot='" + col.rot + "'>assinado ✓</button></td>";
        } else {
          html += "<td>—</td>";
        }
      } else {
        let v;
        if (col.fonte) v = r[col.fonte];
        else v = c[col.campo];
        const mostrado = (v === undefined || v === null || String(v).trim() === "") ? "—" : String(v);
        const classe = col.campo === "observacoes" ? " class='col-diario'" : "";
        html += "<td" + classe + ">" + mostrado + "</td>";
      }
    });
    html += "</tr>";
  });
  html += "</tbody></table></div>";
  return html;
}

// Pop-up para ver a assinatura ampliada (dentro do PCP)
function abrirAssinaturaPcp(rotulo, dataUrl) {
  let modal = document.getElementById("modal-assin-pcp");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-assin-pcp";
    modal.className = "modal-fundo";
    modal.innerHTML = "<div class='modal-caixa'><div class='modal-registro-topo'>" +
      "<h2 id='assin-pcp-titulo'>Assinatura</h2>" +
      "<button id='assin-pcp-fechar' class='modal-fechar'>×</button></div>" +
      "<div id='assin-pcp-conteudo' style='text-align:center;'></div></div>";
    document.body.appendChild(modal);
    document.getElementById("assin-pcp-fechar").addEventListener("click", function () {
      modal.style.display = "none";
    });
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.style.display = "none"; });
  }
  document.getElementById("assin-pcp-titulo").textContent = rotulo || "Assinatura";
  document.getElementById("assin-pcp-conteudo").innerHTML =
    "<img src='" + dataUrl + "' alt='Assinatura' style='max-width:100%; border:1px solid #e1e5ea; border-radius:8px;'>";
  modal.style.display = "flex";
}

// ---- Modal de documentos (OP já criada) ----
function abrirModalDocs() {
  docsDaOp = (opNoResumo.documentos || []).slice();
  docsNovos = [];
  docsRemovidos = [];
  msgDocs.textContent = "";
  desenharDocsModal();
  modalDocs.style.display = "flex";
}
function fecharModalDocs() {
  modalDocs.style.display = "none";
  docsNovos = [];
  docsRemovidos = [];
}
btnFecharDocs.addEventListener("click", fecharModalDocs);
modalDocs.addEventListener("click", function (e) { if (e.target === modalDocs) fecharModalDocs(); });

inputDocsNovos.addEventListener("change", function (evento) {
  Array.from(evento.target.files).forEach(function (arq) { docsNovos.push(arq); });
  inputDocsNovos.value = "";
  desenharDocsModal();
});

function desenharDocsModal() {
  let hx = "";
  if (docsDaOp.length === 0) {
    hx = "<p class='texto-vazio'>Nenhum documento anexado ainda.</p>";
  } else {
    docsDaOp.forEach(function (d, i) {
      hx += "<div class='doc-item'>";
      hx += "<a class='doc-nome-link' href='" + d.url + "' target='_blank' rel='noopener'>📄 " + d.nome + "</a>";
      hx += "<button class='doc-remover' data-i='" + i + "'>×</button></div>";
    });
  }
  docsExistentes.innerHTML = hx;
  docsExistentes.querySelectorAll(".doc-remover").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const i = parseInt(btn.getAttribute("data-i"), 10);
      docsRemovidos.push(docsDaOp[i].nome);
      docsDaOp.splice(i, 1);
      desenharDocsModal();
    });
  });

  let hn = "";
  docsNovos.forEach(function (arq, i) {
    hn += "<div class='doc-item'><span class='doc-nome'>➕ " + arq.name + "</span>";
    hn += "<button class='doc-remover-novo' data-i='" + i + "'>×</button></div>";
  });
  listaDocsNovos.innerHTML = hn;
  listaDocsNovos.querySelectorAll(".doc-remover-novo").forEach(function (btn) {
    btn.addEventListener("click", function () {
      docsNovos.splice(parseInt(btn.getAttribute("data-i"), 10), 1);
      desenharDocsModal();
    });
  });
}

btnSalvarDocs.addEventListener("click", salvarDocs);

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
  listaEmAndamento.innerHTML = "<p class='erro'>Não foi possível carregar as OPs.</p>";
});

function montarListas(ops) {
  const naoIniciadas = [];
  const emAndamento = [];
  ops.forEach(function (op) {
    if (op.status === "finalizada_arquivada") return;
    if (dataAberturaOP(op)) emAndamento.push(op);
    else naoIniciadas.push(op);
  });
  naoIniciadas.sort(function (a, b) { return textoData(b.importadaEm) - textoData(a.importadaEm); });
  emAndamento.sort(function (a, b) { return textoData(dataAberturaOP(b)) - textoData(dataAberturaOP(a)); });
  renderizarGrupo(listaNaoIniciadas, vazioNaoIniciadas, naoIniciadas, false);
  renderizarGrupo(listaEmAndamento, vazioEmAndamento, emAndamento, false);
}

// ---- Filtro das arquivadas ----
btnBuscarArquivadas.addEventListener("click", buscarArquivadas);
btnLimparArquivadas.addEventListener("click", limparFiltros);

function buscarArquivadas() {
  const num = filtroNumero.value.trim().toLowerCase();
  const lote = filtroLote.value.trim().toLowerCase();
  const de = filtroDataDe.value ? new Date(filtroDataDe.value + "T00:00:00").getTime() : null;
  const ate = filtroDataAte.value ? new Date(filtroDataAte.value + "T23:59:59").getTime() : null;

  if (!num && !lote && !de && !ate) {
    msgFiltro.textContent = "Preencha o número da OP, o lote ou uma data para buscar.";
    msgFiltro.className = "msg-filtro erro-msg";
    listaArquivadas.innerHTML = "";
    vazioArquivadas.style.display = "none";
    return;
  }
  msgFiltro.textContent = "";

  const arquivadas = opsCarregadas.filter(function (op) {
    if (op.status !== "finalizada_arquivada") return false;
    if (num && !(op.numero || "").toLowerCase().includes(num)) return false;
    if (lote) {
      const temLote = (op.materiaPrima || []).some(function (mp) {
        return (mp.lote || "").toLowerCase().includes(lote);
      });
      if (!temLote) return false;
    }
    if (de || ate) {
      const t = textoData(op.arquivadaEm);
      if (de && t < de) return false;
      if (ate && t > ate) return false;
    }
    return true;
  });

  arquivadas.sort(function (a, b) { return textoData(b.arquivadaEm) - textoData(a.arquivadaEm); });
  renderizarGrupo(listaArquivadas, vazioArquivadas, arquivadas, true);
}

function limparFiltros() {
  filtroNumero.value = "";
  filtroLote.value = "";
  filtroDataDe.value = "";
  filtroDataAte.value = "";
  msgFiltro.textContent = "";
  listaArquivadas.innerHTML = "";
  vazioArquivadas.style.display = "none";
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
  rascunho = [];
  desenharResumo();
  pcpPrincipal.style.display = "none";
  pcpResumo.style.display = "block";
  window.scrollTo(0, 0);
}

function desenharResumo() {
  conteudoResumo.innerHTML = montarResumo(opNoResumo, modoCorrecao);
  atualizarBotaoVoltar();

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
    rascunho = [];
    desenharResumo();
    window.scrollTo(0, 0);
  });

  const btnDocs = document.getElementById("btn-docs");
  if (btnDocs) btnDocs.addEventListener("click", abrirModalDocs);

  conteudoResumo.querySelectorAll(".botao-ff").forEach(function (btn) {
    btn.addEventListener("click", function () { abrirRegistrosFF(btn.getAttribute("data-ff")); });
  });

  if (modoCorrecao) ligarCamposEditaveis();
}

// Ajusta o texto do botão "Voltar" conforme haja rascunho
function atualizarBotaoVoltar() {
  if (modoCorrecao && rascunho.length > 0) {
    btnVoltarPcp.textContent = "Salvar e voltar";
  } else {
    btnVoltarPcp.textContent = "← Voltar para a lista";
  }
}

function ligarCamposEditaveis() {
  conteudoResumo.querySelectorAll(".campo-editavel").forEach(function (celula) {
    celula.addEventListener("click", function () {
      if (celula.querySelector("input")) return;

      const etapaIdx = parseInt(celula.getAttribute("data-etapa"), 10);
      const chave = celula.getAttribute("data-chave");
      const rotulo = celula.getAttribute("data-rotulo");
      const tipo = celula.getAttribute("data-tipo") || "text";
      const valorAtual = celula.getAttribute("data-valor") || "";

      const valorSpan = celula.querySelector(".valor");
      valorSpan.style.display = "none";

      const input = document.createElement("input");
      input.type = tipo;
      input.value = valorAtual;
      input.className = "input-correcao";
      celula.appendChild(input);
      input.focus();

      let jaTratou = false;
      function finalizar() {
        if (jaTratou) return;
        jaTratou = true;
        const novo = input.value;
        input.remove();
        valorSpan.style.display = "";
        if (novo === valorAtual) return;
        confirmarPcp(
          "Alterar " + rotulo + " de \"" + (valorAtual || "vazio") + "\" para \"" + (novo || "vazio") + "\"?",
          function () { registrarRascunho(etapaIdx, chave, rotulo, valorAtual, novo, celula, valorSpan); },
          function () { /* cancelou: mantém o valor original na tela */ }
        );
      }
      input.addEventListener("blur", finalizar);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") input.blur();
        if (e.key === "Escape") { jaTratou = true; input.remove(); valorSpan.style.display = ""; }
      });
    });
  });
}

// Guarda a alteração no rascunho (não grava no banco) e reflete na tela
function registrarRascunho(etapaIdx, chave, rotulo, valorAntigo, novoValor, celula, valorSpan) {
  // Remove rascunho anterior do mesmo campo (se editou 2x, vale o último)
  rascunho = rascunho.filter(function (r) {
    return !(r.etapaIdx === etapaIdx && r.chave === chave);
  });
  // Descobre o valor ORIGINAL (do banco), para saber se voltou ao original
  const original = valorOriginalCampo(etapaIdx, chave);
  if (novoValor !== original) {
    rascunho.push({
      etapaIdx: etapaIdx,
      chave: chave,
      campo: rotulo,
      de: original,
      para: novoValor
    });
  }
  // Reflete na tela
  valorSpan.textContent = novoValor || "—";
  celula.setAttribute("data-valor", novoValor);
  atualizarBotaoVoltar();
}

function valorOriginalCampo(etapaIdx, chave) {
  const etapa = (opNoResumo.etapas || [])[etapaIdx];
  const ap = (etapa && etapa.apontamentos) || {};
  return (ap[chave] === undefined || ap[chave] === null) ? "" : String(ap[chave]);
}

btnVoltarPcp.addEventListener("click", function () {
  // Se está corrigindo e há rascunho, oferece Salvar/Descartar/Cancelar
  if (modoCorrecao && rascunho.length > 0) {
    const resumoMudancas = rascunho.map(function (r) {
      return "• Etapa " + (r.etapaIdx + 1) + " · " + r.campo + ": " + (r.de || "vazio") + " → " + (r.para || "vazio");
    }).join("\n");
    confirmar3(
      "Você fez alterações nesta OP:\n\n" + resumoMudancas + "\n\nDeseja salvar?",
      salvarRascunhoEVoltar,
      voltarSemSalvar
    );
    return;
  }
  voltarSemSalvar();
});

function voltarSemSalvar() {
  pcpResumo.style.display = "none";
  pcpPrincipal.style.display = "block";
  conteudoResumo.innerHTML = "";
  opNoResumo = null;
  modoCorrecao = false;
  rascunho = [];
  btnVoltarPcp.textContent = "← Voltar para a lista";
  montarListas(opsCarregadas);
  window.scrollTo(0, 0);
}

// Grava o rascunho no banco (valores + registro de auditoria) e volta
async function salvarRascunhoEVoltar() {
  try {
    const referencia = doc(db, "ordens_producao", opNoResumo._id);
    const atual = await getDoc(referencia);
    const dados = atual.data();

    // Aplica cada alteração do rascunho nas etapas
    rascunho.forEach(function (r) {
      if (!dados.etapas[r.etapaIdx].apontamentos) dados.etapas[r.etapaIdx].apontamentos = {};
      dados.etapas[r.etapaIdx].apontamentos[r.chave] = r.para;
    });

    // Registro de auditoria (agrupado)
    const emailPcp = window.emailPcpLogado || "desconhecido";
    const historico = dados.historicoPcp || [];
    historico.push({
      acao: "corrigiu",
      autor: emailPcp,
      em: new Date().toISOString(),
      mudancas: rascunho.map(function (r) {
        return { etapa: r.etapaIdx + 1, campo: r.campo, de: r.de || "vazio", para: r.para || "vazio" };
      })
    });

    await updateDoc(referencia, { etapas: dados.etapas, historicoPcp: historico });
  } catch (erro) {
    console.error("Erro ao salvar alterações:", erro);
    alert("Não foi possível salvar as alterações: " + erro.message);
    return; // não sai da tela se deu erro
  }
  voltarSemSalvar();
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

async function salvarDocs() {
  btnSalvarDocs.disabled = true;
  msgDocs.textContent = "Salvando…";
  msgDocs.className = "msg-salvar";
  try {
    const referencia = doc(db, "ordens_producao", opNoResumo._id);

    const nomesAdicionados = [];
    for (let i = 0; i < docsNovos.length; i++) {
      const arq = docsNovos[i];
      const caminho = "ops/" + opNoResumo.numero + "/" + Date.now() + "_" + arq.name;
      const referenciaArq = ref(storage, caminho);
      await uploadBytes(referenciaArq, arq);
      const url = await getDownloadURL(referenciaArq);
      docsDaOp.push({ nome: arq.name, url: url, caminho: caminho });
      nomesAdicionados.push(arq.name);
    }

    const emailPcp = window.emailPcpLogado || "desconhecido";
    const atual = await getDoc(referencia);
    const historico = (atual.data().historicoPcp) || [];

    if (nomesAdicionados.length > 0 || docsRemovidos.length > 0) {
      historico.push({
        acao: "documentos",
        autor: emailPcp,
        em: new Date().toISOString(),
        adicionados: nomesAdicionados,
        removidos: docsRemovidos.slice()
      });
    }

    await updateDoc(referencia, { documentos: docsDaOp, historicoPcp: historico });

    opNoResumo = atual.data();
    opNoResumo.documentos = docsDaOp;
    opNoResumo.historicoPcp = historico;
    opNoResumo._id = referencia.id;

    fecharModalDocs();
    desenharResumo();
  } catch (erro) {
    console.error("Erro ao salvar documentos:", erro);
    msgDocs.textContent = "❌ Erro ao salvar: " + erro.message;
    msgDocs.className = "msg-salvar erro-msg";
    btnSalvarDocs.disabled = false;
  }
}

function montarResumo(op, emCorrecao) {
  const info = statusDaOP(op);
  let html = "";
  html += "<div class='op-aberta-cabecalho'><h2>OP " + (op.numero || "—") + "</h2>";
  html += "<p>" + info.texto + "</p></div>";

  if (!emCorrecao && op.status !== "finalizada_arquivada") {
    html += "<div class='acoes-docs'><button id='btn-docs' class='botao-docs'>📎 Documentos" +
      (op.documentos && op.documentos.length > 0 ? " (" + op.documentos.length + ")" : "") +
      "</button></div>";
  }

  if (emCorrecao) {
    html += "<div class='aviso-correcao'>✎ Modo de correção — clique num campo de apontamento (em azul) para editá-lo. As alterações só serão gravadas ao clicar em “Salvar e voltar”.</div>";
  }

  if (op.status === "finalizada_aguardando_pcp") {
    html += "<div class='acoes-pcp'>";
    if (!emCorrecao) {
      html += "<button id='btn-corrigir' class='botao-corrigir'>Corrigir OP</button>";
      html += "<button id='btn-arquivar' class='botao-arquivar'>Arquivar OP</button>";
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
    op.etapas.forEach(function (etapa, indice) { html += montarEtapaResumo(etapa, indice, emCorrecao); });
  } else {
    html += "<p class='texto-vazio'>Sem etapas registradas.</p>";
  }
  html += "</div>";

  if (op.documentos && op.documentos.length > 0) {
    html += "<div class='cartao'><h3>Documentos</h3><div class='lista-docs-resumo'>";
    op.documentos.forEach(function (d) {
      html += "<a class='doc-link' href='" + d.url + "' target='_blank' rel='noopener'>📄 " + d.nome + "</a>";
    });
    html += "</div></div>";
  }

  // Registros de FF (um botão por FF que tem registro nesta OP)
  if (op.registrosFF && op.registrosFF.length > 0) {
    const contagem = {};
    op.registrosFF.forEach(function (r) { contagem[r.ff] = (contagem[r.ff] || 0) + 1; });
    html += "<div class='cartao'><h3>Registros de FF</h3><div class='botoes-ff'>";
    Object.keys(contagem).forEach(function (codigo) {
      const def = DEF_FF[codigo];
      const nome = def ? def.nome : codigo;
      html += "<button class='botao-ff' data-ff='" + codigo + "'>📋 " + nome + " (" + contagem[codigo] + ")</button>";
    });
    html += "</div></div>";
  }

  if (op.historicoPcp && op.historicoPcp.length > 0) {
    html += "<div class='cartao'><h3>Histórico do PCP</h3>";
    op.historicoPcp.slice().reverse().forEach(function (h) {
      if (h.acao === "documentos") {
        html += "<div class='bloco-historico'>";
        html += "<p class='linha-historico'>" + formatarDataHora(h.em) + " — <strong>" + h.autor + "</strong> atualizou documentos:</p>";
        html += "<ul class='lista-mudancas'>";
        (h.adicionados || []).forEach(function (nome) { html += "<li>➕ adicionou: " + nome + "</li>"; });
        (h.removidos || []).forEach(function (nome) { html += "<li>➖ removeu: " + nome + "</li>"; });
        html += "</ul></div>";
      } else if (h.acao === "corrigiu" && h.mudancas && h.mudancas.length > 0) {
        html += "<div class='bloco-historico'>";
        html += "<p class='linha-historico'>" + formatarDataHora(h.em) + " — <strong>" + h.autor + "</strong> corrigiu:</p>";
        html += "<ul class='lista-mudancas'>";
        h.mudancas.forEach(function (m) {
          html += "<li>Etapa " + m.etapa + " · " + m.campo + ": " + m.de + " → " + m.para + "</li>";
        });
        html += "</ul></div>";
      } else {
        html += "<p class='linha-historico'>" + formatarDataHora(h.em) + " — <strong>" + h.autor + "</strong> " + h.acao + "</p>";
      }
    });
    html += "</div>";
  }

  return html;
}

function montarEtapaResumo(etapa, indice, emCorrecao) {
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
  h += campoEditavel(indice, "horaInicio", "Hora início (apontada)", ap.horaInicio, "time", emCorrecao, ap.horaInicioData);
  h += campoEditavel(indice, "horaFim", "Hora fim (apontada)", ap.horaFim, "time", emCorrecao, ap.horaFimData);
  h += campoEditavel(indice, "qtdeProduzida", "Qtde produzida", ap.qtdeProduzida, "number", emCorrecao);
  h += campoEditavel(indice, "qtdePerda", "Perdas", ap.qtdePerda, "number", emCorrecao);
  h += campoLargo("Motivo da perda", ap.motivoPerda ? (ap.motivoPerda + " — " + (MOTIVOS_PERDA[ap.motivoPerda] || "")) : null);
  h += "</div>";

  if (ap.paradas && ap.paradas.length > 0) {
    h += "<div class='etapa-paradas'><span class='etapa-subtitulo'>Paradas</span>";
    ap.paradas.forEach(function (p, i) {
      const motivo = p.motivo ? (p.motivo + " — " + (MOTIVOS_PARADA[p.motivo] || "")) : "—";
      h += "<div class='parada-resumo'>Parada " + (i + 1) + ": " + horaComData(p.inicio, p.inicioData) + " às " + horaComData(p.fim, p.fimData) + " · " + motivo + "</div>";
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

function campo(rotulo, valor) {
  return "<div class='campo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + (valor || "—") + "</span></div>";
}
function campoLargo(rotulo, valor) {
  return "<div class='campo campo-largo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + (valor || "—") + "</span></div>";
}
function campoEditavel(etapaIdx, chave, rotulo, valor, tipo, emCorrecao, dataApontada) {
  const mostrado = (tipo === "time" && !emCorrecao) ? horaComData(valor, dataApontada) : (valor || "—");
  if (!emCorrecao) {
    return "<div class='campo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + mostrado + "</span></div>";
  }
  return "<div class='campo campo-editavel' data-etapa='" + etapaIdx + "' data-chave='" + chave +
         "' data-rotulo='" + rotulo + "' data-tipo='" + tipo + "' data-valor='" + (valor || "") + "'>" +
         "<span class='rotulo'>" + rotulo + " ✎</span><span class='valor'>" + mostrado + "</span></div>";
}

function statusDaOP(op) {
  if (op.status === "finalizada_arquivada") return { texto: "Finalizada – arquivada", classe: "st-arquivada", selo: "selo-arquivada" };
  if (op.status === "finalizada_aguardando_pcp") return { texto: "Finalizada – aguardando PCP", classe: "st-aguardando", selo: "selo-aguardando" };
  const etapa = etapaAtualDa(op);
  const nomeEtapa = etapa ? etapa.operacao : "—";
  if (!dataAberturaOP(op)) {
    return { texto: "Ativa — aguardando 1º operador", classe: "st-nao-iniciada", selo: "selo-cinza" };
  }
  if (etapa && etapa.status === "em_producao") {
    return { texto: "Ativa — " + nomeEtapa + ": em produção por " + (etapa.operadorNome || "operador"), classe: "st-ativa", selo: "selo-verde" };
  }
  return { texto: "Ativa — " + nomeEtapa + ": aguardando alocação", classe: "st-ativa", selo: "selo-azul" };
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
function horaComData(hora, dataISO) {
  if (!hora) return "—";
  if (!dataISO) return hora;
  const p = String(dataISO).split("-");
  return (p.length === 3) ? (p[2] + "/" + p[1] + "/" + p[0] + " " + hora) : hora;
}
function formatarDataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
