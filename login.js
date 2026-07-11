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

const telaLogin = document.getElementById("tela-login");
const areaPcp = document.getElementById("area-pcp");
const btnSair = document.getElementById("btn-sair");
const btnEntrar = document.getElementById("btn-entrar");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const msgLogin = document.getElementById("msg-login");

// Guarda o e-mail do PCP logado, acessível para outros arquivos
window.emailPcpLogado = null;

setPersistence(auth, browserSessionPersistence);

const MINUTOS_INATIVIDADE = 30;
let cronometroInatividade = null;

function iniciarCronometroInatividade() {
  reiniciarCronometroInatividade();
  ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach(function (evento) {
    document.addEventListener(evento, reiniciarCronometroInatividade, { passive: true });
  });
}
function reiniciarCronometroInatividade() {
  if (cronometroInatividade) clearTimeout(cronometroInatividade);
  cronometroInatividade = setTimeout(function () {
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

onAuthStateChanged(auth, function (usuario) {
  if (usuario) {
    window.emailPcpLogado = usuario.email;   // disponibiliza o e-mail logado
    telaLogin.style.display = "none";
    areaPcp.style.display = "block";
    btnSair.style.display = "inline-block";
    iniciarCronometroInatividade();
  } else {
    window.emailPcpLogado = null;
    telaLogin.style.display = "block";
    areaPcp.style.display = "none";
    btnSair.style.display = "none";
    pararCronometroInatividade();
  }
});

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

btnSair.addEventListener("click", function () {
  signOut(auth);
});
