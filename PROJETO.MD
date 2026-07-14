# PROJETO OP FLUORTECH — Documentação Completa

*Sistema web de Ordens de Produção + Formulários de Controle (FF). Um MES (Manufacturing Execution System) caseiro para a Fluortech — fabricante de peças em PTFE/Teflon, Cotia/SP.*

**Última atualização:** julho/2026
**Status:** em desenvolvimento, ambiente de teste (ainda não em produção real).

---

## ÍNDICE
1. Visão geral e filosofia
2. Stack e infraestrutura
3. Perfil de trabalho e entrega de código
4. Arquivos do repositório (detalhado)
5. Modelo de dados (Firestore) — completo
6. Fluxos do sistema (OP, operador, PCP)
7. Formulários de Controle (FF) — diagnóstico e motor
8. O que está PRONTO
9. O que FALTA / roadmap
10. Decisões, padrões e armadilhas conhecidas
11. Hardware e Knox
12. Como retomar em um chat novo

---

## 1. VISÃO GERAL E FILOSOFIA

O sistema digitaliza o chão de fábrica da Fluortech. Ele:
- Importa Ordens de Produção (OP) exportadas do ERP TOTVS (arquivo TXT).
- Deixa o operador apontar a produção etapa por etapa (tempos, quantidades, perdas, paradas, com identificação e assinatura no dedo).
- Dá ao PCP um painel para acompanhar, corrigir (com auditoria), arquivar, e anexar documentos.
- Permite que os operadores preencham os Formulários de Controle (FF) de qualidade digitalmente, ligados às OPs.

**É um MES de verdade** (despacha trabalho, força sequência de etapas, coleta evidência no momento, gera trilha auditável). Diferencial: não depende de sensores caros — os dados vêm do que os operadores registram nos tablets.

**Princípios adotados:**
- Rastreabilidade (genealogia por lote, trilha de auditoria do PCP, assinaturas).
- Nunca sobrescrever silenciosamente: correções ficam registradas (de/para).
- Dados contemporâneos: apontamentos e carimbos de data feitos no momento.
- Fidelidade ao formulário oficial impresso (que usa data+hora nos apontamentos).

---

## 2. STACK E INFRAESTRUTURA

- **Hospedagem:** GitHub Pages. Repositório público `op-fluortech`, owner `jader-fluortech`.
- **Banco:** Firebase Firestore, projeto `op-fluortech-teste`, região `southamerica-east1`.
- **Autenticação:** Firebase Auth (email/senha). Só a tela do PCP tem login. Hoje existe **um único login = admin**.
- **Storage:** Firebase Storage (plano Blaze), para documentos anexados às OPs. Caminho: `ops/[numero]/`.
- **Firebase via CDN:** `https://www.gstatic.com/firebasejs/12.15.0/...`. Sem build tools, sem ambiente local.
- **AMBIENTE = "teste"** (etiqueta laranja "ambiente de teste"). Banco e Storage ainda **abertos** (modo de teste) — trancar é a Frente 1.

**URLs:**
- PCP: `https://jader-fluortech.github.io/op-fluortech/`
- Operador: `.../operador.html`
- FF-002: `.../ff-002.html`
- FF-004: `.../ff-004.html`

**firebaseConfig (teste):** projectId `op-fluortech-teste`, authDomain `op-fluortech-teste.firebaseapp.com`, storageBucket `op-fluortech-teste.firebasestorage.app`, messagingSenderId `96929683335`, region southamerica-east1.

---

## 3. PERFIL DE TRABALHO E ENTREGA DE CÓDIGO

O dono (Jader) **não é programador** e edita tudo **direto pelo site do GitHub**: abre o arquivo → lápis (editar) → Cmd+A → cola → "Commit changes". Testa com Cmd+Shift+R (recarga forçada, limpa cache). Idioma do projeto: português.

**Formato de entrega de código (regra estrita):**
- **Mudança pontual (1–3 trechos):** entregar em pedaços, cada um com:
  1. Trecho de referência ANTES (a linha ACIMA do que muda — âncora, não muda; deve ser diferente do código antigo).
  2. Código ANTIGO (exatamente o que sai).
  3. Código NOVO (o que entra).
  4. Trecho de referência DEPOIS (a linha abaixo — âncora).
  - Sempre incluir o **número de linha aproximado**.
