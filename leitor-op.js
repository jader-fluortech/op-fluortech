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

  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].includes("Produto:") && linhas[i].includes("Unid")) {
      op.descricao = (linhas[i + 1] || "").trim();
      break;
    }
  }

  // ---- Matéria-prima (junta a descrição que quebra em 2 linhas) ----
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const m = l.match(/^(\d{6,})\s+(\S+)\s+([\d.,]+)\s*-\s*([\d.,]+)\s+(.*)/);
    if (m) {
      let descricao = m[5].trim();
      // Se a próxima linha for continuação (não é separador nem vazia), junta
      const prox = (linhas[i + 1] || "").trim();
      if (prox && !prox.startsWith("---") && !prox.startsWith("|") && !prox.startsWith("*")) {
        descricao += prox;
      }
      op.materiaPrima.push({
        codigo: m[1],
        lote: m[2],
        qtdeMP: m[3],
        qtdePeca: m[4],
        descricao: descricao
      });
    }
  }

  // ---- Parâmetros de moldagem ----
  for (const l of linhas) {
    // Linha normal: | NOME | valor | tolmin | tolmax |
    const mParam = l.match(/^\|\s*([A-Za-zÇÃÁÉÍÓÚ][A-Za-z0-9\s().%\/]*?)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|/);
    if (mParam && !l.includes("ESPECIFICADO") && !l.includes("TOL MINIMA")) {
      op.parametrosMoldagem.push({
        parametro: mParam[1].trim(),
        valor: mParam[2],
        tolMin: mParam[3],
        tolMax: mParam[4]
      });
      continue;
    }
    // Linha especial do TEMPO REF (formato diferente)
    const mTempo = l.match(/\|\s*(TEMPO REF[^|]*)\|\s*LADO1:\s*([\d.,]+)\s*\|\s*LADO2:\s*([\d.,]+)\s*\|\s*QTDE\s*:\s*([\d.,]+)/);
    if (mTempo) {
      op.parametrosMoldagem.push({
        parametro: "TEMPO REF (s)",
        valor: "Lado 1: " + mTempo[2] + " / Lado 2: " + mTempo[3],
        tolMin: "—",
        tolMax: "Qtde: " + mTempo[4]
      });
    }
  }

  // ---- Operações (o roteiro varia por OP) ----
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const mRecurso = l.match(/^([A-Z]\d{3})\s+(.+)/);
    if (mRecurso) {
      const recursoNome = mRecurso[2].replace(/[_\s]+$/, "").trim();
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
