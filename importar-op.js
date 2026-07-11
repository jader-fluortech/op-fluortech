// ==========================================================
//  Importar OP — modal: lê o arquivo, mostra em cartões e salva no banco
//  Regras de reimportação: bloqueia OP ativa ou finalizada.
// ==========================================================

import { lerOP } from "./leitor-op.js";
import { db } from "./firebase.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { storage } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";

const campoArquivo = document.getElementById("arquivo-op");
const areaConteudo = document.getElementById("conteudo-op");

const modalImportar = document.getElementById("modal-importar");
const btnAbrirImportar = document.getElementById("btn-abrir-importar");
const btnFecharImportar = document.getElementById("btn-fechar-importar");

let opAtual = null;

const areaDocs = document.getElementById("area-docs-importar");
const inputDocs = document.getElementById("docs-importar");
const listaDocs = document.getElementById("lista-docs-importar");
let docsEscolhidos = [];   // arquivos escolhidos, ainda não enviados

const areaSalvar = document.querySelector(".area-salvar");
areaSalvar.style.display = "none";
document.getElementById("btn-salvar").addEventListener("click", salvarOP);

inputDocs.addEventListener("change", function (evento) {
  const arquivos = Array.from(evento.target.files);
  arquivos.forEach(function (arq) { docsEscolhidos.push(arq); });
  inputDocs.value = "";   // permite escolher o mesmo arquivo de novo se remover
  desenharListaDocs();
});

function desenharListaDocs() {
  let html = "";
  docsEscolhidos.forEach(function (arq, i) {
    html += "<div class='doc-item'><span class='doc-nome'>" + arq.name + "</span>";
    html += "<button class='doc-remover' data-i='" + i + "'>×</button></div>";
  });
  listaDocs.innerHTML = html;
  listaDocs.querySelectorAll(".doc-remover").forEach(function (btn) {
    btn.addEventListener("click", function () {
      docsEscolhidos.splice(parseInt(btn.getAttribute("data-i"), 10), 1);
      desenharListaDocs();
    });
  });
}

// ---- Abrir / fechar o modal ----
btnAbrirImportar.addEventListener("click", function () {
  limparUpload();
  modalImportar.style.display = "flex";
});
btnFecharImportar.addEventListener("click", fecharModal);
modalImportar.addEventListener("click", function (e) {
  // fecha só se clicar no fundo escuro, não na caixa
  if (e.target === modalImportar) fecharModal();
});
function fecharModal() {
  modalImportar.style.display = "none";
  limparUpload();
}

// Limpa o campo de upload e o conteúdo mostrado
function limparUpload() {
  campoArquivo.value = "";
  areaConteudo.innerHTML = "";
  opAtual = null;
  docsEscolhidos = [];
  listaDocs.innerHTML = "";
  areaDocs.style.display = "none";
}
campoArquivo.addEventListener("change", function (evento) {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = function () {
    opAtual = lerOP(leitor.result);
    mostrarOP(opAtual);
  };
  leitor.onerror = function () {
    areaConteudo.innerHTML = "<p class='erro'>❌ Não foi possível ler o arquivo. Tente novamente.</p>";
  };
  leitor.readAsText(arquivo, "windows-1252");
});

// ----------------------------------------------------------
//  Monta os cartões com os dados da OP
// ----------------------------------------------------------
function mostrarOP(op) {
  let html = "";

  html += "<div class='cartao'>";
  html += "<h3>Dados da OP</h3>";
  html += "<div class='campos'>";
  html += linha("Número da OP", op.numero);
  html += linhaLarga("Cliente", op.cliente);
  html += linha("Pedido do cliente", op.pedidoCliente);
  html += linha("Produto", op.produto);
  html += linhaLarga("Descrição", op.descricao);
  html += linha("Quantidade", op.quantidade);
  html += linha("Início previsto", op.iniPrevisto);
  html += linha("Fim efetivo", op.fimEfetivo);
  html += linha("Desenho", op.desenho);
  html += "</div></div>";

  if (op.materiaPrima.length > 0) {
    html += "<div class='cartao'><h3>Matéria-prima</h3>";
    op.materiaPrima.forEach(function (mp) {
      html += "<div class='campos'>";
      html += linha("Código", mp.codigo);
      html += linha("Lote", mp.lote);
      html += linha("Qtde MP", mp.qtdeMP);
      html += linhaLarga("Descrição", mp.descricao);
      html += "</div>";
    });
    html += "</div>";
  }

  if (op.parametrosMoldagem.length > 0) {
    html += "<div class='cartao'><h3>Parâmetros de moldagem</h3>";
    html += "<table class='tabela-param'>";
    html += "<tr><th>Parâmetro</th><th>Especificado</th><th>Tol. mín.</th><th>Tol. máx.</th></tr>";
    op.parametrosMoldagem.forEach(function (p) {
      html += "<tr><td>" + p.parametro + "</td><td>" + p.valor + "</td><td>" + p.tolMin + "</td><td>" + p.tolMax + "</td></tr>";
    });
    html += "</table></div>";
  }

  if (op.operacoes.length > 0) {
    html += "<div class='cartao'><h3>Etapas do processo (" + op.operacoes.length + ")</h3>";
    html += "<ol class='lista-operacoes'>";
    op.operacoes.forEach(function (oper) {
      html += "<li><strong>" + oper.operacao + "</strong><br>";
      html += "<span class='recurso'>" + oper.recurso + " (" + oper.recursoCodigo + ")</span></li>";
    });
    html += "</ol></div>";
  }

  areaConteudo.innerHTML = html;
  areaDocs.style.display = "block";
areaSalvar.style.display = "block";
}