- **Mudança estrutural/espalhada (funções novas, divisão de funções, muitos pontos):** entregar o **arquivo completo já validado** (sintaxe conferida com `node --check` + contagem de chaves/parênteses ANTES de entregar), avisando o porquê.
- Uploads de arquivo no chat chegam vazios às vezes; preferir colar texto ou mandar prints do GitHub.

**Lição aprendida (a "novela das chaves"):** colar muitos pedaços num arquivo grande acumula erros de chave. Por isso: validar a sintaxe localmente antes de entregar arquivos completos, e reconstruir o arquivo inteiro quando a emenda ficar arriscada.

---

## 4. ARQUIVOS DO REPOSITÓRIO (DETALHADO)

**index.html** — Tela do PCP. Contém: login, botão "+ Importar OP" (abre modal de importação), lista de OPs em 3 grupos recolhíveis (Aguardando 1º operador / Em andamento / Arquivadas), o resumo da OP (`pcp-resumo`), o modal de documentos (`modal-docs`) e o modal de FF. Carrega login.js, importar-op.js, pcp-lista.js.

**estilo.css** — CSS do PCP (cabeçalho, cartões, resumo, modais, botões, histórico, filtros, botões de FF).

**firebase.js** — inicializa Firestore + Auth + Storage; exporta `{db, auth, storage, AMBIENTE}`; AMBIENTE = "teste".

**login.js** — autenticação do PCP (login único admin), sessão, expõe `window.emailPcpLogado`.

**importar-op.js** — modal de importação: lê o TXT via `lerOP` (leitor-op.js, encoding windows-1252), mostra cartões com os dados, área de documentos (sobe ao Storage ao salvar, em `ops/[numero]/`), regras de reimportação (bloqueia OP arquivada; avisa se ativa).

**leitor-op.js** — parser do TXT do TOTVS (relatório LMATR820L). Função exportada `lerOP`. Extrai número, cliente, pedido, quantidade, produto, descrição, datas, matéria-prima (código/lote/qtde), parâmetros de moldagem, e as operações/etapas (recurso + operação).

**operador.html / operador.js / operador.css** — Tela do operador (sem login; Knox controla). Lista OPs ativas (cards). Ao abrir uma OP: identificação (nome+sobrenome obrigatório + assinatura em canvas), e o apontamento da etapa atual: "Iniciar processo" (marca hora), hora início/fim, qtde produzida, perdas + motivo, paradas (adicionar/remover, cada uma início/fim/motivo), autosave (grava no banco ~1s após cada mudança), finalizar/encerrar etapa. Documentos da OP visíveis na ficha. Funções-chave: `montarFicha`, `montarApontamento`, `coletarApontamento`, `salvarApontamento` (autosave), `carimbarDatas` (data nos horários), `iniciarEtapa`, `finalizarEtapa`, `executarFinalizacao`.

**pcp-lista.js** (~960 linhas) — o maior arquivo. Contém: carregamento das OPs (onSnapshot), montagem das 3 listas, filtro de arquivadas (número + lote + data), resumo completo da OP (`montarResumo`), correção com rascunho + auditoria (`ligarCamposEditaveis`, `registrarRascunho`, `salvarRascunhoEVoltar`), arquivar (`arquivarOP`), documentos (`abrirModalDocs`, `salvarDocs`), e os Registros de FF (`DEF_FF`, `abrirRegistrosFF`, `montarTabelaFF`, `abrirAssinaturaPcp`). Modais criados por JS: confirmação (2 botões), 3 opções (Salvar/Descartar/Cancelar), documentos, FF.

**ff.css** — CSS comum das telas de FF: cabeçalho azul, status, tabelas estilo planilha (`tabela-ff`, scroll horizontal), tabela de inclusão vs. histórico, abas (`abas-ff`), blocos de assinatura (canvas), botão "assinado ✓".

**ff-002.html / ff-002.js** (~215 linhas) — FF-002 Tamboreamento (ver seção 7).

**ff-004.html / ff-004.js** (~398 linhas) — FF-004 Sinterização (ver seção 7).

**PROJETO.md** — este documento.

---

## 5. MODELO DE DADOS (FIRESTORE) — COMPLETO

### Coleção `ordens_producao`
Documento por OP, **ID = número da OP** (ex: "016456010012").

