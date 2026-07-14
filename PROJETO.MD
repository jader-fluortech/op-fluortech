# PROJETO OP FLUORTECH — Documento de Continuidade

*Sistema web de Ordens de Produção + Formulários de Controle (FF) — um MES caseiro para a Fluortech (fabricante de peças em PTFE/Teflon, Cotia/SP).*

Última atualização: julho/2026.

---

## 1. Visão geral

Sistema para digitalizar o chão de fábrica: importar Ordens de Produção (OP) do TOTVS, o operador apontar a produção (etapas, tempos, perdas, paradas, assinatura), o PCP acompanhar/corrigir/arquivar, anexar documentos, e os operadores preencherem os Formulários de Controle (FF) digitalmente. Sem sensores; os dados vêm do que os operadores registram.

**Perfil de trabalho:** o dono (não-programador) edita o código direto pelo site do GitHub (lápis → cola → commit). As alterações são entregues em **pedaços** (referência antes / código antigo / código novo / referência depois, com número de linha aproximado) quando pontuais, ou **arquivo completo já validado** quando a mudança é estrutural/espalhada.

---

## 2. Stack e infraestrutura

- **Hospedagem:** GitHub Pages. Repositório público `op-fluortech`, owner `jader-fluortech`.
- **URLs:**
  - PCP: `https://jader-fluortech.github.io/op-fluortech/`
  - Operador: `.../operador.html`
  - FF-002: `.../ff-002.html`
  - FF-004: `.../ff-004.html`
- **Banco:** Firebase Firestore (projeto `op-fluortech-teste`, região southamerica-east1).
- **Auth:** Firebase Auth (email/senha) — só na tela do PCP. Login único hoje = admin.
- **Storage:** Firebase Storage (plano Blaze) — para os documentos anexados às OPs.
- **Firebase via CDN** (`https://www.gstatic.com/firebasejs/12.15.0/...`), sem build tools.
- **AMBIENTE:** "teste" (etiqueta laranja "ambiente de teste" nas telas). Banco e Storage ainda em **modo de teste (aberto)** — trancar é a Frente 1.

---

## 3. Arquivos do repositório

- **index.html** — login PCP + área PCP. Modal de importação de OP (upload TXT + documentos). Lista em 3 grupos recolhíveis. Modais de documentos (`modal-docs`) e da FF.
- **estilo.css** — CSS do PCP.
- **firebase.js** — init Firestore + Auth + Storage; exporta `{db, auth, storage, AMBIENTE}`.
- **login.js** — auth PCP; expõe `window.emailPcpLogado`.
- **importar-op.js** — modal de importação: lê TXT (windows-1252), mostra cartões, área de documentos (sobe ao Storage em `ops/[numero]/`), regras de reimportação.
- **leitor-op.js** — parser do TXT do TOTVS (LMATR820L). Função `lerOP`.
- **operador.html / operador.js / operador.css** — tela do operador: lista OPs ativas, identificação (nome+sobrenome obrigatório + assinatura canvas), apontamento com autosave, paradas, finalizar/encerrar. Documentos visíveis na ficha.
- **pcp-lista.js** — lista das OPs (3 grupos), resumo completo, corrigir (rascunho + "Salvar e voltar"), arquivar, filtro de arquivadas (número/lote/data), documentos, e seção "Registros de FF" com pop-up por FF.
- **ff.css** — CSS comum das telas de FF (cabeçalho, tabelas, abas, assinaturas).
- **ff-002.html / ff-002.js** — FF-002 Tamboreamento.
- **ff-004.html / ff-004.js** — FF-004 Sinterização (duas abas + assinaturas).
- **PROJETO.md** — este documento.

---

## 4. Modelo de dados (Firestore)

**Coleção `ordens_producao`** (doc = número da OP): numero, cliente, pedidoCliente, quantidade, produto, descricao, iniPrevisto, fimEfetivo, desenho, materiaPrima[] (codigo/lote/qtdeMP/descricao), parametrosMoldagem[], operacoes[], status, etapaAtual, etapas[], importadaEm, encerradaEm, arquivadaEm, arquivadaPor, historicoPcp[], documentos[], **registrosFF[]**.

Cada **etapa**: ordem, recursoCodigo, recurso, operacaoCodigo, operacao, status (pendente/em_producao/concluida), operadorNome, operadorAssinatura (PNG base64), horarioAbertura, horarioInicioProcesso, horarioFimEtapa, apontamentos {horaInicio, horaFim, qtdeProduzida, qtdePerda, motivoPerda, paradas[{inicio,fim,motivo}]}.

**Status da OP:** `ativa` / `finalizada_aguardando_pcp` / `finalizada_arquivada`.

**historicoPcp[]:** {acao ("arquivou"/"corrigiu"/"documentos"), autor, em, + mudancas[]/adicionados[]/removidos[]}.

**documentos[]:** {nome, url, caminho}.

**registrosFF[]** (espelho na OP): {ff, nomeFf, aba (se houver), criadoEm, responsavel (se houver), campos:{...}}.

**Coleção `registros_ff`** (cada registro de FF): ff (ex "ff004"), nomeFf, aba (FF-004), opId, numeroOp, cliente, responsavel (FF-002), criadoEm (ISO), campos:{...}.

---

## 5. O que está PRONTO

**Ciclo da OP:** importação (modal, com documentos) → operador (identificação, apontamento com autosave, avanço de etapas, encerrar) → PCP (lista em 3 grupos, resumo completo, corrigir com auditoria, arquivar).

**Documentos:** anexar na criação e em OP já existente (botão no resumo), ver/baixar no PCP e no operador, remoção registrada no histórico. (Retenção "lixeira 180 dias" adiada para a Frente 1.)

