const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

// Fine engineering grid, moving flow traces, and a cursor-following glow.
function setupAmbientBackground() {
  const flow = $('#flow'), grid = $('#grid');
  if (!flow || !grid) return;
  const ctx = flow.getContext('2d'), gx = grid.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0, dpr = 1, points = [], mobile = false, raf = 0, paused = false;
  const pointer = { x: innerWidth * .5, y: innerHeight * .42, tx: innerWidth * .5, ty: innerHeight * .42 };
  function resize() {
    width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, 1.6); mobile = matchMedia('(max-width:640px)').matches;
    for (const canvas of [flow, grid]) { canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.width = width + 'px'; canvas.style.height = height + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); gx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points = Array.from({ length: mobile ? 260 : 680 }, () => ({ x: Math.random() * width, y: Math.random() * height, s: .25 + Math.random() * .7, len: 7 + Math.random() * 23, phase: Math.random() * 6.28 }));
    drawGrid(); if (reduce) drawFlow();
  }
  function drawGrid() {
    gx.clearRect(0, 0, width, height);
    const step = mobile ? 58 : 76;
    gx.lineWidth = .6;
    gx.strokeStyle = 'rgba(157,169,192,.045)';
    for (let x = 0; x < width; x += step) { gx.beginPath(); gx.moveTo(x, 0); gx.lineTo(x, height); gx.stroke(); }
    for (let y = 0; y < height; y += step) { gx.beginPath(); gx.moveTo(0, y); gx.lineTo(width, y); gx.stroke(); }
  }
  function drawFlow() {
    ctx.clearRect(0, 0, width, height); const reach = mobile ? 110 : 155;
    for (const p of points) {
      const dx = p.x - pointer.x, dy = p.y - pointer.y, r = Math.hypot(dx, dy) || 1, f = Math.max(0, 1 - r / reach), bend = f * f * (mobile ? 22 : 34), vx = .22 + p.s * .5 + f * .55, vy = Math.sin(p.x * .003 + p.phase) * .08 - (dy / r) * bend * .035;
      ctx.lineWidth = .65; ctx.strokeStyle = `rgba(137,160,220,${Math.min(.18, .035 + vx * .045 + f * .055)})`; ctx.beginPath();
      ctx.moveTo(p.x + (dy / r) * bend * .18, p.y - (dx / r) * bend * .18); ctx.lineTo(p.x + p.len * vx + (dy / r) * bend, p.y + p.len * vy - (dx / r) * bend); ctx.stroke(); p.x += vx; p.y += vy;
      if (p.x > width + 30) { p.x = -25; p.y = Math.random() * height; } if (p.y < -25) p.y = height + 10; if (p.y > height + 25) p.y = -10;
    }
  }
  function frame() { raf = 0; if (paused) return; pointer.x += (pointer.tx - pointer.x) * .13; pointer.y += (pointer.ty - pointer.y) * .13; drawFlow(); drawGrid(); raf = requestAnimationFrame(frame); }
  function start() { if (!reduce && !paused && !raf) raf = requestAnimationFrame(frame); }
  function move(event) { pointer.tx = event.clientX; pointer.ty = event.clientY; document.documentElement.style.setProperty('--mx', event.clientX + 'px'); document.documentElement.style.setProperty('--my', event.clientY + 'px'); if (reduce) drawGrid(); }
  resize(); start(); addEventListener('resize', resize); addEventListener('pointermove', move, { passive: true });
  document.addEventListener('visibilitychange', () => { paused = document.hidden; if (paused && raf) { cancelAnimationFrame(raf); raf = 0; } else start(); });
}
setupAmbientBackground();

// Seamless horizontal selected-work gallery.
const projectTrack = $('.project-grid'), projectGroup = $('.project-group'), projectViewport = $('.project-viewport');
if (projectTrack && projectGroup && projectViewport) {
  const loop = projectGroup.cloneNode(true); loop.setAttribute('aria-hidden', 'true');
  all('.reveal', loop).forEach(el => { el.classList.remove('reveal'); el.classList.add('visible'); });
  all('a,button', loop).forEach(el => el.tabIndex = -1); projectTrack.append(loop);
  projectViewport.addEventListener('pointerdown', () => projectTrack.classList.add('paused'));
  window.addEventListener('pointerup', () => projectTrack.classList.remove('paused'));
  const nextProject = $('.project-next');
  if (nextProject) {
    let projectIndex = 0;
    nextProject.addEventListener('click', () => {
      const cards = all(':scope > .project-card', projectGroup);
      if (!cards.length) return;
      projectTrack.classList.add('manual-projects');
      projectViewport.classList.add('manual-projects');
      projectIndex = (projectIndex + 1) % cards.length;
      const step = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(projectGroup).gap || 0);
      projectViewport.scrollTo({ left: projectIndex * step, behavior: 'smooth' });
      nextProject.setAttribute('aria-label', `Move to project ${projectIndex + 1} of ${cards.length}`);
    });
  }
}

// Rounded pointer reveal through the textured project and certificate covers.
all('.project-media,.certificate').forEach(card => {
  const place = event => { const box = card.getBoundingClientRect(); card.style.setProperty('--pointer-x', `${event.clientX - box.left}px`); card.style.setProperty('--pointer-y', `${event.clientY - box.top}px`); };
  card.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { place(event); card.classList.add('pointer-reveal'); } });
  card.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') { place(event); card.classList.add('pointer-reveal'); } });
  card.addEventListener('pointerleave', () => card.classList.remove('pointer-reveal'));
});

