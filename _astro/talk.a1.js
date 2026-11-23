// "Let's talk" opens a small chooser with WhatsApp and email.
const WHATSAPP_URL = "https://wa.me/918310054529";
const FALLBACK_EMAIL_URL = "mailto:a2sea.in@gmail.com";
const TRIGGERS = "#header-right-talk-btn, #header-menu-talk";
const ARROW =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.515 12h16.97m0 0L13.01 4.525M20.485 12l-7.475 7.476"></path></svg>';

const style = document.createElement("style");
style.textContent = `
#talk-options{position:fixed;z-index:60;display:flex;flex-direction:column;min-width:15em;padding:.5em .3125em;background:var(--color-white,#fff);color:var(--color-black,#000);border-radius:.625em;font-size:clamp(.875rem,1vw,1.5rem);line-height:1;text-transform:uppercase;box-shadow:0 .5em 2em rgba(0,0,0,.12);opacity:0;transform:translate3d(0,-.5em,0);pointer-events:none;transition:opacity .2s,transform .3s cubic-bezier(.4,0,.1,1)}
#talk-options.--opened{opacity:1;transform:none;pointer-events:auto}
#talk-options a{display:flex;align-items:center;justify-content:space-between;gap:2em;padding:1em 1.3em;border-radius:6.25em;color:inherit;text-decoration:none;transition:background-color .3s}
#talk-options a:hover,#talk-options a:focus-visible{background:rgba(0,22,236,.1);outline:none}
#talk-options svg{width:1.2em;height:1.2em;flex:none}
@media (prefers-reduced-motion:reduce){#talk-options{transition:none}}
`;
document.head.appendChild(style);

let panel = null;
let activeTrigger = null;

function emailUrl(trigger) {
  const link = trigger.querySelector('a[href^="mailto:"]');
  return link ? link.getAttribute("href") : FALLBACK_EMAIL_URL;
}

function buildPanel() {
  panel = document.createElement("div");
  panel.id = "talk-options";
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", "Contact options");
  panel.innerHTML =
    `<a role="menuitem" data-talk="whatsapp" href="${WHATSAPP_URL}" target="_blank" rel="noopener"><span>WhatsApp</span>${ARROW}</a>` +
    `<a role="menuitem" data-talk="email" href="${FALLBACK_EMAIL_URL}"><span>Email</span>${ARROW}</a>`;
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });
  document.body.appendChild(panel);
}

function place(trigger) {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const height = panel.offsetHeight;
  const below = rect.bottom + gap;
  const top = below + height > window.innerHeight - gap ? Math.max(gap, rect.top - gap - height) : below;
  const right = Math.max(gap, window.innerWidth - rect.right);
  panel.style.top = `${Math.round(top)}px`;
  panel.style.right = `${Math.round(right)}px`;
}

function open(trigger) {
  if (!panel) buildPanel();
  panel.querySelector('[data-talk="email"]').setAttribute("href", emailUrl(trigger));
  activeTrigger = trigger;
  place(trigger);
  panel.classList.add("--opened");
  trigger.setAttribute("aria-expanded", "true");
}

function close() {
  if (!panel || !activeTrigger) return;
  panel.classList.remove("--opened");
  activeTrigger.setAttribute("aria-expanded", "false");
  activeTrigger = null;
}

document.addEventListener(
  "click",
  (event) => {
    const trigger = event.target.closest(TRIGGERS);
    if (trigger) {
      // The button wraps a mailto link; keep the click from following it.
      event.preventDefault();
      if (activeTrigger === trigger) close();
      else open(trigger);
      return;
    }
    if (!event.target.closest("#talk-options")) close();
  },
  true
);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") close();
});
window.addEventListener("wheel", close, { passive: true });
window.addEventListener("touchmove", close, { passive: true });
window.addEventListener("resize", close);
window.addEventListener("popstate", close);

for (const trigger of document.querySelectorAll(TRIGGERS)) {
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
}