**Busca por lote (genealogia):** filtro de arquivadas por número, lote e data.

**Acabamentos:** nome completo obrigatório (nome+sobrenome); teclado numérico nos campos de quantidade (campos com letra, como máquina, usam teclado normal).

**Correção do PCP:** refeita — alterações ficam em rascunho (não gravam na hora); o botão "Voltar" vira "Salvar e voltar" quando há mudanças; pop-up de 3 opções (Salvar / Descartar / Cancelar).

**FF (formulários de controle):**
- Diagnóstico das 13 FF em 3 níveis (simples / metrologia / complexas — FF-086 CEP é a mais complexa, provável ficar fora por ora).
- **Motor de formulários** criado: tela de FF (tabela de inclusão + histórico), coleção `registros_ff`, espelho na OP, `DEF_FF` (definição de colunas) e pop-up no PCP. Adicionar FF nova ≈ montar a tela + incluir a definição.
- **FF-002 Tamboreamento** completa (tabela de inclusão + histórico 30 dias, seleção de OP → cliente automático, espelho na OP, pop-up no PCP).
- **FF-004 Sinterização** completa (duas abas Sinterização/Descanso via seletor; linha de inclusão com assinaturas — Visto Moldagem / Visto Controlador — em blocos canvas abaixo da linha, opcionais; histórico com "assinado ✓" clicável; pop-up no PCP com duas tabelas e assinaturas).
- **Regra:** FF só aceita registro de OP já iniciada pelo 1º operador (tem `horarioAbertura`) e não arquivada. Trava também no momento de salvar.

**Carimbo de data nos horários (recém-implementado, A TESTAR):** o apontamento passa a guardar a data junto de cada horário (início, fim, paradas), carimbando a data local no momento em que o horário é preenchido e mantendo a original em edições (Comportamento B). Campos: `horaInicioData`, `horaFimData`, e nas paradas `inicioData`/`fimData`. Registros antigos não quebram (só não têm as datas). **Falta:** testar a gravação e depois MOSTRAR as datas nas telas (operador e PCP).

---

## 6. O que FALTA / próximos passos

1. **Testar o carimbo de data** e depois exibir data+hora nas telas (operador e PCP). *(retomar aqui)*
2. **Mais FF:** simples (FF-098 Sub-lote, FF-032 Numeração) são rápidas com o motor; metrologia (FF-005, 008, 100, 101) seguem o padrão; complexas (FF-003 Moldagem por cavidade, FF-086 CEP) por último. A FF-004 já cobre o caso "multi-aba + assinatura".
3. **Exportação da OP** em Excel/PDF — compactar todos os dados da OP num documento; ideal seguir o layout do formulário oficial impresso (que usa data+hora nos apontamentos).
4. **Frente 1 — SEGURANÇA** (pré-requisito antes de produção real):
   - Trancar Firestore e Storage (ambos em modo de teste/aberto). *Storage teve aviso de 30 dias desde a ativação (~11/07) — atenção ao prazo.*
   - Papéis de acesso: hoje só existe login admin (usado no PCP). Planejado: login de PCP (só PCP+operador) e login de operador. Telas de FF são exclusivas do admin. Hoje o acesso é controlado por tela/Knox, não por papel real no banco.
   - Autorização de dispositivo.
   - Retenção de documentos removidos ("lixeira" + regra de ciclo de vida de 180 dias no Google Cloud).
5. **Refatoração (dívida técnica anotada):**
   - Unificar CSS num `base.css` (hoje estilo.css / operador.css / ff.css duplicam o comum).
   - Modularizar o `pcp-lista.js` (está grande) quando o sistema estabilizar.
6. **Claude Code** — considerar migrar para editar arquivos direto (via app desktop), eliminando o copiar-colar manual. Explorar com calma.

---

## 7. Decisões e padrões importantes

- **Entrega de código:** pedaços (com âncoras e nº de linha) para mudanças pontuais; arquivo completo **validado** (sintaxe conferida antes de entregar) para mudanças estruturais. Validar sempre evita a "novela das chaves".
- **FF — arquitetura:** cada FF é uma tela própria (`ff-XXX.html`), sem login (Knox controla o acesso ao link no tablet). Uma coleção compartilhada `registros_ff` + espelho na OP. Definição de colunas em `DEF_FF` (no pcp-lista.js).
- **FF — layout:** tabelas estilo planilha, com tabela de inclusão separada (aparece ao clicar "+ Incluir", some ao salvar/cancelar) e tabela de histórico (30 dias; registros mais antigos somem da tela mas ficam no banco).
- **Datas locais:** usar sempre data/hora **local** (nunca `toISOString()` para datas de campo), para não gravar o dia seguinte à noite (fuso de São Paulo).
- **Cores:** azul #0b4f6c (PCP/cabeçalho), verde #0b7a3b (ações), laranja #f0a500 (etiqueta teste / aguardando PCP), cinza #9aa5b1.
- **Hardware (futuro):** tablets Samsung Galaxy Tab Active5 (rugged, Knox) nas estações pesadas; Tab A nos postos leves. Knox = modo quiosque, trava o tablet num link específico.

---

## 8. Como retomar em um chat novo

Estamos num **Projeto** do Claude, então a memória entre chats do mesmo projeto ajuda a manter o contexto. Ainda assim, ao iniciar um chat novo, forneça este `PROJETO.md` como âncora. Bom manter este arquivo atualizado no repositório após cada mudança grande.

**Ponto exato de retomada:** testar o carimbo de data nos horários do apontamento (conferir no Firestore se `horaInicioData` etc. são gravados) e, em seguida, exibir data+hora nas telas do operador e do PCP.
