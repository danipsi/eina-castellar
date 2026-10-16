// Marca les taules amb columnes amagades perquè es vegi que es poden lliscar (sobretot en mòbil).
function update(el: Element) {
  const box = el as HTMLElement, hidden = box.scrollWidth - box.clientWidth;
  box.classList.toggle('more-right', hidden - box.scrollLeft > 4);
  box.classList.toggle('more-left', hidden > 0 && box.scrollLeft > 4);
}

export function watchScrollHints() {
  let pending = false;
  const refresh = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {pending = false; document.querySelectorAll('.table-scroll').forEach(update);});
  };
  document.addEventListener('scroll', e => {if (e.target instanceof Element && e.target.classList.contains('table-scroll')) update(e.target);}, true);
  window.addEventListener('resize', refresh);
  new MutationObserver(refresh).observe(document.body, {childList: true, subtree: true});
  refresh();
}
