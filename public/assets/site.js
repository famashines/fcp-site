const header = document.querySelector(".top");
const mark = () => header.toggleAttribute("data-stuck", window.scrollY > 4);
window.addEventListener("scroll", mark, { passive: true });
mark();
