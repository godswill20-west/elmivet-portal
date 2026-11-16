import {base} from './base'
import {content} from './content'
import {dashboard} from './dashboard'
import {live} from './live'
import {overlays} from './overlays'
import {responsive} from './responsive'
import {tokens} from './tokens'

/** The complete Content Center stylesheet. Order matters: responsive rules come last. */
export const css = [tokens, base, dashboard, content, live, overlays, responsive].join('\n')