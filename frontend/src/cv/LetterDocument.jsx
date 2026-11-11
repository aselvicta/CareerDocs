import { ContactList, Photo } from './CVDocument'
import { docClass, docStyle } from './docStyle'
import { formatLetterDate, letterParts } from './letterText'
import { resolveDesign } from './templates'

/**
 * A cover letter (or any letter) in the same visual system as the CV templates:
 * the header, colours and fonts match the CV template with the same id.
 */
export function LetterDocument({ letter, template, design, date, className = '' }) {
  const d = resolveDesign(template ?? letter?.template, design ?? letter?.design)
  const t = d.template
  const m = {
    name: (letter.sender_name || '').trim(),
    headline: (letter.sender_headline || '').trim(),
    photo: '',
    contact: {
      email: (letter.sender_email || '').trim(),
      phone: (letter.sender_phone || '').trim(),
      location: (letter.sender_location || '').trim(),
      links: [],
    },
  }
  const { paragraphs, greeting, closing } = letterParts(letter)
  const contactInAside = t.aside && t.header !== 'banner'
  const showMonogram = t.photo && (t.aside || t.header === 'banner') && d.showPhoto

  const nameBlock = (
    <div className="cvd-namebox">
      <h1 className="cvd-name">{m.name || 'Your Name'}</h1>
      {m.headline && <div className="cvd-headline">{m.headline}</div>}
    </div>
  )
  const header = (
    <header className="cvd-header">
      {t.header === 'banner' && showMonogram && <Photo m={m} />}
      {t.header !== 'aside' && nameBlock}
      {!contactInAside && <ContactList contact={m.contact} inline icons={t.header === 'banner'} />}
    </header>
  )

  const letterBody = (
    <div className="cvd-letter">
      <div className="cvd-letter__date">{formatLetterDate(date)}</div>
      {(letter.recipient_name || letter.recipient_title || letter.company) && (
        <div className="cvd-letter__to">
          {letter.recipient_name && <div>{letter.recipient_name}</div>}
          {letter.recipient_title && <div>{letter.recipient_title}</div>}
          {letter.company && <div>{letter.company}</div>}
        </div>
      )}
      <div className="cvd-letter__body">
        {greeting && <p>{greeting}</p>}
        {paragraphs.length ? paragraphs.map((p, i) => <p key={i} style={{ whiteSpace: 'pre-line' }}>{p}</p>)
          : <p className="cvd-letter__placeholder">Your letter will appear here as you write.</p>}
      </div>
      {closing && (
        <div className="cvd-letter__sign">
          {closing}
          <strong>{m.name || 'Your Name'}</strong>
        </div>
      )}
    </div>
  )

  return (
    <article className={`${docClass(d, 'letter')} ${className}`} style={docStyle(d)}>
      {(!t.aside || t.header === 'banner') && header}
      {t.aside ? (
        <div className="cvd-body">
          {t.aside === 'left' && (
            <aside className="cvd-aside">
              {showMonogram && t.header !== 'banner' && <Photo m={m} />}
              {t.header === 'aside' && nameBlock}
              {contactInAside && (
                <section className="cvd-sec cvd-sec--contact">
                  <h2 className="cvd-h"><span>Contact</span></h2>
                  <div className="cvd-sec__body"><ContactList contact={m.contact} icons /></div>
                </section>
              )}
            </aside>
          )}
          <main className="cvd-main">
            {t.header !== 'banner' && t.header !== 'aside' && header}
            {letterBody}
          </main>
          {t.aside === 'right' && (
            <aside className="cvd-aside">
              {contactInAside && (
                <section className="cvd-sec cvd-sec--contact">
                  <h2 className="cvd-h"><span>Contact</span></h2>
                  <div className="cvd-sec__body"><ContactList contact={m.contact} icons /></div>
                </section>
              )}
            </aside>
          )}
        </div>
      ) : <main className="cvd-main cvd-main--letter">{letterBody}</main>}
    </article>
  )
}
