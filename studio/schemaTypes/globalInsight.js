import {defineType, defineField} from 'sanity'
import {ARTICLE_CATEGORIES} from './articleCategories'

export default defineType({
  name: 'globalInsight',
  title: 'Global Insights & Dispatches',
  type: 'document',
  groups: [
    {name: 'content', title: 'Article Content', default: true},
    {name: 'media', title: 'Media & Category'},
    {name: 'meta', title: 'Publishing & SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Dispatch Headline',
      description: 'The main editorial title shown on the website (e.g., "Our Elmivet MV Carrier").',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required().max(110),
    }),
    defineField({
      name: 'excerpt',
      title: 'Executive Summary',
      description: 'A crisp 2–3 sentence summary displayed on article preview cards.',
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (Rule) => Rule.required().max(260),
    }),
    defineField({
      name: 'body',
      title: 'Full Dispatch Body',
      description:
        'Write or paste the full corporate announcement here. Use headings and bold text for readability.',
      type: 'array',
      group: 'content',
      of: [
        {type: 'block'},
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {
              name: 'caption',
              type: 'string',
              title: 'Image Caption',
            },
          ],
        },
      ],
      validation: (Rule) =>
        Rule.required()
          .min(2)
          .error('The dispatch body cannot be empty. Please write the full article before publishing.')
          .custom((blocks) => {
            if (!Array.isArray(blocks)) return true // handled by required()

            const textLength = blocks
              .filter((block) => block._type === 'block')
              .flatMap((block) => block.children || [])
              .map((child) => child.text || '')
              .join('')
              .trim().length

            if (textLength < 200) {
              return `The dispatch body is too short (${textLength} characters). Please write at least 200 characters of article text before publishing.`
            }
            return true
          }),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Photography',
      description:
        'High-resolution landscape photo (16:9 recommended). Use the hotspot circle to center the subject.',
      type: 'image',
      group: 'media',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          description:
            'Briefly describe the image for screen readers and search engines (e.g., "Elmivet container vessel docked at Tin Can Island Port").',
          validation: (Rule) =>
            Rule.custom((alt, context) => {
              const hasImage = context.parent?.asset
              if (hasImage && !alt) {
                return 'Alt text is required when a cover image is uploaded (accessibility & SEO).'
              }
              return true
            }),
        }),
      ],
      validation: (Rule) =>
        Rule.required().error(
          'A cover image is required. Please upload a high-resolution 16:9 landscape image (minimum 1600×900px) before publishing.',
        ),
    }),
    defineField({
      name: 'category',
      title: 'Editorial Category',
      type: 'string',
      group: 'media',
      options: {
        list: ARTICLE_CATEGORIES.map((value) => ({title: value, value})),
        layout: 'radio',
      },
      validation: (Rule) => Rule.required().error('Please choose a category.'),
    }),
    defineField({
      name: 'tag',
      title: 'Card Label',
      description:
        'Short label shown on the article image (e.g. "Customs & Compliance"). If left empty, the category is shown instead.',
      type: 'string',
      group: 'media',
      validation: (Rule) => Rule.max(40),
    }),
    defineField({
      name: 'isFeatured',
      title: 'Feature on Homepage / Top of Insights',
      description: 'Toggle ON to pin this dispatch as the lead story.',
      type: 'boolean',
      group: 'meta',
      initialValue: false,
    }),
    defineField({
      name: 'readTime',
      title: 'Estimated Read Time (Minutes)',
      description: 'Approximate time in minutes to read the full dispatch (e.g., 3).',
      type: 'number',
      group: 'meta',
      initialValue: 3,
      validation: (Rule) => Rule.min(1).max(60).integer(),
    }),
    defineField({
      name: 'author',
      title: 'Byline',
      type: 'string',
      group: 'meta',
      initialValue: 'Elmivet Editorial Desk',
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publication Date & Time',
      type: 'datetime',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL Web Link (Slug)',
      description: 'Click "Generate" to automatically create a clean web address from the headline.',
      type: 'slug',
      group: 'meta',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      isFeatured: 'isFeatured',
      media: 'coverImage',
    },
    prepare({title, category, isFeatured, media}) {
      const subtitle = [category, isFeatured ? '★ Lead Story' : ''].filter(Boolean).join(' • ')
      return {
        title: title || 'Untitled Dispatch',
        subtitle,
        media,
      }
    },
  },
})