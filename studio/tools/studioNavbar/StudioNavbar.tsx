import {useCurrentUser, useWorkspace} from 'sanity'
import type {NavbarProps} from 'sanity'

/**
 * Minimal Studio navbar: the workspace identity on the left, the signed-in user and a Sign out
 * button on the right. Search, the tool switcher, and the profile menu are intentionally absent.
 * It does not call `renderDefault`, so none of the default navbar is rendered.
 */
const NAVBAR_CSS = `
.ecc-nav{display:flex;align-items:center;justify-content:space-between;gap:16px;height:52px;padding:0 20px;background:#0A2540;border-bottom:1px solid rgba(255,255,255,.08);color:#FAF7F0;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif}
.ecc-nav-workspace{display:flex;align-items:center;gap:12px;min-width:0}
.ecc-nav-icon{display:flex;align-items:center;flex:none}
.ecc-nav-titles{display:flex;flex-direction:column;min-width:0;line-height:1.2}
.ecc-nav-title{font-size:14px;font-weight:600;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ecc-nav-subtitle{font-size:11.5px;color:#C9D6E6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ecc-nav-account{display:flex;align-items:center;gap:14px;flex:none}
.ecc-nav-user{font-size:13px;color:#C9D6E6;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}
.ecc-nav-signout{appearance:none;cursor:pointer;padding:7px 14px;border:1px solid rgba(255,255,255,.28);border-radius:8px;background:transparent;color:#FAF7F0;font:500 13px Inter,system-ui,sans-serif;transition:background .15s ease,border-color .15s ease}
.ecc-nav-signout:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.5)}
.ecc-nav-signout:focus-visible{outline:2px solid #FAF7F0;outline-offset:2px}
@media (max-width:640px){.ecc-nav{padding:0 12px}.ecc-nav-user,.ecc-nav-subtitle{display:none}}
`

export function StudioNavbar(_props: NavbarProps) {
  const workspace = useWorkspace()
  const currentUser = useCurrentUser()
  const logout = workspace.auth.logout

  return (
    <>
      <style>{NAVBAR_CSS}</style>
      <header className="ecc-nav">
        <div className="ecc-nav-workspace">
          <span className="ecc-nav-icon">{workspace.icon}</span>
          <span className="ecc-nav-titles">
            <span className="ecc-nav-title">{workspace.title}</span>
            {workspace.subtitle ? (
              <span className="ecc-nav-subtitle">{workspace.subtitle}</span>
            ) : null}
          </span>
        </div>

        <div className="ecc-nav-account">
          {currentUser?.name ? <span className="ecc-nav-user">{currentUser.name}</span> : null}
          {logout ? (
            <button type="button" className="ecc-nav-signout" onClick={() => void logout()}>
              Sign out
            </button>
          ) : null}
        </div>
      </header>
    </>
  )
}
