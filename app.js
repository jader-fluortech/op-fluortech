// ==========================================================
//  App principal — Projeto OP Fluortech
//  Por enquanto: testa a conexão com o banco e mostra na tela.
// ==========================================================

import { db, AMBIENTE } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Pega os elementos da tela que vamos atualizar
const statusConexao = document.getElementById("status-conexao");
const etiquetaAmbiente = document.getElementById("ambiente");

// Ajusta a etiqueta do ambiente no cabeçalho
etiquetaAmbiente.textContent = "ambiente de " + AMBIENTE;

// ----------------------------------------------------------
//  Teste de conexão com o Firestore
// ----------------------------------------------------------
async function testarConexao() {
  try {
    // Tenta ler uma coleção qualquer (mesmo que ainda esteja vazia).
    // Se o banco responder, a conexão está funcionando.
    await getDocs(collection(db, "ordens_producao"));

    statusConexao.textContent = "✅ Conectado ao banco de dados (" + AMBIENTE + ").";
    statusConexao.style.color = "#0b7a3b";
    statusConexao.style.borderColor = "#8fd0a8";
  } catch (erro) {
    statusConexao.textContent = "❌ Não foi possível conectar. Detalhe: " + erro.message;
    statusConexao.style.color = "#b3261e";
    statusConexao.style.borderColor = "#e6a8a3";
    console.error("Erro de conexão:", erro);
  }
}

testarConexao();
