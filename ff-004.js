// ==========================================================
//  FF-004 — Autocontrole e Descanso na Sinterização
//  Duas abas (Sinterização / Descanso), linha de inclusão + assinaturas
// ==========================================================

import { db } from "./firebase.js";
import {
  collection, onSnapshot, addDoc, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const CODIGO_FF = "ff004";
const NOME_FF = "Autocontrole e Descanso na Sinterização";

const statusConexao = document.getElementById("status-conexao");
const btnNovoRegistro = document.getElementById("btn-novo-registro");

// Modal de assinatura ampliada
const modalAssinatura = document.getElementById("modal-assinatura");
const modalAssinTitulo = document.getElementById("modal-assin-titulo");
const modalAssinConteudo = document.getElementById("modal-assin-conteudo");
document.getElementById("modal-assin-fechar").addEventListener("click", function () {
  modalAssinatura.style.display = "none";
});
modalAssinatura.addEventListener("click", function (e) {
  if (e.target === modalAssinatura) modalAssinatura.style.display = "none";
});

let opsDisponiveis = [];
let registros = { sinterizacao: [], descanso: [] };
let abaAtual = "sinterizacao";
let inclusaoAberta = { sinterizacao: false, descanso: false };
// guarda os canvas de assinatura da linha em edição
let assinaturasEdicao = {};

// Definição das colunas de cada aba (campo = fica em campos{}; assinatura = canvas)
const DEF = {
  sinterizacao: {
    corpoInclusao: "corpo-inclusao-sint",
    corpoTabela: "corpo-tabela-sint",
    areaInclusao: "area-inclusao-sint",
    areaAssinaturas: "assinaturas-sint",
    vazio: "vazio-sint",
    colunas: [
      { rot: "Data Entrada", campo: "dataEntrada", tipo: "date" },
      { rot: "Hora Entrada", campo: "horaEntrada", tipo: "time" },
      { rot: "Nº OP", campo: "op", tipo: "op" },
      { rot: "Nº Bandeja", campo: "bandeja", tipo: "text" },
      { rot: "Sub-lote", campo: "subLote", tipo: "text" },
      { rot: "Parede (mm)", campo: "parede", tipo: "text" },
      { rot: "Visto Moldagem", campo: "vistoMoldagem", tipo: "assinatura" },
      { rot: "Hora Ent. Forno", campo: "horaEntradaForno", tipo: "time" },
      { rot: "Data Ent. Forno", campo: "dataEntradaForno", tipo: "date" },
      { rot: "Nº Forno", campo: "forno", tipo: "text" },
      { rot: "Hora Saída Forno", campo: "horaSaidaForno", tipo: "time" },
      { rot: "Data Saída Forno", campo: "dataSaidaForno", tipo: "date" },
      { rot: "Visto Controlador", campo: "vistoControlador", tipo: "assinatura" },
      { rot: "ID Gráfico", campo: "idGrafico", tipo: "text" }
    ]
  },
  descanso: {
    corpoInclusao: "corpo-inclusao-desc",
    corpoTabela: "corpo-tabela-desc",
    areaInclusao: "area-inclusao-desc",
    areaAssinaturas: "assinaturas-desc",
    vazio: "vazio-desc",
    colunas: [
      { rot: "Data Entrada", campo: "dataEntrada", tipo: "date" },
      { rot: "Hora Entrada", campo: "horaEntrada", tipo: "time" },
      { rot: "Nº OP", campo: "op", tipo: "op" },
      { rot: "Nº Bandeja", campo: "bandeja", tipo: "text" },
      { rot: "Parede (mm)", campo: "parede", tipo: "text" },
      { rot: "Hora Saída", campo: "horaSaida", tipo: "time" },
      { rot: "Data Saída", campo: "dataSaida", tipo: "date" },
      { rot: "Visto Controlador", campo: "vistoControlador", tipo: "assinatura" }
    ]
  }
};

// ----------------------------------------------------------
//  Abas
// ----------------------------------------------------------
document.querySelectorAll(".aba-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    abaAtual = btn.getAttribute("data-aba");
    document.querySelectorAll(".aba-btn").forEach(function (b) { b.classList.remove("ativa"); });
    btn.classList.add("ativa");
    document.getElementById("aba-sinterizacao").style.display = (abaAtual === "sinterizacao") ? "block" : "none";
    document.getElementById("aba-descanso").style.display = (abaAtual === "descanso") ? "block" : "none";
  });
});

