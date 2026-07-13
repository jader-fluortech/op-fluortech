// ==========================================================
//  FF-002 — Controle de Peças no Tamboreamento
//  Lista registros dos últimos 30 dias + inclui novos registros
// ==========================================================

import { db } from "./firebase.js";
import {
  collection, onSnapshot, addDoc, doc, getDoc, updateDoc, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const CODIGO_FF = "ff002";
const NOME_FF = "Controle de Peças no Tamboreamento";

const statusConexao = document.getElementById("status-conexao");
const btnNovoRegistro = document.getElementById("btn-novo-registro");
const listaRegistros = document.getElementById("lista-registros");
const vazioRegistros = document.getElementById("vazio-registros");

const modalRegistro = document.getElementById("modal-registro");
const btnFecharRegistro = document.getElementById("btn-fechar-registro");
const btnSalvarRegistro = document.getElementById("btn-salvar-registro");
const msgRegistro = document.getElementById("msg-registro");

const regOp = document.getElementById("reg-op");
const regCliente = document.getElementById("reg-cliente");
const regData = document.getElementById("reg-data");
const regMaquina = document.getElementById("reg-maquina");
const regQtdeTotal = document.getElementById("reg-qtde-total");
const regQtdeParcial = document.getElementById("reg-qtde-parcial");
const regHoraInicial = document.getElementById("reg-hora-inicial");
const regHoraFinal = document.getElementById("reg-hora-final");
const regObservacoes = document.getElementById("reg-observacoes");
const regResponsavel = document.getElementById("reg-responsavel");

let opsDisponiveis = [];   // OPs não arquivadas, para o select

// ----------------------------------------------------------
//  Carrega as OPs (para o select) — todas menos arquivadas
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
  preencherSelectOps();
}, function (erro) {
  console.error("Erro ao carregar OPs:", erro);
});

function preencherSelectOps() {
  const selecionado = regOp.value;
  let html = "<option value=''>Selecione a OP…</option>";
  opsDisponiveis.forEach(function (op) {
    html += "<option value='" + op._id + "'>OP " + (op.numero || "—") + "</option>";
  });
  regOp.innerHTML = html;
  if (selecionado) regOp.value = selecionado;
}

// Ao escolher a OP, preenche o cliente automaticamente
regOp.addEventListener("change", function () {
  const op = opsDisponiveis.find(function (o) { return o._id === regOp.value; });
  regCliente.textContent = op ? (op.cliente || "—") : "—";
});

// ----------------------------------------------------------
//  Lista os registros dos últimos 30 dias (mais recente primeiro)
// ----------------------------------------------------------
onSnapshot(collection(db, "registros_ff"), function (resultado) {
  const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const registros = [];
  resultado.forEach(function (documento) {
    const d = documento.data();
    if (d.ff !== CODIGO_FF) return;
    const t = d.criadoEm ? new Date(d.criadoEm).getTime() : 0;
    if (t >= limite) { d._id = documento.id; registros.push(d); }
  });
  registros.sort(function (a, b) {
    return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
  });
  desenharRegistros(registros);
  statusConexao.textContent = "✅ Conectado. " + registros.length + " registro(s) nos últimos 30 dias.";
}, function (erro) {
  console.error("Erro ao carregar registros:", erro);
  statusConexao.textContent = "❌ Não foi possível carregar os registros.";
  statusConexao.className = "status erro-msg";
});

function desenharRegistros(registros) {
  if (registros.length === 0) {
    listaRegistros.innerHTML = "";
    vazioRegistros.style.display = "block";
    return;
  }
  vazioRegistros.style.display = "none";
  let html = "";
  registros.forEach(function (r) {
    const c = r.campos || {};
    html += "<div class='registro-card'>";
    html += "<div class='registro-topo'><span class='registro-op'>OP " + (r.numeroOp || "—") + "</span>";
    html += "<span class='registro-data'>" + (c.data || "—") + "</span></div>";
    html += "<p class='registro-cliente'>" + (r.cliente || "—") + "</p>";
    html += "<div class='registro-campos'>";
    html += "<span><strong>Máquina:</strong> " + (c.maquina || "—") + "</span>";
    html += "<span><strong>Qtde total:</strong> " + (c.qtdeTotal || "—") + "</span>";
    html += "<span><strong>Qtde parcial:</strong> " + (c.qtdeParcial || "—") + "</span>";
    html += "<span><strong>Início:</strong> " + (c.horaInicial || "—") + "</span>";
    html += "<span><strong>Fim:</strong> " + (c.horaFinal || "—") + "</span>";
    html += "</div>";
    if (c.observacoes) html += "<p class='registro-obs'>“" + c.observacoes + "”</p>";
    html += "<p class='registro-resp'>Responsável: " + (r.responsavel || "—") + " · registrado em " + formatarDataHora(r.criadoEm) + "</p>";
    html += "</div>";
  });
  listaRegistros.innerHTML = html;
}

