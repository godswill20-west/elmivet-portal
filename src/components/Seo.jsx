
import { getCanonicalUrl } from '../lib/seo';

export default function Seo({ title, description, path = '/' }) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={getCanonicalUrl(path)} />
    </>
  );
}