// ----------------------------------------------------------
//  Salva a OP no Firestore, aplicando as regras de reimportação
// ----------------------------------------------------------
async function salvarOP() {
  const botao = document.getElementById("btn-salvar");
  const msg = document.getElementById("msg-salvar");

  if (!opAtual || !opAtual.numero) {
    msg.textContent = "❌ OP sem número — não é possível salvar.";
    msg.className = "msg-salvar erro-msg";
    return;
  }

  botao.disabled = true;
  msg.textContent = "Verificando…";
  msg.className = "msg-salvar";

  try {
    const referencia = doc(db, "ordens_producao", opAtual.numero);
    const existente = await getDoc(referencia);

    if (existente.exists()) {
      const dadosExistentes = existente.data();
      const status = dadosExistentes.status;

      if (status === "finalizada_arquivada") {
        msg.innerHTML = "🔒 Esta OP já foi <strong>finalizada</strong>.<br>" +
          "Para importar novamente com o mesmo número, contate o administrador para excluí-la do sistema.";
        msg.className = "msg-salvar erro-msg";
        return;
      }

      msg.innerHTML = "⚠️ Esta OP já está <strong>ativa e em andamento</strong> na produção.<br>" +
        "Ela não foi importada novamente para não afetar os apontamentos.";
      msg.className = "msg-salvar erro-msg";
      return;
    }

    const etapas = opAtual.operacoes.map(function (oper, indice) {
      return {
        ordem: indice + 1,
        recursoCodigo: oper.recursoCodigo,
        recurso: oper.recurso,
        operacaoCodigo: oper.operacaoCodigo,
        operacao: oper.operacao,
        status: "pendente",
        operadorNome: null,
        operadorAssinatura: null,
        apontamentos: null
      };
    });

    // Sobe os documentos para o Storage e guarda os links
    const documentos = [];
    if (docsEscolhidos.length > 0) {
      msg.textContent = "Enviando documentos…";
      for (let i = 0; i < docsEscolhidos.length; i++) {
        const arq = docsEscolhidos[i];
        const caminho = "ops/" + opAtual.numero + "/" + Date.now() + "_" + arq.name;
        const referenciaArq = ref(storage, caminho);
        await uploadBytes(referenciaArq, arq);
        const url = await getDownloadURL(referenciaArq);
        documentos.push({ nome: arq.name, url: url, caminho: caminho });
      }
    }

    const dados = Object.assign({}, opAtual, {
      status: "ativa",
      etapaAtual: 1,
      etapas: etapas,
      documentos: documentos,
      importadaEm: new Date().toISOString()
    });

    await setDoc(referencia, dados);

    msg.innerHTML = "✅ OP <strong>" + opAtual.numero + "</strong> salva no sistema.<br>" +
      "Já está disponível para os operadores na primeira etapa.";
    msg.className = "msg-salvar sucesso-msg";

    // Fecha o modal depois de 2 segundos
    setTimeout(fecharModal, 2000);
  } catch (erro) {
    console.error("Erro ao salvar OP:", erro);
    msg.textContent = "❌ Erro ao salvar: " + erro.message;
    msg.className = "msg-salvar erro-msg";
    botao.disabled = false;
  }
}

function linha(rotulo, valor) {
  const conteudo = valor ? valor : "—";
  return "<div class='campo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + conteudo + "</span></div>";
}
function linhaLarga(rotulo, valor) {
  const conteudo = valor ? valor : "—";
  return "<div class='campo campo-largo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + conteudo + "</span></div>";
}
