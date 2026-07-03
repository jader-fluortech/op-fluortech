// ==========================================================
//  Configuração do Firebase — Projeto OP Fluortech
//  Este arquivo conecta o sistema ao banco de dados correto.
// ==========================================================

// Importa as funções do Firebase (versão moderna, via link/CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// ----------------------------------------------------------
//  AMBIENTE ATUAL
//  Troque para "producao" quando o sistema for para produção.
// ----------------------------------------------------------
const AMBIENTE = "teste";

// ----------------------------------------------------------
//  Configurações de cada ambiente
// ----------------------------------------------------------
const configuracoes = {

  teste: {
    apiKey: "AIzaSyBkjhpNekeQZ3iXoi9pjfkMew_x-DiHmzg",
    authDomain: "op-fluortech-teste.firebaseapp.com",
    projectId: "op-fluortech-teste",
    storageBucket: "op-fluortech-teste.firebasestorage.app",
    messagingSenderId: "96929683335",
    appId: "1:96929683335:web:159b03a74cdc2960676522",
    measurementId: "G-4EGDJPR3J2"
  },

  // O ambiente de produção será preenchido no futuro.
  producao: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }

};

// ----------------------------------------------------------
//  Inicialização (não precisa mexer daqui para baixo)
// ----------------------------------------------------------
const configAtiva = configuracoes[AMBIENTE];

const app = initializeApp(configAtiva);
const db = getFirestore(app);

// Deixa o banco e o nome do ambiente disponíveis para o resto do sistema
export { db, AMBIENTE };
