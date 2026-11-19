// Kwik Budget website. Small, dependency-free.
// Store links: set these once the listings are live. Until then the buttons go to the download section.
const STORE = {
  ios: '', // e.g. 'https://apps.apple.com/app/id0000000000'
  android: '', // e.g. 'https://play.google.com/store/apps/details?id=app.kwikbudget'
};

document.documentElement.classList.add('js');

document.querySelectorAll('[data-store]').forEach((a) => {
  const url = STORE[a.dataset.store];
  if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
});

document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });

const nav = document.querySelector('.nav');
const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 8);
onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

// Reveal on scroll
const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
  es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { rootMargin: '0px 0px -10% 0px' }) : null;
document.querySelectorAll('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

// Chat demo: types a message, then shows the entry it becomes
const demo = document.querySelector('[data-chat]');
if (demo) {
  const lines = [
    { say: 'lunch 8.50 mamas', icon: 'fork', name: "Mama's", sub: 'Eating out · Food jar', amt: '−$8.50' },
    { say: 'uber 14 yesterday', icon: 'car', name: 'Uber', sub: 'Transport · yesterday', amt: '−$14.00' },
    { say: 'got 50 tips', icon: 'plus', name: 'Tips', sub: 'Extra income · Buffer jar', amt: '+$50.00' },
    { say: 'netflix paid', icon: 'repeat', name: 'Netflix', sub: 'Subscription · marked paid', amt: '−$15.49' },
  ];
  const ICON = {
    fork: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.4 10 16 6.5A2 2 0 0 0 14.3 6H9.7a2 2 0 0 0-1.7.9L5.6 10 3.5 11c-.8.3-1.5 1-1.5 2v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  };
  const out = demo.querySelector('[data-say]');
  const card = demo.querySelector('[data-card]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  const show = (l) => {
    card.querySelector('.ic').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[l.icon]}</svg>`;
    card.querySelector('b').textContent = l.name;
    card.querySelector('small').textContent = l.sub;
    card.querySelector('.amt').textContent = l.amt;
    card.querySelector('.amt').style.color = l.amt.startsWith('+') ? 'var(--deep)' : 'var(--ink)';
    card.animate([{ opacity: 0, transform: 'translateY(10px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
  };
  const run = async () => {
    const l = lines[i++ % lines.length];
    if (reduce) { out.textContent = l.say; show(l); return setTimeout(run, 3200); }
    card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'both' });
    out.textContent = '';
    for (const ch of l.say) { out.textContent += ch; await new Promise((r) => setTimeout(r, 55 + Math.random() * 50)); }
    await new Promise((r) => setTimeout(r, 380));
    show(l);
    setTimeout(run, 2600);
  };
  const start = new IntersectionObserver((es) => { if (es[0].isIntersecting) { start.disconnect(); run(); } });
  start.observe(demo);
}

// Legal pages: highlight the section you are reading
const toc = document.querySelectorAll('.toc a');
if (toc.length && 'IntersectionObserver' in window) {
  const map = new Map([...toc].map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { toc.forEach((a) => a.classList.remove('on')); map.get(e.target.id)?.classList.add('on'); } });
  }, { rootMargin: '-20% 0px -70% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
}
