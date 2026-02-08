export class App {
  start() {
    const el = document.querySelector<HTMLDivElement>("#app");
    if (!el) throw new Error("Missing #app element");
    el.textContent = "Circuit sim bootstrap OK ✅";
  }
}