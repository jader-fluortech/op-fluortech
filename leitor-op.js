// ==========================================================
//  Leitor de OP — transforma o texto do TXT em dados organizados
//  A estrutura do TXT é sempre a mesma; as operações variam por peça.
// ==========================================================

export function lerOP(texto) {
  const linhas = texto.split(/\r?\n/);

  const op = {
    numero: null,
    cliente: null,
    pedidoCliente: null,
    quantidade: null,
    produto: null,
    descricao: null,
    iniPrevisto: null,
    fimEfetivo: null,
    desenho: null,
    materiaPrima: [],
    parametrosMoldagem: [],
    operacoes: []
  };

  // ---- Funções auxiliares ----
  function pega(regex) {
    const m = texto.match(regex);
    return m ? m[1].trim() : null;
  }

  // ---- Cabeçalho ----
  op.numero        = pega(/NRO\s*:\s*(\S+)/);
  op.quantidade    = pega(/Quantidade:\s*([\d.,]+)/);
  op.produto       = pega(/Produto:\s*(\S+)/);
  op.iniPrevisto   = pega(/Ini Pr:\s*([\d/]+)/);
  op.fimEfetivo    = pega(/Fim Ef:\s*([\d/]+)/);
  op.pedidoCliente = pega(/Ped Cliente:\s*(\S+)/);
  op.desenho       = pega(/Desenho\s*:\s*(.+)/);

  const mCliente = texto.match(/Cliente\s*:\s*(.+)/);
  op.cliente = mCliente ? mCliente[1].trim() : null;

  // Descrição do produto: linha logo após a linha "Produto: ..."
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].includes("Produto:") && linhas[i].includes("Unid")) {
      op.descricao = (linhas[i + 1] || "").trim();
      break;
    }
  }

  // ---- Matéria-prima ----
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const m = l.match(/^(\d{6,})\s+(\S+)\s+([\d.,]+)\s*-\s*([\d.,]+)\s+(.*)/);
    if (m) {
      op.materiaPrima.push({
        codigo: m[1],
        lote: m[2],
        qtdeMP: m[3],
        qtdePeca: m[4],
        descricao: m[5].trim()
      });
    }
  }

  // ---- Parâmetros de moldagem ----
  for (const l of linhas) {
    const mParam = l.match(/^\|\s*([A-Z][A-Z\s()]+?)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|/);
    if (mParam && !l.includes("ESPECIFICADO")) {
      op.parametrosMoldagem.push({
        parametro: mParam[1].trim(),
        valor: mParam[2],
        tolMin: mParam[3],
        tolMax: mParam[4]
      });
    }
    const mTempo = l.match(/\|\s*(TEMPO REF[^|]*)\|LADO1:\s*([\d.,]+)\s*\|LADO2:\s*([\d.,]+)\s*\|QTDE\s*:\s*([\d.,]+)/);
    if (mTempo) {
      op.parametrosMoldagem.push({
        parametro: "TEMPO REF (s)",
        valor: "Lado 1: " + mTempo[2] + " / Lado 2: " + mTempo[3],
        tolMin: "",
        tolMax: "Qtde: " + mTempo[4]
      });
    }
  }

  // ---- Operações (o roteiro varia por OP) ----
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    // Linha do recurso: começa com código tipo A000, B000, E000, L001, N001...
    const mRecurso = l.match(/^([A-Z]\d{3})\s+(.+)/);
    if (mRecurso) {
      const recursoNome = mRecurso[2].replace(/[_\s]+$/, "").trim();
      // A operação está na próxima linha
      const proxima = (linhas[i + 1] || "").trim();
      const mOper = proxima.match(/^(\S+)\s+(.+)/);
      if (mOper) {
        op.operacoes.push({
          recursoCodigo: mRecurso[1],
          recurso: recursoNome,
          operacaoCodigo: mOper[1],
          operacao: mOper[2].trim()
        });
      }
    }
  }

  return op;
}
