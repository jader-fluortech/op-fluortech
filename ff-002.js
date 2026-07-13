// ==========================================================
//  FF-002 — Controle de Peças no Tamboreamento
//  Tabela com linha editável no topo (inclui novos registros na própria tela)
// ==========================================================

import { db } from "./firebase.js";
import {
  collection, onSnapshot, addDoc, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const CODIGO_FF = "ff002";
const NOME_FF = "Controle de Peças no Tamboreamento";
const NUM_COLUNAS = 11; // total de colunas da tabela

const statusConexao = document.getElementById("status-conexao");
const btnNovoRegistro = document.getElementById("btn-novo-registro");
const corpoTabela = document.getElementById("corpo-tabela");
const vazioRegistros = document.getElementById("vazio-registros");

let opsDisponiveis = [];      // OPs não arquivadas, para o dropdown
let registrosAtuais = [];     // registros dos últimos 30 dias
let linhaNovaAberta = false;  // controla "só uma linha nova por vez"

// ----------------------------------------------------------
//  Carrega as OPs (para o dropdown) — todas menos arquivadas
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
  desenharTabela();
  statusConexao.textContent = "✅ Conectado. " + registrosAtuais.length + " registro(s) nos últimos 30 dias.";
}, function (erro) {
  console.error("Erro ao carregar registros:", erro);
  statusConexao.textContent = "❌ Não foi possível carregar os registros.";
  statusConexao.className = "status erro-msg";
});

// ----------------------------------------------------------
//  Desenha a tabela (linha nova no topo, se aberta, + registros)
// ----------------------------------------------------------
function desenharTabela() {
  let html = "";

  if (linhaNovaAberta) html += montarLinhaNova();

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
    html += "<td class='col-acoes'></td>";
    html += "</tr>";
  });

  corpoTabela.innerHTML = html;

  // Se há registros ou linha nova, esconde o "vazio"
  const temConteudo = registrosAtuais.length > 0 || linhaNovaAberta;
  vazioRegistros.style.display = temConteudo ? "none" : "block";

  if (linhaNovaAberta) ligarLinhaNova();
}

function montarLinhaNova() {
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
  return h;
}

function ligarLinhaNova() {
  const nData = document.getElementById("n-data");
  // pré-preenche data com hoje
  if (nData && !nData.value) nData.value = new Date().toISOString().slice(0, 10);

  const nOp = document.getElementById("n-op");
  const nCliente = document.getElementById("n-cliente");
  nOp.addEventListener("change", function () {
    const op = opsDisponiveis.find(function (o) { return o._id === nOp.value; });
    nCliente.textContent = op ? tx(op.cliente) : "—";
  });

  document.getElementById("n-cancelar").addEventListener("click", function () {
    linhaNovaAberta = false;
    desenharTabela();
  });
  document.getElementById("n-salvar").addEventListener("click", salvarLinhaNova);
}

// ----------------------------------------------------------
//  Abrir a linha nova
// ----------------------------------------------------------
btnNovoRegistro.addEventListener("click", function () {
  if (linhaNovaAberta) return; // só uma por vez
  linhaNovaAberta = true;
  desenharTabela();
  const wrap = document.querySelector(".tabela-wrap");
  if (wrap) wrap.scrollTop = 0;
});

// ----------------------------------------------------------
//  Salvar a linha nova
// ----------------------------------------------------------
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
    // espelha na OP
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
    linhaNovaAberta = false;
    // o onSnapshot vai redesenhar sozinho com o novo registro
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
