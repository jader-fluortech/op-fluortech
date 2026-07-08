// ==========================================================
//  Tela do Operador — lista de OPs ativas + abrir OP (ficha completa)
// ==========================================================

import { db, AMBIENTE } from "./firebase.js";
import { collection, query, where, orderBy, onSnapshot }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const listaOps = document.getElementById("lista-ops");
const listaVazia = document.getElementById("lista-vazia");
const etiquetaAmbiente = document.getElementById("ambiente");

const telaLista = document.getElementById("tela-lista");
const telaOp = document.getElementById("tela-op");
const fichaOp = document.getElementById("ficha-op");
const btnVoltar = document.getElementById("btn-voltar");

etiquetaAmbiente.textContent = "ambiente de " + AMBIENTE;

// Guarda as OPs carregadas, para abrir pela lista
let opsCarregadas = [];

// ----------------------------------------------------------
//  Escuta as OPs ativas em tempo real
// ----------------------------------------------------------
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
  montarLista(opsCarregadas);
}, function (erro) {
  console.error("Erro ao carregar OPs:", erro);
  listaOps.innerHTML = "<p class='erro'>Não foi possível carregar as OPs. Tente atualizar a página.</p>";
});

// ----------------------------------------------------------
//  Monta a lista visual das OPs
// ----------------------------------------------------------
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

  // Liga o clique de cada cartão para abrir a OP
  document.querySelectorAll(".op-card").forEach(function (cartao) {
    cartao.addEventListener("click", function () {
      const indice = parseInt(cartao.getAttribute("data-indice"), 10);
      abrirOP(opsCarregadas[indice]);
    });
  });
}

// ----------------------------------------------------------
//  Abre a OP: troca a lista pela ficha completa
// ----------------------------------------------------------
function abrirOP(op) {
  fichaOp.innerHTML = montarFicha(op);
  telaLista.style.display = "none";
  telaOp.style.display = "block";
  window.scrollTo(0, 0);
}

btnVoltar.addEventListener("click", function () {
  telaOp.style.display = "none";
  telaLista.style.display = "block";
  fichaOp.innerHTML = "";
  window.scrollTo(0, 0);
});

// ----------------------------------------------------------
//  Monta a ficha completa da peça (todos os dados da OP)
// ----------------------------------------------------------
function montarFicha(op) {
  const etapa = etapaAtualDa(op);
  let html = "";

  // Cabeçalho da OP aberta
  html += "<div class='op-aberta-cabecalho'>";
  html += "  <h2>OP " + (op.numero || "—") + "</h2>";
  html += "  <p>Etapa atual: <strong>" + (etapa ? etapa.operacao : "—") + "</strong></p>";
  html += "</div>";

  // Cartão: dados da OP
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

  // Cartão: matéria-prima
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

  // Cartão: parâmetros de moldagem
  if (op.parametrosMoldagem && op.parametrosMoldagem.length > 0) {
    html += "<div class='cartao'><h3>Parâmetros de moldagem</h3>";
    html += "<table class='tabela-param'>";
    html += "<tr><th>Parâmetro</th><th>Especificado</th><th>Tol. mín.</th><th>Tol. máx.</th></tr>";
    op.parametrosMoldagem.forEach(function (p) {
      html += "<tr><td>" + p.parametro + "</td><td>" + p.valor + "</td><td>" + p.tolMin + "</td><td>" + p.tolMax + "</td></tr>";
    });
    html += "</table></div>";
  }

  return html;
}

// ----------------------------------------------------------
//  Auxiliares
// ----------------------------------------------------------
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
