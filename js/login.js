// js/login.js

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // Simulando autenticación (puedes cambiar por validación real)
  if (username === "admin" && password === "1234") {
    localStorage.setItem("userLoggedIn", "true");
    window.location.href = "index.html"; // Redirige al inicio
  } else {
    document.getElementById("login-error").style.display = "block";
  }
});