// Staggered entrances for page sections.
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => entries.forEach((entry, index) => {
    if (entry.isIntersecting) { entry.target.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`; entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
  }), { threshold: .12 });
  all('.reveal').forEach(el => revealObserver.observe(el));
}

// Floating navigation follows the visible section.
const navLinks = all('.nav-item'), navTargets = ['home', 'work', 'experience', 'contact'].map(id => document.getElementById(id)).filter(Boolean);
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) navLinks.forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
  }), { rootMargin: '-35% 0px -55% 0px' });
  navTargets.forEach(section => sectionObserver.observe(section));
}

// Project case studies open inline from each card.
all('.project-media[href^="#project-"]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); const detail = $(link.getAttribute('href')); if (!detail) return;
  const opening = !detail.classList.contains('open'); all('.project-detail.open').forEach(item => item.classList.remove('open'));
  if (opening) { detail.classList.add('open'); detail.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}));
all('.detail-close').forEach(button => button.addEventListener('click', () => button.closest('.project-detail').classList.remove('open')));

// Experience cards move as a button-controlled, timed carousel.
const experienceTrack = $('.experience-track'), experienceCards = all('.experience-card'), dotsHost = $('.experience-dots'), experienceWindow = $('.experience-window');
if (experienceTrack && experienceCards.length && dotsHost && experienceWindow) {
  let slide = 0, carouselTimer, dots = [];
  const cardStep = () => experienceCards[0].getBoundingClientRect().width + 12;
  const maxSlide = () => Math.max(0, Math.ceil((experienceTrack.scrollWidth - experienceWindow.clientWidth) / cardStep()));
  function setSlide(next) { slide = Math.max(0, Math.min(next, maxSlide())); experienceTrack.style.transform = `translateX(${-slide * cardStep()}px)`; dots.forEach((dot, index) => dot.classList.toggle('active', index === slide)); }
  function buildDots() { const count = maxSlide() + 1; dotsHost.replaceChildren(); dots = Array.from({ length: count }, (_, index) => { const dot = document.createElement('button'); dot.className = 'dot'; dot.setAttribute('aria-label', `Page ${index + 1}`); dot.addEventListener('click', () => setSlide(index)); dotsHost.append(dot); return dot; }); setSlide(Math.min(slide, maxSlide())); }
  function startCarousel() { clearInterval(carouselTimer); carouselTimer = setInterval(() => setSlide(slide === maxSlide() ? 0 : slide + 1), 5200); }
  $('.slider-prev')?.addEventListener('click', () => setSlide(slide === 0 ? maxSlide() : slide - 1));
  $('.slider-next')?.addEventListener('click', () => setSlide(slide === maxSlide() ? 0 : slide + 1));
  experienceWindow.addEventListener('mouseenter', () => clearInterval(carouselTimer)); experienceWindow.addEventListener('mouseleave', startCarousel);
  document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(carouselTimer) : startCarousel());
  window.addEventListener('resize', buildDots); buildDots(); startCarousel();
}

// Contact form opens a prefilled email draft.
const contactForm = $('#contact-form');
if (contactForm) contactForm.addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`Portfolio inquiry: ${data.get('topic')}`);
  const body = encodeURIComponent(`Name: ${data.get('name')}\nEmail: ${data.get('email')}\nTopic: ${data.get('topic')}\n\n${data.get('message')}`);
  window.location.href = `mailto:sanoj092002@gmail.com?subject=${subject}&body=${body}`;
});

// Typing specialties and pointer parallax in the introduction.
(() => {
  const typed = $('#typedText'), hero = $('.hero'), photo = $('.hero-photo-top'), coords = $('#coords'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typed && !reduce) {
    const words = ['Aircraft systems', 'Aerodynamic design', 'Simulation-led validation', 'UAV / VTOL concepts']; let word = 0, position = typed.textContent.length, deleting = false;
    const tick = () => { const value = words[word]; typed.textContent = value.slice(0, position); if (!deleting && position >= value.length) { deleting = true; setTimeout(tick, 1450); return; } if (deleting && position <= 0) { deleting = false; word = (word + 1) % words.length; setTimeout(tick, 260); return; } position += deleting ? -1 : 1; setTimeout(tick, deleting ? 38 : 72); };
    setTimeout(tick, 900);
  }
  if (!hero || reduce) return;
  addEventListener('pointermove', event => {
    if (innerWidth <= 760) return;
    const bounds = hero.getBoundingClientRect(), dx = Math.max(-1, Math.min(1, (event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2))), dy = Math.max(-1, Math.min(1, (event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height / 2)));
    hero.style.setProperty('--hero-x', `${dx * 5}px`); hero.style.setProperty('--hero-y', `${dy * 4}px`);
    if (photo) { photo.style.setProperty('--visual-x', `${-dx * 11}px`); photo.style.setProperty('--visual-y', `${-dy * 8}px`); }
    if (coords) coords.textContent = `X ${dx >= 0 ? '+' : ''}${String(Math.round(dx * 100)).padStart(3, '0')} · Y ${dy >= 0 ? '+' : ''}${String(Math.round(dy * 100)).padStart(3, '0')}`;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { hero.style.setProperty('--hero-x', '0px'); hero.style.setProperty('--hero-y', '0px'); if (photo) { photo.style.setProperty('--visual-x', '0px'); photo.style.setProperty('--visual-y', '0px'); } });
})();
