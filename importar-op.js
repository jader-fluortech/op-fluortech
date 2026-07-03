// ==========================================================
//  Importar OP — Parte 1: ler o arquivo TXT e mostrar na tela
// ==========================================================

// Pega os elementos da tela
const campoArquivo = document.getElementById("arquivo-op");
const areaConteudo = document.getElementById("conteudo-op");

// Quando o usuário escolher um arquivo no campo de upload...
campoArquivo.addEventListener("change", function (evento) {
  const arquivo = evento.target.files[0];

  // Se nada foi selecionado, não faz nada
  if (!arquivo) {
    return;
  }

  // Prepara o leitor de arquivos do navegador
  const leitor = new FileReader();

  // O que fazer quando o arquivo terminar de ser lido
  leitor.onload = function () {
    const textoDoArquivo = leitor.result;
    areaConteudo.textContent = textoDoArquivo;
  };

  // O que fazer se der erro na leitura
  leitor.onerror = function () {
    areaConteudo.textContent = "❌ Não foi possível ler o arquivo. Tente novamente.";
  };

  // Lê o arquivo como texto, usando a codificação do TOTVS (Windows-1252)
  leitor.readAsText(arquivo, "windows-1252");
});
