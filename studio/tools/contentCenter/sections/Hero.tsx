import {Button} from '../components/Button'
import {stagger} from '../lib/style'

interface HeroProps {
  onCreateArticle: () => void
  onUploadOrganogram: () => void
}

export function Hero({onCreateArticle, onUploadOrganogram}: HeroProps) {
  return (
    <header className="ecc-hero">
      <div className="ecc-wrap">
        <div className="ecc-brand ecc-rise">
          <b aria-hidden="true">E</b>
          Elmivet International
          <span className="ecc-preview-chip">Organogram preview</span>
        </div>
        <div className="ecc-hero-row ecc-rise" style={stagger(1)}>
          <div>
            <h1>
              Content <em>Center</em>
            </h1>
            <p>
              Publish news, announcements and governance documents to the Elmivet website, all in
              one place.
            </p>
          </div>
          <div className="ecc-actions">
            <Button variant="glass" icon="upload" onClick={onUploadOrganogram}>
              Upload Organogram
            </Button>
            <Button variant="light" icon="plus" onClick={onCreateArticle}>
              Create Article
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}