// ----------------------------------------------------------
//  Carrega OPs (dropdown) — todas menos arquivadas
// ----------------------------------------------------------
onSnapshot(collection(db, "ordens_producao"), function (resultado) {
  opsDisponiveis = [];
  resultado.forEach(function (documento) {
    const dados = documento.data();
    dados._id = documento.id;
    if (dados.status !== "finalizada_arquivada") opsDisponiveis.push(dados);
  });
  opsDisponiveis.sort(function (a, b) {
    return String(a.numero || "").localeCompare(String(b.numero || ""));
  });
}, function (erro) { console.error("Erro ao carregar OPs:", erro); });

// ----------------------------------------------------------
//  Carrega registros dos últimos 30 dias
// ----------------------------------------------------------
onSnapshot(collection(db, "registros_ff"), function (resultado) {
  const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
  registros = { sinterizacao: [], descanso: [] };
  resultado.forEach(function (documento) {
    const d = documento.data();
    if (d.ff !== CODIGO_FF) return;
    const t = d.criadoEm ? new Date(d.criadoEm).getTime() : 0;
    if (t < limite) return;
    d._id = documento.id;
    const aba = (d.aba === "descanso") ? "descanso" : "sinterizacao";
    registros[aba].push(d);
  });
  ["sinterizacao", "descanso"].forEach(function (aba) {
    registros[aba].sort(function (a, b) {
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
    });
    desenharHistorico(aba);
  });
  const total = registros.sinterizacao.length + registros.descanso.length;
  statusConexao.textContent = "✅ Conectado. " + total + " registro(s) nos últimos 30 dias.";
}, function (erro) {
  console.error("Erro ao carregar registros:", erro);
  statusConexao.textContent = "❌ Não foi possível carregar os registros.";
  statusConexao.className = "status erro-msg";
});

// ----------------------------------------------------------
//  Histórico
// ----------------------------------------------------------
function desenharHistorico(aba) {
  const def = DEF[aba];
  const corpo = document.getElementById(def.corpoTabela);
  const vazio = document.getElementById(def.vazio);
  const lista = registros[aba];

  if (lista.length === 0) {
    corpo.innerHTML = "";
    vazio.style.display = "block";
    return;
  }
  vazio.style.display = "none";

  let html = "";
  lista.forEach(function (r) {
    const c = r.campos || {};
    html += "<tr>";
    def.colunas.forEach(function (col) {
      if (col.tipo === "assinatura") {
        const assinatura = c[col.campo];
        if (assinatura) {
          html += "<td><button class='btn-ver-assin' data-assin='" + col.campo + "' data-id='" + r._id + "' data-aba='" + aba + "'>assinado ✓</button></td>";
        } else {
          html += "<td>—</td>";
        }
      } else if (col.tipo === "op") {
        html += "<td>" + tx(r.numeroOp) + "</td>";
      } else {
        html += "<td>" + tx(c[col.campo]) + "</td>";
      }
    });
    html += "</tr>";
  });
  corpo.innerHTML = html;

  // liga os botões "assinado ✓"
  corpo.querySelectorAll(".btn-ver-assin").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = btn.getAttribute("data-id");
      const campo = btn.getAttribute("data-assin");
      const abaB = btn.getAttribute("data-aba");
      const reg = registros[abaB].find(function (x) { return x._id === id; });
      if (reg && reg.campos && reg.campos[campo]) {
        modalAssinTitulo.textContent = (campo === "vistoMoldagem") ? "Visto Moldagem" : "Visto Controlador";
        modalAssinConteudo.innerHTML = "<img src='" + reg.campos[campo] + "' alt='Assinatura' style='max-width:100%; border:1px solid #e1e5ea; border-radius:8px;'>";
        modalAssinatura.style.display = "flex";
      }
    });
  });
}

