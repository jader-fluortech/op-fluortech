// ==========================================================
//  FF-008 — Relatório de liberação (Ranhura e Corte)
//  Duas abas (Ranhura / Corte). Cada registro é um cartão de
//  liberação: características × Especificado/Encontrado/Laudo.
//  Laudo = botão manual Aprovado / Reprovado.
//  Os dados são gravados achatados em campos{} para o PCP ler.
// ==========================================================

import { db } from "./firebase.js";
import {
  collection, onSnapshot, addDoc, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const CODIGO_FF = "ff008";
const NOME_FF = "Relatório de liberação — Ranhura e Corte";

const statusConexao = document.getElementById("status-conexao");
const btnNovoRegistro = document.getElementById("btn-novo-registro");

let opsDisponiveis = [];
let registros = { ranhura: [], corte: [] };
let abaAtual = "ranhura";
let inclusaoAberta = { ranhura: false, corte: false };
let laudoSel = {}; // chave -> "Aprovado" / "Reprovado"

// Características de cada aba (viram linhas do cartão)
const DEF = {
  ranhura: {
    area: "area-inclusao-ranhura",
    hist: "hist-ranhura",
    vazio: "vazio-ranhura",
    comEsp: true,
    caracteristicas: [
      { chave: "qtd", rot: "Quantidade de Ranhuras" },
      { chave: "largL1", rot: "Largura — Lado 1" },
      { chave: "largL2", rot: "Largura — Lado 2" },
      { chave: "profL1", rot: "Profundidade — Lado 1" },
      { chave: "profL2", rot: "Profundidade — Lado 2" }
    ]
  },
  corte: {
    area: "area-inclusao-corte",
    hist: "hist-corte",
    vazio: "vazio-corte",
    comEsp: false,
    caracteristicas: [
      { chave: "reto", rot: "Ângulo reto (90°)" },
      { chave: "agudo", rot: "Ângulo agudo (menor que 90°)" },
      { chave: "z", rot: "Corte forma Z" }
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
    document.getElementById("aba-ranhura").style.display = (abaAtual === "ranhura") ? "block" : "none";
    document.getElementById("aba-corte").style.display = (abaAtual === "corte") ? "block" : "none";
  });
});