Campos:
- `numero`, `cliente`, `pedidoCliente`, `quantidade`, `produto`, `descricao`
- `iniPrevisto`, `fimEfetivo`, `desenho`
- `materiaPrima[]` — cada: `{codigo, lote, qtdeMP, descricao}`
- `parametrosMoldagem[]` — cada: `{parametro, valor, tolMin, tolMax}`
- `operacoes[]` — dados brutos das operações do TXT
- `status` — `"ativa"` | `"finalizada_aguardando_pcp"` | `"finalizada_arquivada"`
- `etapaAtual` — índice 1-based da etapa corrente
- `etapas[]` — ver abaixo
- `importadaEm`, `encerradaEm`, `arquivadaEm`, `arquivadaPor` (ISO / email)
- `historicoPcp[]` — trilha de auditoria (ver abaixo)
- `documentos[]` — `{nome, url, caminho}`
- `registrosFF[]` — espelho dos registros de FF (ver abaixo)

**Cada `etapa`:**
`{ ordem, recursoCodigo, recurso, operacaoCodigo, operacao, status ("pendente"|"em_producao"|"concluida"), operadorNome, operadorAssinatura (PNG base64), horarioAbertura (ISO), horarioInicioProcesso (ISO), horarioFimEtapa (ISO), apontamentos }`

**`apontamentos`:**
`{ horaInicio ("HH:MM"), horaFim, qtdeProduzida, qtdePerda, motivoPerda (código), paradas[], atualizadoEm (ISO), horaInicioData ("AAAA-MM-DD"), horaFimData }`
- Cada **parada**: `{ inicio, fim, motivo, inicioData, fimData }`
- Os campos `*Data` foram adicionados no carimbo de data (mantêm a data original — Comportamento B). Registros antigos podem não tê-los.

**`historicoPcp[]`:** cada entrada `{ acao, autor (email), em (ISO), ... }`:
- `acao: "arquivou"` — só autor/em.
- `acao: "corrigiu"` — + `mudancas[]` de `{etapa, campo, de, para}`.
- `acao: "documentos"` — + `adicionados[]` e `removidos[]` (nomes).

### Coleção `registros_ff`
Um documento por registro de FF (ID automático).
`{ ff ("ff002"|"ff004"|...), nomeFf, aba (só multi-aba, ex "sinterizacao"/"descanso"), opId, numeroOp, cliente, responsavel (FF-002), criadoEm (ISO), campos {...específicos da FF} }`

**Espelho `registrosFF[]` na OP:** ao salvar um registro, grava também na OP um item `{ ff, nomeFf, aba?, responsavel?, criadoEm, campos }`. É o que alimenta o pop-up "Registros de FF" no PCP (e a futura exportação).

---

## 6. FLUXOS DO SISTEMA

### Importação da OP (PCP)
"+ Importar OP" → modal → escolhe o TXT do TOTVS → `lerOP` parseia → cartões com os dados → área de documentos (opcional) → "Salvar OP no sistema" → sobe documentos ao Storage, grava a OP com `status: "ativa"`, `etapaAtual: 1`. Regras: bloqueia reimportar OP arquivada; avisa se já existe ativa.

### Operador
Vê cards das OPs ativas. Abre uma → se a etapa está livre, faz identificação (nome+sobrenome + assinatura) e "Iniciar etapa" (grava `horarioAbertura`, status `em_producao`). Depois aponta: "Iniciar processo" (grava `horarioInicioProcesso` + hora), preenche hora fim, quantidades, perdas, paradas — tudo com **autosave** (~1s). "Finalizar" avança a etapa (ou encerra a OP → `finalizada_aguardando_pcp`). Validações: nome completo, ao menos hora de início para finalizar.

### PCP
Lista em 3 grupos. Abre a OP → resumo completo (dados, matéria-prima, etapas com apontamentos e assinaturas, documentos, registros de FF, histórico). Ações:
- **Corrigir OP** (só em `finalizada_aguardando_pcp`): entra em modo correção; edita campos do apontamento (hora início/fim, qtde, perdas); cada alteração fica em **rascunho** (não grava na hora); o botão "Voltar" vira **"Salvar e voltar"**; ao sair, pop-up de 3 opções (Salvar grava tudo + registra auditoria / Descartar / Cancelar).
- **Arquivar OP** → `finalizada_arquivada` + registro no histórico.
- **Documentos** (ativa ou aguardando PCP): adicionar/remover; mudanças registradas no histórico.
- **Filtro de arquivadas:** por número da OP, lote (busca parcial em qualquer material — genealogia), e intervalo de datas.

---

## 7. FORMULÁRIOS DE CONTROLE (FF)

