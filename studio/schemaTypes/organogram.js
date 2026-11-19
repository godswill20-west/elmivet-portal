import {defineType, defineField} from 'sanity'
import {
  ORGANOGRAM_STATUS,
  ORGANOGRAM_STATUS_OPTIONS,
  ORGANOGRAM_TYPE,
  publishedId,
} from './organogramVersioning'

const API_VERSION = '2026-01-01'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})

export default defineType({
  name: ORGANOGRAM_TYPE,
  title: 'Corporate Organogram',
  type: 'document',
  fieldsets: [{name: 'versioning', title: 'Version & status', options: {collapsible: false}}],
  fields: [
    defineField({
      name: 'title',
      title: 'Document Title',
      type: 'string',
      initialValue: 'Elmivet Corporate Structure & Governance Organogram',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'file',
      title: 'Organogram (PDF)',
      description: 'PDF only. Each upload becomes a new version; previous versions are kept.',
      type: 'file',
      // File-picker hint only. It does not stop drag-and-drop, so the MIME check below is the real guard.
      options: {accept: '.pdf,application/pdf'},
      validation: (Rule) =>
        Rule.required().custom(async (file, context) => {
          const ref = file?.asset?._ref
          if (!ref) return true // handled by required()
          const mimeType = await context
            .getClient({apiVersion: API_VERSION})
            .fetch('*[_id == $ref][0].mimeType', {ref})
          return mimeType === 'application/pdf' || 'Only PDF files are accepted.'
        }),
    }),
    defineField({
      name: 'effectiveDate',
      title: 'Effective Date',
      description: 'The date this structure takes effect. Which version is live is controlled by Status, not by this date.',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'versionLabel',
      title: 'Version Label',
      description: 'Optional display label, e.g. "Version 3 - November 2026".',
      type: 'string',
      fieldset: 'versioning',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'versionNumber',
      title: 'Version Number',
      description: 'Whole number that orders versions. Must be unique. Higher means newer.',
      type: 'number',
      fieldset: 'versioning',
      validation: (Rule) =>
        Rule.required()
          .integer()
          .min(1)
          .custom(async (value, context) => {
            if (typeof value !== 'number') return true
            const id = publishedId(context.document?._id)
            const clash = await context
              .getClient({apiVersion: API_VERSION})
              .fetch(
                'count(*[_type == $type && !(_id in path("drafts.**")) && _id != $id && versionNumber == $value])',
                {type: ORGANOGRAM_TYPE, id, value},
              )
            return clash === 0 || `Version ${value} already exists. Use a different number.`
          }),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      description:
        'Exactly one published version is "Current". Publishing a new version archives the previous one; nothing is deleted.',
      type: 'string',
      fieldset: 'versioning',
      options: {list: ORGANOGRAM_STATUS_OPTIONS, layout: 'radio'},
      // Archived is the safe default: a new record can never silently displace the live one.
      initialValue: ORGANOGRAM_STATUS.archived,
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          if (value !== ORGANOGRAM_STATUS.current) return true
          const id = publishedId(context.document?._id)
          const others = await context
            .getClient({apiVersion: API_VERSION})
            .fetch(
              '*[_type == $type && !(_id in path("drafts.**")) && _id != $id && status == "current"]{title, versionNumber}',
              {type: ORGANOGRAM_TYPE, id},
            )
          if (!others.length) return true
          const names = others
            .map((o) => o.title + (o.versionNumber ? ` (v${o.versionNumber})` : ''))
            .join(', ')
          return `Another version is already Current: ${names}. Archive it first.`
        }),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Upload / Publication Date',
      description: 'When this version was uploaded or published.',
      type: 'datetime',
      fieldset: 'versioning',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'archivedAt',
      title: 'Archived On',
      description: 'Set automatically when a version is archived.',
      type: 'datetime',
      fieldset: 'versioning',
      readOnly: true,
    }),
    defineField({
      name: 'versionNote',
      title: 'Internal Version Note',
      description: 'What changed in this version. Never shown publicly.',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.max(300),
    }),
  ],
  orderings: [
    {
      title: 'Effective date, newest first',
      name: 'effectiveDateDesc',
      by: [{field: 'effectiveDate', direction: 'desc'}],
    },
    {
      title: 'Version number, newest first',
      name: 'versionNumberDesc',
      by: [
        {field: 'versionNumber', direction: 'desc'},
        {field: 'effectiveDate', direction: 'desc'},
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      date: 'effectiveDate',
      note: 'versionNote',
      version: 'versionNumber',
      label: 'versionLabel',
      status: 'status',
    },
    prepare: ({title, date, note, version, label, status}) => ({
      title,
      subtitle: [
        status === ORGANOGRAM_STATUS.current ? 'CURRENT' : status === ORGANOGRAM_STATUS.archived ? 'Archived' : 'Legacy',
        label || (version ? `v${version}` : null),
        date && formatDate(date),
        note,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})