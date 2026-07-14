// ==========================================================
//  FF-002 — Controle de Peças no Tamboreamento
//  Tabela de inclusão (topo, some após salvar) + tabela de histórico
// ==========================================================

import { db } from "./firebase.js";
import {
  collection, onSnapshot, addDoc, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const CODIGO_FF = "ff002";
const NOME_FF = "Controle de Peças no Tamboreamento";

const statusConexao = document.getElementById("status-conexao");
const btnNovoRegistro = document.getElementById("btn-novo-registro");
const areaInclusao = document.getElementById("area-inclusao");
const corpoInclusao = document.getElementById("corpo-inclusao");
const corpoTabela = document.getElementById("corpo-tabela");
const vazioRegistros = document.getElementById("vazio-registros");

let opsDisponiveis = [];
let registrosAtuais = [];
let linhaNovaAberta = false;

// ----------------------------------------------------------
//  Carrega as OPs (dropdown) — todas menos arquivadas
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
}, function (erro) {
  console.error("Erro ao carregar OPs:", erro);
});

// ----------------------------------------------------------
//  Lista os registros dos últimos 30 dias (mais recente primeiro)
// ----------------------------------------------------------
onSnapshot(collection(db, "registros_ff"), function (resultado) {
  const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
  registrosAtuais = [];
  resultado.forEach(function (documento) {
    const d = documento.data();
    if (d.ff !== CODIGO_FF) return;
    const t = d.criadoEm ? new Date(d.criadoEm).getTime() : 0;
    if (t >= limite) { d._id = documento.id; registrosAtuais.push(d); }
  });
  registrosAtuais.sort(function (a, b) {
    return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
  });
  desenharHistorico();
  statusConexao.textContent = "✅ Conectado. " + registrosAtuais.length + " registro(s) nos últimos 30 dias.";
}, function (erro) {
  console.error("Erro ao carregar registros:", erro);
  statusConexao.textContent = "❌ Não foi possível carregar os registros.";
  statusConexao.className = "status erro-msg";
});

// ----------------------------------------------------------
//  Histórico
// ----------------------------------------------------------
function desenharHistorico() {
  if (registrosAtuais.length === 0) {
    corpoTabela.innerHTML = "";
    vazioRegistros.style.display = "block";
    return;
  }
  vazioRegistros.style.display = "none";
  let html = "";
  registrosAtuais.forEach(function (r) {
    const c = r.campos || {};
    html += "<tr>";
    html += "<td>" + tx(c.data) + "</td>";
    html += "<td>" + tx(r.cliente) + "</td>";
    html += "<td>" + tx(r.numeroOp) + "</td>";
    html += "<td>" + tx(c.qtdeTotal) + "</td>";
    html += "<td>" + tx(c.qtdeParcial) + "</td>";
    html += "<td>" + tx(c.maquina) + "</td>";
    html += "<td>" + tx(c.horaInicial) + "</td>";
    html += "<td>" + tx(c.horaFinal) + "</td>";
    html += "<td>" + tx(r.responsavel) + "</td>";
    html += "<td class='col-diario'>" + tx(c.observacoes) + "</td>";
    html += "</tr>";
  });
  corpoTabela.innerHTML = html;
}

// ----------------------------------------------------------
//  Inclusão (linha editável)
// ----------------------------------------------------------
btnNovoRegistro.addEventListener("click", function () {
  if (linhaNovaAberta) return;
  linhaNovaAberta = true;
  abrirInclusao();
});

