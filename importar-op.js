// ==========================================================
//  Importar OP — lê o arquivo, interpreta e mostra em cartões
// ==========================================================

import { lerOP } from "./leitor-op.js";

const campoArquivo = document.getElementById("arquivo-op");
const areaConteudo = document.getElementById("conteudo-op");

campoArquivo.addEventListener("change", function (evento) {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();

  leitor.onload = function () {
    const texto = leitor.result;
    const op = lerOP(texto);
    mostrarOP(op);
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

  // ---- Cartão: dados gerais ----
  html += "<div class='cartao'>";
  html += "<h3>Dados da OP</h3>";
  html += "<div class='campos'>";
  html += linha("Número da OP", op.numero);
  html += linha("Cliente", op.cliente);
  html += linha("Pedido do cliente", op.pedidoCliente);
  html += linha("Produto", op.produto);
  html += linha("Descrição", op.descricao);
  html += linha("Quantidade", op.quantidade);
  html += linha("Início previsto", op.iniPrevisto);
  html += linha("Fim efetivo", op.fimEfetivo);
  html += linha("Desenho", op.desenho);
  html += "</div></div>";

  // ---- Cartão: matéria-prima ----
  if (op.materiaPrima.length > 0) {
    html += "<div class='cartao'>";
    html += "<h3>Matéria-prima</h3>";
    op.materiaPrima.forEach(function (mp) {
      html += "<div class='campos'>";
      html += linha("Código", mp.codigo);
      html += linha("Lote", mp.lote);
      html += linha("Qtde MP", mp.qtdeMP);
      html += linha("Descrição", mp.descricao);
      html += "</div>";
    });
    html += "</div>";
  }

  // ---- Cartão: parâmetros de moldagem ----
  if (op.parametrosMoldagem.length > 0) {
    html += "<div class='cartao'>";
    html += "<h3>Parâmetros de moldagem</h3>";
    html += "<table class='tabela-param'>";
    html += "<tr><th>Parâmetro</th><th>Especificado</th><th>Tol. mín.</th><th>Tol. máx.</th></tr>";
    op.parametrosMoldagem.forEach(function (p) {
      html += "<tr><td>" + p.parametro + "</td><td>" + p.valor + "</td><td>" + p.tolMin + "</td><td>" + p.tolMax + "</td></tr>";
    });
    html += "</table></div>";
  }

  // ---- Cartão: operações (o roteiro da peça) ----
  if (op.operacoes.length > 0) {
    html += "<div class='cartao'>";
    html += "<h3>Etapas do processo (" + op.operacoes.length + ")</h3>";
    html += "<ol class='lista-operacoes'>";
    op.operacoes.forEach(function (oper) {
      html += "<li><strong>" + oper.operacao + "</strong><br>";
      html += "<span class='recurso'>" + oper.recurso + " (" + oper.recursoCodigo + ")</span></li>";
    });
    html += "</ol></div>";
  }

  areaConteudo.innerHTML = html;
}

// Função auxiliar: monta uma linha "rótulo: valor"
function linha(rotulo, valor) {
  const conteudo = valor ? valor : "—";
  return "<div class='campo'><span class='rotulo'>" + rotulo + "</span><span class='valor'>" + conteudo + "</span></div>";
}