// ----------------------------------------------------------
//  Carrega OPs (dropdown) — todas menos arquivadas e já iniciadas
// ----------------------------------------------------------
onSnapshot(collection(db, "ordens_producao"), function (resultado) {
  opsDisponiveis = [];
  resultado.forEach(function (documento) {
    const dados = documento.data();
    dados._id = documento.id;
    if (dados.status !== "finalizada_arquivada" && opFoiIniciada(dados)) opsDisponiveis.push(dados);
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
  registros = { ranhura: [], corte: [] };
  resultado.forEach(function (documento) {
    const d = documento.data();
    if (d.ff !== CODIGO_FF) return;
    const t = d.criadoEm ? new Date(d.criadoEm).getTime() : 0;
    if (t < limite) return;
    d._id = documento.id;
    const aba = (d.aba === "corte") ? "corte" : "ranhura";
    registros[aba].push(d);
  });
  ["ranhura", "corte"].forEach(function (aba) {
    registros[aba].sort(function (a, b) {
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
    });
    desenharHistorico(aba);
  });
  const total = registros.ranhura.length + registros.corte.length;
  statusConexao.textContent = "✅ Conectado. " + total + " registro(s) nos últimos 30 dias.";
}, function (erro) {
  console.error("Erro ao carregar registros:", erro);
  statusConexao.textContent = "❌ Não foi possível carregar os registros.";
  statusConexao.className = "status erro-msg";
});

// ----------------------------------------------------------
//  Histórico (cartões só-leitura)
// ----------------------------------------------------------
function desenharHistorico(aba) {
  const def = DEF[aba];
  const cont = document.getElementById(def.hist);
  const vazio = document.getElementById(def.vazio);
  const lista = registros[aba];

  if (lista.length === 0) { cont.innerHTML = ""; vazio.style.display = "block"; return; }
  vazio.style.display = "none";

  let html = "";
  lista.forEach(function (r) {
    const c = r.campos || {};
    html += "<div class='ff008-card-hist'>";
    html += "<div class='ff008-card-topo'><strong>OP " + tx(c.numeroOp || r.numeroOp) + "</strong><span>" + dataBR(c.data) + "</span></div>";
    html += "<div class='ff008-card-sub'>Cliente: " + tx(c.cliente || r.cliente) + " · Desenho: " + tx(c.desenho) + "</div>";
    html += "<div class='tabela-wrap'><table class='tabela-ff'><thead><tr><th>Característica</th>";
    if (def.comEsp) html += "<th>Especificado</th>";
    html += "<th>Encontrado</th><th>Laudo</th></tr></thead><tbody>";
    def.caracteristicas.forEach(function (car) {
      html += "<tr><td>" + car.rot + "</td>";
      if (def.comEsp) html += "<td>" + tx(c[car.chave + "Esp"]) + "</td>";
      html += "<td>" + tx(c[car.chave + "Enc"]) + "</td>";
      html += "<td>" + pilulaLaudo(c[car.chave + "Laudo"]) + "</td></tr>";
    });
    html += "</tbody></table></div>";
    html += "<div class='ff008-card-rod'>Responsável: " + tx(c.responsavel) + " · Dispositivo: " + tx(c.dispositivo) + " · Instrumento: " + tx(c.instrumento) + " · Data: " + dataBR(c.dataRodape) + "</div>";
    if (c.diarioBordo && String(c.diarioBordo).trim()) {
      html += "<div class='ff008-card-rod'>Diário de bordo: " + tx(c.diarioBordo) + "</div>";
    }
    html += "</div>";
  });
  cont.innerHTML = html;
}

// ----------------------------------------------------------
//  Inclusão (cartão editável)
// ----------------------------------------------------------
btnNovoRegistro.addEventListener("click", function () {
  if (inclusaoAberta[abaAtual]) return;
  inclusaoAberta[abaAtual] = true;
  abrirInclusao(abaAtual);
});

function opcoesOp() {
  let o = "<option value=''>Selecione…</option>";
  opsDisponiveis.forEach(function (op) {
    o += "<option value='" + op._id + "'>OP " + tx(op.numero) + "</option>";
  });
  return o;
}

function botoesLaudo(chave) {
  return "<div class='laudo-grupo'>" +
    "<button type='button' class='btn-laudo' data-chave='" + chave + "' data-val='Aprovado'>Aprov.</button>" +
    "<button type='button' class='btn-laudo' data-chave='" + chave + "' data-val='Reprovado'>Reprov.</button>" +
    "</div>";
}

function estilizarLaudo(btn, ligado) {
  const val = btn.getAttribute("data-val");
  if (!ligado) { btn.style.background = "#fff"; btn.style.color = "#1f2933"; btn.style.borderColor = "#c9d2dc"; return; }
  if (val === "Aprovado") { btn.style.background = "#e3f5ea"; btn.style.color = "#0b7a3b"; btn.style.borderColor = "#0b7a3b"; }
  else { btn.style.background = "#fdeaea"; btn.style.color = "#b3261e"; btn.style.borderColor = "#b3261e"; }
}

function abrirInclusao(aba) {
  const def = DEF[aba];
  laudoSel = {};
  const area = document.getElementById(def.area);
  const titulo = (aba === "ranhura") ? "Ranhura" : "Corte";

  let h = "<h2 class='ff-subtitulo'>Novo registro — " + titulo + "</h2>";

  // cabeçalho
  h += "<div class='ff008-cab'>";
  h += "<div class='ff008-campo'><label>Ordem de Produção</label><select class='in-mini' id='in-" + aba + "-op'>" + opcoesOp() + "</select></div>";
  h += "<div class='ff008-campo'><label>Cliente</label><input class='in-mini' id='in-" + aba + "-cliente' readonly></div>";
  h += "<div class='ff008-campo'><label>Desenho</label><input class='in-mini' id='in-" + aba + "-desenho'></div>";
  h += "<div class='ff008-campo'><label>Data</label><input type='date' class='in-mini' id='in-" + aba + "-data'></div>";
  h += "</div>";

  // tabela de características
  h += "<div class='tabela-wrap'><table class='tabela-ff'><thead><tr><th>Característica</th>";
  if (def.comEsp) h += "<th>Especificado</th>";
  h += "<th>Encontrado</th><th>Laudo</th></tr></thead><tbody>";
  def.caracteristicas.forEach(function (car) {
    h += "<tr><td>" + car.rot + "</td>";
    if (def.comEsp) h += "<td><input class='in-mini' id='in-" + aba + "-" + car.chave + "-esp'></td>";
    h += "<td><input class='in-mini' id='in-" + aba + "-" + car.chave + "-enc'></td>";
    h += "<td>" + botoesLaudo(car.chave) + "</td></tr>";
  });
  h += "</tbody></table></div>";

  // rodapé
  h += "<div class='ff008-cab'>";
  h += "<div class='ff008-campo'><label>Responsável</label><input class='in-mini' id='in-" + aba + "-responsavel'></div>";
  h += "<div class='ff008-campo'><label>Dispositivo</label><input class='in-mini' id='in-" + aba + "-dispositivo'></div>";
  h += "<div class='ff008-campo'><label>Instrumento Utilizado</label><input class='in-mini' id='in-" + aba + "-instrumento'></div>";
  h += "<div class='ff008-campo'><label>Data</label><input type='date' class='in-mini' id='in-" + aba + "-dataRodape'></div>";
  h += "</div>";
  h += "<div class='ff008-campo' style='margin-bottom:12px;'><label>Diário de bordo</label><textarea class='in-mini' id='in-" + aba + "-diarioBordo' rows='2'></textarea></div>";

  // ações
  h += "<div class='acoes-inclusao'><button class='btn-linha-salvar' id='btn-salvar-" + aba + "'>Salvar registro</button>";
  h += "<button class='btn-linha-cancelar' id='btn-cancelar-" + aba + "'>Cancelar</button></div>";

  area.innerHTML = h;
  area.style.display = "block";

  // datas pré-preenchidas com hoje (fuso local)
  document.getElementById("in-" + aba + "-data").value = dataHoje();
  document.getElementById("in-" + aba + "-dataRodape").value = dataHoje();

  // OP selecionada → preenche Cliente e Desenho
  const sel = document.getElementById("in-" + aba + "-op");
  sel.addEventListener("change", function () {
    const op = opsDisponiveis.find(function (o) { return o._id === sel.value; });
    document.getElementById("in-" + aba + "-cliente").value = op ? (op.cliente || "") : "";
    const inDes = document.getElementById("in-" + aba + "-desenho");
    if (op && op.desenho && !inDes.value) inDes.value = op.desenho;
  });

  // botões de laudo
  area.querySelectorAll(".btn-laudo").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const chave = btn.getAttribute("data-chave");
      const val = btn.getAttribute("data-val");
      laudoSel[chave] = val;
      area.querySelectorAll(".btn-laudo[data-chave='" + chave + "']").forEach(function (b) {
        estilizarLaudo(b, b.getAttribute("data-val") === val);
      });
    });
  });

  document.getElementById("btn-salvar-" + aba).onclick = function () { salvarRegistro(aba); };
  document.getElementById("btn-cancelar-" + aba).onclick = function () { fecharInclusao(aba); };
}

