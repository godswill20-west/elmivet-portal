import type {OrganogramSummary} from './types'

/**
 * Preview content for the organogram, which stays on sample data until the organogram step
 * connects it to Sanity. Articles are live and no longer use sample content.
 */
export const SAMPLE_ORGANOGRAM: OrganogramSummary = {
  title: 'Corporate Structure & Governance',
  version: 4,
  effectiveLabel: '14 Nov 2026',
  sizeLabel: '1.8 MB',
  uploadedBy: 'Administrator',
  previous: [
    {version: 3, effectiveLabel: '02 Aug 2026'},
    {version: 2, effectiveLabel: '11 Mar 2026'},
    {version: 1, effectiveLabel: '05 Dec 2025'},
  ],
}
