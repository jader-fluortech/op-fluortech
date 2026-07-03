// ==========================================================
//  Login do PCP — acesso, sessão por aba e bloqueio por inatividade
// ==========================================================

import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

// Elementos da tela
const telaLogin = document.getElementById("tela-login");
const areaPcp = document.getElementById("area-pcp");
const btnSair = document.getElementById("btn-sair");
const btnEntrar = document.getElementById("btn-entrar");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const msgLogin = document.getElementById("msg-login");

// ----------------------------------------------------------
//  Sessão dura só enquanto a aba está aberta.
//  Fechou a aba/navegador → precisa logar de novo.
// ----------------------------------------------------------
setPersistence(auth, browserSessionPersistence);

// ----------------------------------------------------------
//  Bloqueio por inatividade (30 minutos)
// ----------------------------------------------------------
const MINUTOS_INATIVIDADE = 30;
let cronometroInatividade = null;

function iniciarCronometroInatividade() {
  reiniciarCronometroInatividade();
  // Cada uma dessas ações conta como "atividade" e reinicia o contador
  ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach(function (evento) {
    document.addEventListener(evento, reiniciarCronometroInatividade, { passive: true });
  });
}

function reiniciarCronometroInatividade() {
  if (cronometroInatividade) clearTimeout(cronometroInatividade);
  cronometroInatividade = setTimeout(function () {
    // Passaram 30 min sem atividade → desloga
    signOut(auth);
    msgLogin.textContent = "Sessão encerrada por inatividade. Faça login novamente.";
    msgLogin.className = "msg-login erro-msg";
  }, MINUTOS_INATIVIDADE * 60 * 1000);
}

function pararCronometroInatividade() {
  if (cronometroInatividade) clearTimeout(cronometroInatividade);
  ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach(function (evento) {
    document.removeEventListener(evento, reiniciarCronometroInatividade);
  });
}

// ----------------------------------------------------------
//  Vigia o estado do login e mostra a área certa
// ----------------------------------------------------------
onAuthStateChanged(auth, function (usuario) {
  if (usuario) {
    telaLogin.style.display = "none";
    areaPcp.style.display = "block";
    btnSair.style.display = "inline-block";
    iniciarCronometroInatividade();
  } else {
    telaLogin.style.display = "block";
    areaPcp.style.display = "none";
    btnSair.style.display = "none";
    pararCronometroInatividade();
  }
});

// ----------------------------------------------------------
//  Botão "Entrar"
// ----------------------------------------------------------
btnEntrar.addEventListener("click", entrar);
campoSenha.addEventListener("keydown", function (evento) {
  if (evento.key === "Enter") entrar();
});

async function entrar() {
  const email = campoEmail.value.trim();
  const senha = campoSenha.value;

  if (!email || !senha) {
    msgLogin.textContent = "Preencha e-mail e senha.";
    msgLogin.className = "msg-login erro-msg";
    return;
  }

  btnEntrar.disabled = true;
  msgLogin.textContent = "Entrando…";
  msgLogin.className = "msg-login";

  try {
    // Garante a sessão por aba antes de entrar
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, senha);
    msgLogin.textContent = "";
    campoEmail.value = "";
    campoSenha.value = "";
    btnEntrar.disabled = false;
  } catch (erro) {
    msgLogin.textContent = "E-mail ou senha incorretos. Tente novamente.";
    msgLogin.className = "msg-login erro-msg";
    btnEntrar.disabled = false;
    console.error("Erro de login:", erro.code);
  }
}

// ----------------------------------------------------------
//  Botão "Sair"
// ----------------------------------------------------------
btnSair.addEventListener("click", function () {
  signOut(auth);
});
