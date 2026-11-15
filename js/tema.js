// Modo día / noche. Cada dispositivo recuerda lo que eligió la persona;
// si nunca eligió, sigue la configuración del computador o celular.
(function () {
  const raiz = document.documentElement;
  const sistema = matchMedia("(prefers-color-scheme: dark)");
  let guardado = null;
  try { guardado = localStorage.getItem("tema"); } catch (e) {}
  if (guardado === "dark" || guardado === "light") raiz.dataset.theme = guardado;

  const actual = () => raiz.dataset.theme || (sistema.matches ? "dark" : "light");
  const icono = d => `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const LUNA = icono('<path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z"/>');
  const SOL = icono('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>');

  function pintar() {
    const b = document.getElementById("tema");
    if (!b) return;
    const noche = actual() === "dark";
    b.innerHTML = (noche ? SOL : LUNA) + `<span class="tt">${noche ? "Modo día" : "Modo noche"}</span>`;
    b.setAttribute("aria-label", noche ? "Cambiar a modo día" : "Cambiar a modo noche");
    b.title = noche ? "Modo día" : "Modo noche";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const b = document.getElementById("tema");
    b.onclick = () => {
      const t = actual() === "dark" ? "light" : "dark";
      raiz.dataset.theme = t;
      try { localStorage.setItem("tema", t); } catch (e) {}
      pintar();
    };
    pintar();
  });
  sistema.addEventListener("change", pintar);
})();