// ----------------------------------------------------------
//  Inclusão
// ----------------------------------------------------------
btnNovoRegistro.addEventListener("click", function () {
  if (inclusaoAberta[abaAtual]) return;
  inclusaoAberta[abaAtual] = true;
  abrirInclusao(abaAtual);
});

function abrirInclusao(aba) {
  const def = DEF[aba];
  const corpoInc = document.getElementById(def.corpoInclusao);
  const areaInc = document.getElementById(def.areaInclusao);
  const areaAssin = document.getElementById(def.areaAssinaturas);

  let opcoes = "<option value=''>Selecione…</option>";
  opsDisponiveis.forEach(function (op) {
    opcoes += "<option value='" + op._id + "'>OP " + tx(op.numero) + "</option>";
  });

  let h = "<tr class='linha-nova'>";
  def.colunas.forEach(function (col) {
    if (col.tipo === "assinatura") {
      h += "<td class='cel-assin' id='cel-" + aba + "-" + col.campo + "'>✎ abaixo</td>";
    } else if (col.tipo === "op") {
      h += "<td><select class='in-mini' id='in-" + aba + "-op'>" + opcoes + "</select></td>";
    } else {
      h += "<td><input type='" + col.tipo + "' class='in-mini' id='in-" + aba + "-" + col.campo + "'></td>";
    }
  });
  h += "<td class='col-acoes'></td></tr>";
  corpoInc.innerHTML = h;

  // pré-preenche a data de entrada com hoje
  const inData = document.getElementById("in-" + aba + "-dataEntrada");
  if (inData) inData.value = dataHoje();

  // monta os blocos de assinatura abaixo da linha
  assinaturasEdicao = {};
  let ha = "";
  def.colunas.forEach(function (col) {
    if (col.tipo === "assinatura") {
      ha += "<div class='bloco-assin'>";
      ha += "<label>" + col.rot + "</label>";
      ha += "<canvas class='canvas-assin' id='canvas-" + aba + "-" + col.campo + "'></canvas>";
      ha += "<button class='btn-limpar-assin' data-campo='" + col.campo + "'>Limpar</button>";
      ha += "</div>";
    }
  });
  areaAssin.innerHTML = ha;

  // prepara cada canvas
  def.colunas.forEach(function (col) {
    if (col.tipo === "assinatura") {
      prepararCanvas(aba, col.campo);
    }
  });
  areaAssin.querySelectorAll(".btn-limpar-assin").forEach(function (btn) {
    btn.addEventListener("click", function () {
      limparCanvas(aba, btn.getAttribute("data-campo"));
    });
  });

  areaInc.style.display = "block";

  document.getElementById("btn-salvar-" + (aba === "sinterizacao" ? "sint" : "desc")).onclick = function () { salvarRegistro(aba); };
  document.getElementById("btn-cancelar-" + (aba === "sinterizacao" ? "sint" : "desc")).onclick = function () { fecharInclusao(aba); };
}

function fecharInclusao(aba) {
  const def = DEF[aba];
  inclusaoAberta[aba] = false;
  document.getElementById(def.corpoInclusao).innerHTML = "";
  document.getElementById(def.areaAssinaturas).innerHTML = "";
  document.getElementById(def.areaInclusao).style.display = "none";
  assinaturasEdicao = {};
}