### Diagnóstico das 13 FF (3 níveis)
- **Nível 1 (tabela simples):** FF-098 Sub-lote, FF-032 Numeração de Certificado, FF-002 Tamboreamento.
- **Nível 2 (metrologia — cabeçalho + características medidas):** FF-005 Usinagem, FF-008 Ranhura/Corte/Chanfro, FF-100 Corte e Faceamento, FF-101 Laminação, FF-004 Sinterização (2 abas), FF-012 Defeitos, FF-080 Inspeção (frente/verso), FF-033 Certificado.
- **Nível 3 (complexas):** FF-003 Moldagem (metrologia por cavidade 1–8 + monitoramento no tempo + diário), FF-086 Monitoramento Estatístico de Processo (CEP/SPC, 8 abas com gráficos — provável ficar fora do sistema por ora).

Circulação (do índice LISTA.xlsx): "Enviado com a OP" (003, 005, 098), "Fixo no setor" (002, 004, 008, 012, 032, 033, 100, 101), "Usado no processo" (080).

### O motor de formulários (arquitetura reutilizável)
Criado com a FF-002 e evoluído com a FF-004. Componentes:
1. **Tela própria por FF** (`ff-XXX.html` + `ff-XXX.js`), sem login (Knox controla). Cabeçalho azul padrão, `ff.css` compartilhado.
2. **Layout:** tabela de **inclusão** (aparece ao clicar "+ Incluir novo registro", some ao salvar/cancelar) + tabela de **histórico** (últimos 30 dias; registros mais antigos somem da tela mas ficam no banco). Estilo planilha, scroll horizontal.
3. **Seleção de OP** no registro → só OPs **já iniciadas** pelo 1º operador (têm `horarioAbertura`) e **não arquivadas**. Trava também no salvar (reconfere no banco).
4. **Banco:** grava em `registros_ff` E espelha na OP (`registrosFF[]`).
5. **No PCP:** seção "Registros de FF" no resumo, um botão por FF com registro ("📋 FF-XXX Nome (N)"). Pop-up (só leitura) mostra a(s) tabela(s) da FF. Definição de colunas em `DEF_FF` (pcp-lista.js). **Adicionar FF nova ≈ criar a tela + incluir a definição em DEF_FF.**

### FF-002 Tamboreamento (completa)
Tabela única. Colunas: Data, Cliente, Ordem de Produção, Qtde Total, Qtde Parcial, Nº Máquina, Horário Inicial, Horário Final, Responsável, Diário de Bordo. Seleção de OP → cliente automático. Responsável exige nome+sobrenome. Data usa fuso local. No PCP, o pop-up omite Cliente e OP (já visíveis no topo da OP).

### FF-004 Sinterização (completa — caso multi-aba + assinatura)
Duas abas via seletor na mesma página (sem trocar aba do navegador):
- **Sinterização** (14 colunas): Data Entrada, Hora Entrada, Nº OP, Nº Bandeja, Sub-lote, Parede (mm), **Visto Moldagem** (assinatura), Hora Ent. Forno, Data Ent. Forno, Nº Forno, Hora Saída Forno, Data Saída Forno, **Visto Controlador** (assinatura), ID Gráfico.
- **Descanso** (8 colunas): Data Entrada, Hora Entrada, Nº OP, Nº Bandeja, Parede (mm), Hora Saída, Data Saída, **Visto Controlador** (assinatura).
- Seleção só da OP (sem cliente). As duas assinaturas são **opcionais** (por ora). Na inclusão, os campos ficam na linha e as assinaturas aparecem como **blocos de canvas abaixo da linha**. No histórico e no PCP, aparecem como "assinado ✓" clicável (abre a assinatura).
- Campo `aba` distingue os registros. `DEF_FF.ff004` tem a estrutura `abas: [...]` (o pop-up do PCP mostra duas tabelas).

---

## 8. O QUE ESTÁ PRONTO
- Ciclo completo da OP: importação (com documentos) → operador (apontamento + autosave) → PCP (acompanhar/corrigir/arquivar).
- Documentos: anexar na criação e em OP existente; ver/baixar no PCP e operador; remoção auditada.
- Busca por lote (genealogia) no filtro de arquivadas.
- Acabamentos: nome+sobrenome obrigatório; teclado numérico nos campos só-número.
- Correção do PCP refeita (rascunho + "Salvar e voltar" + pop-up 3 opções).
- FF: motor pronto; **FF-002 e FF-004 completas** (tela + espelho na OP + pop-up no PCP).
- Regra "FF só em OP iniciada e não arquivada".
- Carimbo de data nos horários do apontamento (implementado — **A TESTAR** e depois exibir nas telas).