// ----------------------------------------------------------
//  Abrir / fechar o modal
// ----------------------------------------------------------
btnNovoRegistro.addEventListener("click", abrirModal);
btnFecharRegistro.addEventListener("click", fecharModal);
modalRegistro.addEventListener("click", function (e) { if (e.target === modalRegistro) fecharModal(); });

function abrirModal() {
  limparFormulario();
  // pré-preenche a data com hoje
  const hoje = new Date();
  regData.value = hoje.toISOString().slice(0, 10);
  modalRegistro.style.display = "flex";
}
function fecharModal() { modalRegistro.style.display = "none"; }

function limparFormulario() {
  regOp.value = "";
  regCliente.textContent = "—";
  regData.value = "";
  regMaquina.value = "";
  regQtdeTotal.value = "";
  regQtdeParcial.value = "";
  regHoraInicial.value = "";
  regHoraFinal.value = "";
  regObservacoes.value = "";
  regResponsavel.value = "";
  msgRegistro.textContent = "";
}

// ----------------------------------------------------------
//  Salvar o registro
// ----------------------------------------------------------
btnSalvarRegistro.addEventListener("click", salvarRegistro);

async function salvarRegistro() {
  const op = opsDisponiveis.find(function (o) { return o._id === regOp.value; });
  const responsavel = regResponsavel.value.trim();

  // Validações
  if (!op) { erroMsg("Selecione a Ordem de Produção."); return; }
  if (!regData.value) { erroMsg("Informe a data."); return; }
  if (!responsavel) { erroMsg("Informe o responsável."); return; }
  if (responsavel.split(/\s+/).filter(function (p) { return p.length > 0; }).length < 2) {
    erroMsg("Digite nome e sobrenome do responsável."); return;
  }

  btnSalvarRegistro.disabled = true;
  msgRegistro.textContent = "Salvando…";
  msgRegistro.className = "msg-salvar";

  const registro = {
    ff: CODIGO_FF,
    nomeFf: NOME_FF,
    opId: op._id,
    numeroOp: op.numero || "",
    cliente: op.cliente || "",
    responsavel: responsavel,
    criadoEm: new Date().toISOString(),
    campos: {
      data: regData.value,
      maquina: regMaquina.value.trim(),
      qtdeTotal: regQtdeTotal.value,
      qtdeParcial: regQtdeParcial.value,
      horaInicial: regHoraInicial.value,
      horaFinal: regHoraFinal.value,
      observacoes: regObservacoes.value.trim()
    }
  };

  try {
    // 1) Grava na coleção de registros de FF
    await addDoc(collection(db, "registros_ff"), registro);

    // 2) Espelha na OP (seção registrosFF), para consolidar
    try {
      const refOp = doc(db, "ordens_producao", op._id);
      const snap = await getDoc(refOp);
      if (snap.exists()) {
        const lista = (snap.data().registrosFF) || [];
        lista.push({
          ff: CODIGO_FF,
          nomeFf: NOME_FF,
          responsavel: responsavel,
          criadoEm: registro.criadoEm,
          campos: registro.campos
        });
        await updateDoc(refOp, { registrosFF: lista });
      }
    } catch (e2) {
      console.error("Registro salvo, mas falhou ao espelhar na OP:", e2);
    }

    msgRegistro.textContent = "✅ Registro salvo com sucesso.";
    msgRegistro.className = "msg-salvar sucesso-msg";
    setTimeout(fecharModal, 1200);
  } catch (erro) {
    console.error("Erro ao salvar registro:", erro);
    erroMsg("Erro ao salvar: " + erro.message);
    btnSalvarRegistro.disabled = false;
  }
}

function erroMsg(texto) {
  msgRegistro.textContent = "❌ " + texto;
  msgRegistro.className = "msg-salvar erro-msg";
}

function formatarDataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