function fecharInclusao(aba) {
  inclusaoAberta[aba] = false;
  const area = document.getElementById(DEF[aba].area);
  area.innerHTML = "";
  area.style.display = "none";
  laudoSel = {};
}

// ----------------------------------------------------------
//  Salvar
// ----------------------------------------------------------
async function salvarRegistro(aba) {
  const def = DEF[aba];
  const sel = document.getElementById("in-" + aba + "-op");
  const op = opsDisponiveis.find(function (o) { return o._id === sel.value; });
  const data = document.getElementById("in-" + aba + "-data").value;

  if (!op) { alert("Selecione a Ordem de Produção."); return; }
  if (!data) { alert("Informe a data."); return; }

  const btn = document.getElementById("btn-salvar-" + aba);
  btn.disabled = true;
  btn.textContent = "Salvando…";

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
    btn.disabled = false; btn.textContent = "Salvar registro";
    return;
  }

  const g = function (sufixo) {
    const el = document.getElementById("in-" + aba + "-" + sufixo);
    return el ? el.value : "";
  };

  const campos = {
    numeroOp: op.numero || "",
    cliente: op.cliente || "",
    desenho: g("desenho"),
    data: g("data"),
    responsavel: g("responsavel"),
    dispositivo: g("dispositivo"),
    instrumento: g("instrumento"),
    dataRodape: g("dataRodape"),
    diarioBordo: g("diarioBordo")
  };
  def.caracteristicas.forEach(function (car) {
    if (def.comEsp) campos[car.chave + "Esp"] = g(car.chave + "-esp");
    campos[car.chave + "Enc"] = g(car.chave + "-enc");
    campos[car.chave + "Laudo"] = laudoSel[car.chave] || "";
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
          numeroOp: op.numero || "", cliente: op.cliente || "",
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
    btn.disabled = false;
    btn.textContent = "Salvar registro";
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
function dataBR(iso) {
  if (!iso) return "—";
  const p = String(iso).split("-");
  return (p.length === 3) ? (p[2] + "/" + p[1] + "/" + p[0]) : String(iso);
}
function pilulaLaudo(v) {
  if (v === "Aprovado") return "<span class='pilula-laudo aprov'>Aprovado</span>";
  if (v === "Reprovado") return "<span class='pilula-laudo reprov'>Reprovado</span>";
  return "—";
}
function opFoiIniciada(op) {
  if (!op.etapas) return false;
  for (let i = 0; i < op.etapas.length; i++) {
    if (op.etapas[i].horarioAbertura) return true;
  }
  return false;
}
