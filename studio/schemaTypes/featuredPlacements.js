import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Single document (id: "featuredPlacements") holding the two INDEPENDENT featured placements.
 * It is managed from the Content Center, not from the desk structure, so it is not listed there.
 * References are weak on purpose: unpublishing or deleting an article never changes or blocks
 * this document, and the public queries simply skip a reference whose article is not published.
 */
export default defineType({
  name: 'featuredPlacements',
  title: 'Featured Placements',
  type: 'document',
  fields: [
    defineField({
      name: 'homepage',
      title: 'Homepage Featured Stories',
      description: 'Managed in the Content Center. Several articles can be selected.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'globalInsight'}],
          weak: true,
        }),
      ],
    }),
    defineField({
      name: 'insightPage',
      title: 'GlobalInsight Page Featured Article',
      description: 'Managed in the Content Center. Exactly one article, or empty.',
      type: 'reference',
      to: [{type: 'globalInsight'}],
      weak: true,
    }),
  ],
  preview: {prepare: () => ({title: 'Featured Placements'})},
})