function abrirInclusao() {
  let opcoes = "<option value=''>Selecione…</option>";
  opsDisponiveis.forEach(function (op) {
    opcoes += "<option value='" + op._id + "'>OP " + tx(op.numero) + "</option>";
  });

  let h = "<tr class='linha-nova'>";
  h += "<td><input type='date' id='n-data' class='in-mini'></td>";
  h += "<td><span id='n-cliente' class='cliente-auto'>—</span></td>";
  h += "<td><select id='n-op' class='in-mini'>" + opcoes + "</select></td>";
  h += "<td><input type='number' id='n-qtotal' class='in-mini' inputmode='numeric' min='0'></td>";
  h += "<td><input type='number' id='n-qparcial' class='in-mini' inputmode='numeric' min='0'></td>";
  h += "<td><input type='text' id='n-maquina' class='in-mini' inputmode='numeric'></td>";
  h += "<td><input type='time' id='n-hini' class='in-mini'></td>";
  h += "<td><input type='time' id='n-hfim' class='in-mini'></td>";
  h += "<td><input type='text' id='n-resp' class='in-mini' placeholder='Nome e sobrenome'></td>";
  h += "<td><input type='text' id='n-obs' class='in-mini' placeholder='Observações'></td>";
  h += "<td class='col-acoes'>";
  h += "<button id='n-salvar' class='btn-linha-salvar'>Salvar</button>";
  h += "<button id='n-cancelar' class='btn-linha-cancelar'>Cancelar</button>";
  h += "</td></tr>";

  corpoInclusao.innerHTML = h;
  areaInclusao.style.display = "block";

  const nData = document.getElementById("n-data");
  if (nData && !nData.value) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    nData.value = ano + "-" + mes + "-" + dia;
  }
  const nOp = document.getElementById("n-op");
  const nCliente = document.getElementById("n-cliente");
  nOp.addEventListener("change", function () {
    const op = opsDisponiveis.find(function (o) { return o._id === nOp.value; });
    nCliente.textContent = op ? tx(op.cliente) : "—";
  });

  document.getElementById("n-cancelar").addEventListener("click", fecharInclusao);
  document.getElementById("n-salvar").addEventListener("click", salvarLinhaNova);
}

function fecharInclusao() {
  linhaNovaAberta = false;
  corpoInclusao.innerHTML = "";
  areaInclusao.style.display = "none";
}

async function salvarLinhaNova() {
  const opId = document.getElementById("n-op").value;
  const op = opsDisponiveis.find(function (o) { return o._id === opId; });
  const data = document.getElementById("n-data").value;
  const responsavel = document.getElementById("n-resp").value.trim();

  if (!op) { alert("Selecione a Ordem de Produção."); return; }
  if (!data) { alert("Informe a data."); return; }
  if (!responsavel) { alert("Informe o responsável."); return; }
  if (responsavel.split(/\s+/).filter(function (p) { return p.length > 0; }).length < 2) {
    alert("Digite nome e sobrenome do responsável."); return;
  }

  const btnSalvar = document.getElementById("n-salvar");
  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando…";

  // Trava extra: reconfere no banco se a OP não foi arquivada
  try {
    const snapOp = await getDoc(doc(db, "ordens_producao", op._id));
    if (!snapOp.exists() || snapOp.data().status === "finalizada_arquivada") {
      alert("Esta OP foi arquivada e não pode mais receber registros.");
      fecharInclusao();
      return;
    }
  } catch (eVerif) {
    console.error("Erro ao verificar a OP:", eVerif);
    alert("Não foi possível verificar a OP. Tente novamente.");
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar";
    return;
  }

  const registro = {
    ff: CODIGO_FF,
    nomeFf: NOME_FF,
    opId: op._id,
    numeroOp: op.numero || "",
    cliente: op.cliente || "",
    responsavel: responsavel,
    criadoEm: new Date().toISOString(),
    campos: {
      data: data,
      maquina: document.getElementById("n-maquina").value.trim(),
      qtdeTotal: document.getElementById("n-qtotal").value,
      qtdeParcial: document.getElementById("n-qparcial").value,
      horaInicial: document.getElementById("n-hini").value,
      horaFinal: document.getElementById("n-hfim").value,
      observacoes: document.getElementById("n-obs").value.trim()
    }
  };

  try {
    await addDoc(collection(db, "registros_ff"), registro);
    try {
      const refOp = doc(db, "ordens_producao", op._id);
      const snap = await getDoc(refOp);
      if (snap.exists()) {
        const lista = (snap.data().registrosFF) || [];
        lista.push({
          ff: CODIGO_FF, nomeFf: NOME_FF, responsavel: responsavel,
          criadoEm: registro.criadoEm, campos: registro.campos
        });
        await updateDoc(refOp, { registrosFF: lista });
      }
    } catch (e2) {
      console.error("Registro salvo, mas falhou ao espelhar na OP:", e2);
    }
    fecharInclusao();
  } catch (erro) {
    console.error("Erro ao salvar registro:", erro);
    alert("Erro ao salvar: " + erro.message);
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar";
  }
}

// ----------------------------------------------------------
//  Auxiliares
// ----------------------------------------------------------
function tx(v) {
  if (v === undefined || v === null || String(v).trim() === "") return "—";
  return String(v);
}
