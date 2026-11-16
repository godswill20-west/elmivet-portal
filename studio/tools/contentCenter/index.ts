import {definePlugin} from 'sanity'
import {route} from 'sanity/router'

import {ContentCenterIcon} from './components/ContentCenterIcon'
import {ContentCenterTool} from './ContentCenterTool'
import {TOOL_NAME, TOOL_TITLE} from './lib/tool'

/**
 * Content Center: the custom editorial workspace for the Elmivet website content.
 * Registered as a plugin (like the Command Center overview) so it can be ordered in the Studio config.
 */
export const contentCenterTool = definePlugin({
  name: 'elmivet-content-center',
  tools: [
    {
      name: TOOL_NAME,
      title: TOOL_TITLE,
      icon: ContentCenterIcon,
      component: ContentCenterTool,
      // A single page: overlays open in place, so the tool has no sub-routes.
      router: route.create('/'),
    },
  ],
})