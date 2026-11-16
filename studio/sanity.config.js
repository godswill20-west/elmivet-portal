import {createElement} from 'react'
import {buildLegacyTheme, defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {ArchiveIcon} from '@sanity/icons/Archive'

import {schemaTypes} from './schemaTypes'
import {contentCenterTool} from './tools/contentCenter'
import {StudioNavbar} from './tools/studioNavbar/StudioNavbar'
import elmivetLogoUrl from './static/logo.svg'

/* -------------------------------------------------------------------------- */
/*  Brand theme: Deep Maritime Navy + slate neutrals                          */
/* -------------------------------------------------------------------------- */
const elmivetTheme = buildLegacyTheme({
  // Base palette
  '--black': '#0F172A',
  '--white': '#FFFFFF',
  '--gray': '#64748B',
  '--gray-base': '#64748B',

  // Surfaces & text
  '--component-bg': '#FFFFFF',
  '--component-text-color': '#0F172A',

  // Brand
  '--brand-primary': '#0A192F',
  '--focus-color': '#0A192F',

  // Buttons (publish is the "success" button in Sanity's UI)
  '--default-button-color': '#64748B',
  '--default-button-primary-color': '#0A192F',
  '--default-button-success-color': '#0A192F',
  '--default-button-warning-color': '#B45309',
  '--default-button-danger-color': '#B91C1C',

  // Top navigation bar
  '--main-navigation-color': '#0A192F',
  '--main-navigation-color--inverted': '#F8FAFC',

  // State colors (kept semantic so validation messages stay readable)
  '--state-info-color': '#2C5A8C',
  '--state-success-color': '#047857',
  '--state-warning-color': '#B45309',
  '--state-danger-color': '#B91C1C',
})

/* -------------------------------------------------------------------------- */
/*  Studio icon: the Elmivet logo from ./static/logo.svg                      */
/* -------------------------------------------------------------------------- */
const ElmivetIcon = () =>
  createElement('img', {
    src: elmivetLogoUrl,
    alt: '',
    width: 25,
    height: 25,
    style: {display: 'block'},
  })

/* -------------------------------------------------------------------------- */
/*  Administrator check (Vision tool filter + organogram delete guard)        */
/* -------------------------------------------------------------------------- */
const isAdministrator = (currentUser) =>
  Boolean(currentUser?.roles?.some((role) => role.name === 'administrator'))

/* -------------------------------------------------------------------------- */
/*  Desk structure: dispatches and organogram versions                        */
/* -------------------------------------------------------------------------- */
const deskStructure = (S) =>
  S.list()
    .id('root')
    .title('Elmivet Content')
    .items([
      S.listItem()
        .id('globalInsight')
        .title('Global Insights & Dispatches')
        .icon(DocumentsIcon)
        .child(
          S.documentTypeList('globalInsight')
            .title('Global Insights & Dispatches')
            .defaultOrdering([{field: 'publishedAt', direction: 'desc'}]),
        ),

      S.divider(),

      S.listItem()
        .id('organogram')
        .title('Corporate Organogram (Versions)')
        .icon(ArchiveIcon)
        .child(
          S.documentTypeList('organogram')
            .title('Corporate Organogram (Versions)')
            .defaultOrdering([
              {field: 'effectiveDate', direction: 'desc'},
              {field: '_createdAt', direction: 'desc'},
            ]),
        ),
    ])

/* -------------------------------------------------------------------------- */
/*  Studio config                                                             */
/* -------------------------------------------------------------------------- */
export default defineConfig({
  name: 'default',
  title: 'Elmivet International',
  subtitle: 'Corporate Content & Dispatch Portal',

  projectId: 'mu98kehm',
  dataset: 'production',

  icon: ElmivetIcon,
  theme: elmivetTheme,

  // Content Center is FIRST, so it is the first tool and becomes the landing page
  plugins: [
    contentCenterTool(),
    structureTool({
      name: 'structure',
      title: 'Editorial & Settings',
      structure: deskStructure,
    }),
    visionTool(),
  ],

  // Only administrators can see the Vision tool
  tools: (prev, context) =>
    isAdministrator(context.currentUser) ? prev : prev.filter((tool) => tool.name !== 'vision'),

  schema: {
    types: schemaTypes,
  },

  document: {
    // Organogram versions are governance history. This only hides Delete in the Studio for
    // non-administrators. It is a convenience, not a security boundary: anyone with write
    // access (including an API token) can still delete these documents.
    actions: (prev, {schemaType, currentUser}) =>
      schemaType === 'organogram' && !isAdministrator(currentUser)
        ? prev.filter(({action}) => action !== 'delete')
        : prev,
  },

  // Minimal navbar: workspace identity and Sign out only (see tools/studioNavbar)
  studio: {
    components: {
      navbar: StudioNavbar,
    },
  },
})