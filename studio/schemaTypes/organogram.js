import {defineType, defineField} from 'sanity'

const API_VERSION = '2026-01-01'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})

export default defineType({
  name: 'organogram',
  title: 'Corporate Organogram',
  type: 'document',
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
      description: 'The newest published organogram by this date is the one shown on the website.',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
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
  ],
  preview: {
    select: {title: 'title', date: 'effectiveDate', note: 'versionNote'},
    prepare: ({title, date, note}) => ({
      title,
      subtitle: [date && formatDate(date), note].filter(Boolean).join(' · '),
    }),
  },
})