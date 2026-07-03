// ==========================================================
//  Login do PCP — controla o acesso à área de importação
// ==========================================================

import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
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
//  Vigia o estado do login:
//  se está logado, mostra a área do PCP; se não, mostra o login.
// ----------------------------------------------------------
onAuthStateChanged(auth, function (usuario) {
  if (usuario) {
    telaLogin.style.display = "none";
    areaPcp.style.display = "block";
    btnSair.style.display = "inline-block";
  } else {
    telaLogin.style.display = "block";
    areaPcp.style.display = "none";
    btnSair.style.display = "none";
  }
});

// ----------------------------------------------------------
//  Botão "Entrar"
// ----------------------------------------------------------
btnEntrar.addEventListener("click", entrar);

// Permite entrar apertando Enter no campo de senha
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
    await signInWithEmailAndPassword(auth, email, senha);
    // Deu certo: o onAuthStateChanged acima cuida de trocar a tela.
    msgLogin.textContent = "";
    campoSenha.value = "";
  } catch (erro) {
    // Mensagem amigável, sem revelar detalhes técnicos
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