// ----------------------------------------------------------
//  Canvas de assinatura
// ----------------------------------------------------------
function prepararCanvas(aba, campo) {
  const canvas = document.getElementById("canvas-" + aba + "-" + campo);
  canvas.width = canvas.offsetWidth || 300;
  canvas.height = 140;
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1f2933";
  const estado = { ctx: ctx, canvas: canvas, vazio: true };
  assinaturasEdicao[campo] = estado;

  let desenhando = false;
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function comecar(e) { e.preventDefault(); desenhando = true; estado.vazio = false; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function mover(e) { if (!desenhando) return; e.preventDefault(); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  function parar() { desenhando = false; }
  canvas.addEventListener("mousedown", comecar);
  canvas.addEventListener("mousemove", mover);
  canvas.addEventListener("mouseup", parar);
  canvas.addEventListener("mouseleave", parar);
  canvas.addEventListener("touchstart", comecar, { passive: false });
  canvas.addEventListener("touchmove", mover, { passive: false });
  canvas.addEventListener("touchend", parar);
}

function limparCanvas(aba, campo) {
  const estado = assinaturasEdicao[campo];
  if (estado) {
    estado.ctx.clearRect(0, 0, estado.canvas.width, estado.canvas.height);
    estado.vazio = true;
  }
}

// ----------------------------------------------------------
//  Salvar
// ----------------------------------------------------------
async function salvarRegistro(aba) {
  const def = DEF[aba];
  const opSel = document.getElementById("in-" + aba + "-op");
  const op = opsDisponiveis.find(function (o) { return o._id === opSel.value; });
  const dataEntrada = document.getElementById("in-" + aba + "-dataEntrada").value;

  if (!op) { alert("Selecione a Ordem de Produção."); return; }
  if (!dataEntrada) { alert("Informe a data de entrada."); return; }

  const btnSalvar = document.getElementById("btn-salvar-" + (aba === "sinterizacao" ? "sint" : "desc"));
  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando…";

  // trava: reconfere se a OP não foi arquivada
  try {
    const snapOp = await getDoc(doc(db, "ordens_producao", op._id));
    if (!snapOp.exists() || snapOp.data().status === "finalizada_arquivada") {
      alert("Esta OP foi arquivada e não pode mais receber registros.");
      fecharInclusao(aba);
      return;
    }
  } catch (eVerif) {
    console.error("Erro ao verificar OP:", eVerif);
    alert("Não foi possível verificar a OP. Tente novamente.");
    btnSalvar.disabled = false; btnSalvar.textContent = "Salvar registro";
    return;
  }

  // monta os campos
  const campos = {};
  def.colunas.forEach(function (col) {
    if (col.tipo === "op") return; // vai em numeroOp/opId
    if (col.tipo === "assinatura") {
      const estado = assinaturasEdicao[col.campo];
      campos[col.campo] = (estado && !estado.vazio) ? estado.canvas.toDataURL("image/png") : "";
    } else {
      const el = document.getElementById("in-" + aba + "-" + col.campo);
      campos[col.campo] = el ? el.value : "";
    }
  });

  const registro = {
    ff: CODIGO_FF,
    nomeFf: NOME_FF,
    aba: aba,
    opId: op._id,
    numeroOp: op.numero || "",
    cliente: op.cliente || "",
    criadoEm: new Date().toISOString(),
    campos: campos
  };

  try {
    await addDoc(collection(db, "registros_ff"), registro);
    try {
      const refOp = doc(db, "ordens_producao", op._id);
      const snap = await getDoc(refOp);
      if (snap.exists()) {
        const lista = (snap.data().registrosFF) || [];
        lista.push({
          ff: CODIGO_FF, nomeFf: NOME_FF, aba: aba,
          criadoEm: registro.criadoEm, campos: campos
        });
        await updateDoc(refOp, { registrosFF: lista });
      }
    } catch (e2) {
      console.error("Registro salvo, mas falhou ao espelhar na OP:", e2);
    }
    fecharInclusao(aba);
  } catch (erro) {
    console.error("Erro ao salvar registro:", erro);
    alert("Erro ao salvar: " + erro.message);
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar registro";
  }
}

// ----------------------------------------------------------
//  Auxiliares
// ----------------------------------------------------------
function tx(v) {
  if (v === undefined || v === null || String(v).trim() === "") return "—";
  return String(v);
}
function dataHoje() {
  const h = new Date();
  return h.getFullYear() + "-" + String(h.getMonth() + 1).padStart(2, "0") + "-" + String(h.getDate()).padStart(2, "0");
}
