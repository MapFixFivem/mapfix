/* MapFix · dropdown.js — Menu déroulant sur mesure pour « Ressource conservée ».
   Le <select> natif reste dans la page (caché) : c'est lui qui porte la valeur et qui reçoit l'événement « change »,
   donc le reste du code ne change pas. Le menu s'affiche en position fixe (il n'est jamais coupé par la liste qui défile).
   Clavier : Entrée/Espace/↓ ouvrent, ↑↓ naviguent, Entrée choisit, Échap ferme. */
'use strict';

(() => {
  let menu = null, owner = null;

  function close(refocus) {
    if (!menu) return;
    menu.remove(); menu = null;
    owner.setAttribute('aria-expanded', 'false');
    if (refocus) owner.focus();
    owner = null;
  }

  function pick(sel, btn, value) {
    if (sel.value !== value) {
      sel.value = value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      btn.querySelector('span').textContent = sel.options[sel.selectedIndex].textContent;
      sfx.play('tick');
    }
    close(true);
  }

  function open(btn) {
    const sel = btn.parentNode.querySelector('select');
    menu = document.createElement('div');
    menu.className = 'dd-menu'; menu.setAttribute('role', 'listbox');
    [...sel.options].forEach(o => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'dd-opt'; b.setAttribute('role', 'option');
      b.dataset.v = o.value; b.textContent = o.textContent;
      b.setAttribute('aria-selected', String(o.value === sel.value));
      b.addEventListener('click', () => pick(sel, btn, o.value));
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    owner = btn; btn.setAttribute('aria-expanded', 'true');

    // placement : sous le bouton, ou au-dessus s'il n'y a pas la place
    const r = btn.getBoundingClientRect(), h = menu.offsetHeight;
    menu.style.minWidth = r.width + 'px';
    const below = innerHeight - r.bottom - 10, above = r.top - 10;
    const up = h > below && above > below;
    menu.style.maxHeight = Math.max(120, Math.min(280, up ? above : below)) + 'px';
    menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 8) + 'px';
    menu.style.top = up ? Math.max(8, r.top - menu.offsetHeight - 6) + 'px' : r.bottom + 6 + 'px';
    menu.classList.toggle('up', up);
    (menu.querySelector('[aria-selected=true]') || menu.firstChild).focus();
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.dd-btn');
    if (!btn) return;
    const wasOpen = owner === btn;
    close();
    if (!wasOpen) open(btn);
  });
  document.addEventListener('pointerdown', e => { if (menu && !menu.contains(e.target) && !e.target.closest('.dd-btn')) close(); }, true);
  addEventListener('resize', () => close());
  addEventListener('scroll', e => { if (menu && !menu.contains(e.target)) close(); }, true);

  document.addEventListener('keydown', e => {
    if (menu) {
      const opts = [...menu.children], i = opts.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(opts.length - 1, i + 1)].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); opts[Math.max(0, i - 1)].focus(); }
      else if (e.key === 'Tab') close();
    } else if (e.key === 'ArrowDown' && e.target.matches?.('.dd-btn')) { e.preventDefault(); open(e.target); }
  });
})();
