/**
 * Native <dialog> overlays: dimmed scrim, right-hand drawer, modal panel and toasts. Transitions are driven by data-state.
 */
export const overlays = `
/* The <dialog> is a transparent full-viewport layer in the browser's top layer. It supplies the focus trap, inert background and Escape. */
.ecc-dialog { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; overflow: hidden; }
.ecc-dialog::backdrop { background: transparent; }
.ecc-dialog--drawer[open] { display: block; }
.ecc-dialog--modal[open] { display: grid; place-items: center; padding: 28px; }

.ecc-scrim { position: absolute; inset: 0; background: rgba(10,37,64,.55); opacity: 0; transition: opacity .35s var(--ecc-ease); }
.ecc-dialog--modal .ecc-scrim { background: rgba(10,37,64,.65); }
.ecc-dialog[data-state=open] .ecc-scrim { opacity: 1; }

.ecc-drawer { position: absolute; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; width: min(540px, 100%); background: var(--ecc-ivory); box-shadow: -24px 0 60px rgba(10,37,64,.25); transform: translateX(104%); transition: transform .45s var(--ecc-ease); }
.ecc-dialog[data-state=open] .ecc-drawer { transform: none; }
.ecc-drawer-body { flex: 1 1 auto; overscroll-behavior: contain; }
.ecc-drawer-foot { margin-top: auto; }

.ecc-modal { position: relative; display: flex; flex-direction: column; width: min(1000px, 100%); max-height: 100%; background: var(--ecc-ivory); border-radius: 22px; box-shadow: 0 40px 100px rgba(10,37,64,.4); overflow: hidden; opacity: 0; transform: translateY(24px) scale(.97); transition: opacity .3s var(--ecc-ease), transform .45s var(--ecc-ease); }
.ecc-modal--narrow { width: min(560px, 100%); }
.ecc-dialog[data-state=open] .ecc-modal { opacity: 1; transform: none; }
.ecc-modal-body { overscroll-behavior: contain; }
.ecc-modal-col--scroll { overflow-y: auto; }

.ecc-toasts { position: absolute; left: 50%; bottom: 26px; z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 8px; width: max-content; max-width: 92%; transform: translateX(-50%); pointer-events: none; }
.ecc-toast { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-radius: 12px; background: var(--ecc-navy); color: #fff; font-size: 13px; box-shadow: 0 16px 40px rgba(10,37,64,.3); pointer-events: auto; animation: eccToastIn .4s var(--ecc-ease); transition: opacity .3s ease, transform .3s var(--ecc-ease); }
.ecc-toast.is-leaving { opacity: 0; transform: translateY(10px); }
.ecc-toast--success::before, .ecc-toast--error::before { content: ""; width: 8px; height: 8px; border-radius: 50%; flex: none; }
.ecc-toast--success::before { background: #6FD3A4; }
.ecc-toast--error { background: #fff; color: var(--ecc-ink); border: 1px solid #F0C9CC; box-shadow: 0 16px 40px rgba(200,30,40,.14); }
.ecc-toast--error::before { background: var(--ecc-red); }
.ecc-toast-close { padding: 0 2px; border: 0; background: none; font-size: 18px; line-height: 1; opacity: .6; }
.ecc-toast-close:hover { opacity: 1; }
@keyframes eccToastIn { from { opacity: 0; transform: translateY(18px); } }
`