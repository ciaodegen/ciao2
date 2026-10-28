
document.querySelectorAll('audio').forEach(a => a.addEventListener('play', () => {
  document.querySelectorAll('audio').forEach(o => { if (o !== a) o.pause(); });
}));
document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', () => {
  const id = b.dataset.id, code = b.previousElementSibling;
  const done = () => { b.textContent = 'Kopyalandı'; setTimeout(() => b.textContent = "ID'yi kopyala", 1500); };
  const fallback = () => { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  try { navigator.clipboard.writeText(id).then(done, fallback); } catch (e) { fallback(); }
}));
