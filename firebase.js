// ==========================================================
//  Configuração do Firebase — Projeto OP Fluortech
//  Conecta o sistema ao banco de dados e ao login corretos.
// ==========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";

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
const auth = getAuth(app);

// Deixa o banco, o login e o ambiente disponíveis para o resto do sistema
export { db, auth, AMBIENTE };