---

## 9. O QUE FALTA / ROADMAP
1. **Testar o carimbo de data** (conferir `horaInicioData` etc. no Firestore) e **exibir data+hora** nas telas (operador e PCP). ← PONTO DE RETOMADA
2. **Mais FF:** simples (098, 032) rápidas; metrologia (005, 008, 100, 101) seguem o padrão; complexas (003, 086) por último; 086 (CEP) talvez fora do sistema.
3. **Exportação da OP** em Excel/PDF, seguindo o layout do formulário oficial impresso (usa data+hora nos apontamentos, campos de paradas etc.).
4. **Frente 1 — Segurança** (pré-requisito para produção):
   - Trancar Firestore e Storage (hoje abertos). *Storage teve aviso de 30 dias desde ~11/07 — atenção ao prazo.*
   - Papéis: hoje só login admin (no PCP). Planejado: login de PCP (PCP+operador), login de operador. FFs exclusivas do admin. Hoje o controle é por tela/Knox, não por papel no banco.
   - Autorização de dispositivo.
   - Retenção de documentos removidos: "lixeira" + regra de ciclo de vida de 180 dias no Google Cloud.
5. **Refatoração (dívida técnica):**
   - Unificar CSS em `base.css` (estilo/operador/ff duplicam o comum).
   - Modularizar `pcp-lista.js` (~960 linhas) quando estabilizar.
6. **Claude Code:** avaliar editar arquivos direto (app desktop), eliminando copiar-colar. Explorar com calma.

---

## 10. DECISÕES, PADRÕES E ARMADILHAS
- **Datas locais:** nunca usar `toISOString()` para datas de campo (grava o dia seguinte à noite, fuso SP). Montar `AAAA-MM-DD` com getFullYear/getMonth/getDate locais.
- **Carimbo de data (Comportamento B):** a data é carimbada quando o horário é preenchido e **mantida** em edições posteriores (feito na `salvarApontamento`, comparando com o que já está no banco).
- **Correção do PCP:** nada vai ao banco até "Salvar e voltar" (rascunho na tela); auditoria agrupada.
- **Firebase rules:** omissão de coleção quebra features silenciosamente — ao trancar, listar todas (`ordens_producao`, `registros_ff`).
- **Console/scripts de manutenção:** usar IIFE `(async () => { ... })()` para evitar erro de redeclaração.
- **PDF/exportação:** ordem dos campos importa (posicional pode deixar campos invisíveis).
- **Cores:** azul #0b4f6c (PCP/cabeçalho), verde #0b7a3b (ações), laranja #f0a500 (etiqueta teste / aguardando PCP), cinza #9aa5b1.
- **Validação de nome:** `nome.split(/\s+/).filter(p=>p.length>0).length < 2` → exige nome+sobrenome.
- **Teclado:** campos só-número → `type=number inputmode=numeric`; campos com letra (máquina) → `type=text` sem inputmode.

---

## 11. HARDWARE E KNOX
Tablets Samsung Galaxy Tab Active5 (rugged, IP68, Knox) nas estações pesadas; Galaxy Tab A nos postos leves. **Knox = modo quiosque:** trava o tablet num link específico, sem barra de endereço nem abas manuais, impedindo o operador de sair do sistema. Documentos abrem em aba nova (o Knox permite quando o código pede, mas bloqueia abas manuais). O controle de "quem acessa qual FF" será por Knox (cada tablet abre só o link autorizado) até existirem papéis reais no banco.

---

## 12. COMO RETOMAR EM UM CHAT NOVO
Este é um **Projeto do Claude** — a memória entre chats do mesmo projeto ajuda a manter contexto. Ainda assim:
- Crie o chat novo **dentro deste mesmo Projeto** (não solto).
- Forneça este `PROJETO.md` como âncora (colar o conteúdo ou apontar o arquivo no repositório).
- Mantenha o `PROJETO.md` versionado no repositório e atualizado após cada mudança grande.

**PONTO EXATO DE RETOMADA:** testar o carimbo de data nos horários do apontamento (conferir no Firestore se `horaInicioData`, `horaFimData`, `inicioData`/`fimData` das paradas são gravados), e em seguida exibir data+hora nas telas do operador e do PCP.
