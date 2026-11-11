import { Mail, Phone, MapPin, Link2 } from 'lucide-react'
import { ASIDE_SECTIONS, SECTION_LABEL, resolveDesign } from './templates'
import { docClass, docStyle } from './docStyle'
import { initials, prettyUrl, sectionHasContent, toModel } from './model'
import './cvdoc.css'

export function Photo({ m, className = '' }) {
  return (
    <div className={`cvd-photo ${className}`}>
      {m.photo ? <img src={m.photo} alt="" /> : <span>{initials(m.name) || 'CV'}</span>}
    </div>
  )
}

export function ContactList({ contact, icons = false, inline = false }) {
  const items = []
  if (contact.email) items.push({ key: 'email', Icon: Mail, text: contact.email, href: `mailto:${contact.email}` })
  if (contact.phone) items.push({ key: 'phone', Icon: Phone, text: contact.phone })
  if (contact.location) items.push({ key: 'loc', Icon: MapPin, text: contact.location })
  for (const [i, l] of (contact.links || []).entries()) {
    const href = /^https?:\/\//.test(l.url) ? l.url : `https://${l.url}`
    items.push({ key: `l${i}`, Icon: Link2, text: prettyUrl(l.url), href })
  }
  if (!items.length) return null
  return (
    <ul className={`cvd-contact ${inline ? 'cvd-contact--inline' : 'cvd-contact--stack'}`}>
      {items.map(item => {
        const ItemIcon = item.Icon
        const { key, text, href } = item
        return (
        <li key={key}>
          {icons && <ItemIcon className="cvd-contact__icon" size={11} strokeWidth={2} aria-hidden />}
          {href ? <a href={href}>{text}</a> : <span>{text}</span>}
        </li>
        )
      })}
    </ul>
  )
}

function Bullets({ items }) {
  if (!items?.length) return null
  if (items.length === 1) return <p className="cvd-entry__text">{items[0]}</p>
  return <ul className="cvd-bullets">{items.map((b, i) => <li key={i}>{b}</li>)}</ul>
}

function Entry({ e, datesLeft }) {
  const sub = [e.org, e.location].filter(Boolean)
  return (
    <div className="cvd-entry">
      {datesLeft && <div className="cvd-entry__aside">{e.dates}</div>}
      <div className="cvd-entry__main">
        <div className="cvd-entry__head">
          <span className="cvd-entry__title">{e.title || e.org}</span>
          {!datesLeft && e.dates && <span className="cvd-entry__dates">{e.dates}</span>}
        </div>
        {e.title && sub.length > 0 && (
          <div className="cvd-entry__sub">
            <span className="cvd-entry__org">{e.org}</span>
            {e.location && <span className="cvd-entry__loc">{e.location}</span>}
          </div>
        )}
        {e.tech && <div className="cvd-entry__sub"><span className="cvd-entry__org">{e.tech}</span></div>}
        <Bullets items={e.bullets} />
      </div>
    </div>
  )
}

function Skills({ skills, mode }) {
  if (mode === 'tags') {
    return (
      <div className="cvd-skills cvd-skills--tags">
        {skills.map((g, i) => (
          <div key={i} className="cvd-skillgroup">
            {g.category && <div className="cvd-skillgroup__label">{g.category}</div>}
            <div className="cvd-tags">{g.items.map((s, j) => <span key={j} className="cvd-tag">{s}</span>)}</div>
          </div>
        ))}
      </div>
    )
  }
  if (mode === 'list') {
    return (
      <div className="cvd-skills cvd-skills--list">
        {skills.map((g, i) => (
          <div key={i} className="cvd-skillgroup">
            {g.category && <div className="cvd-skillgroup__label">{g.category}</div>}
            <ul>{g.items.map((s, j) => <li key={j}>{s}</li>)}</ul>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="cvd-skills cvd-skills--inline">
      {skills.map((g, i) => (
        <p key={i}>
          {g.category && <strong>{g.category}: </strong>}
          {g.items.join(', ')}
        </p>
      ))}
    </div>
  )
}

function SectionBody({ k, m, t, place }) {
  const datesLeft = t.dates === 'left' && place === 'main'
  const asideMode = place === 'aside'
  switch (k) {
    case 'summary':
      return <p className="cvd-summary">{m.summary}</p>
    case 'experience':
    case 'education':
      if (m[`${k}Text`]) return <p className="cvd-pre">{m[`${k}Text`]}</p>
      return m[k].map((e, i) => <Entry key={i} e={e} datesLeft={datesLeft} />)
    case 'projects':
    case 'awards':
      return m[k].map((e, i) => <Entry key={i} e={e} datesLeft={datesLeft} />)
    case 'skills':
      return <Skills skills={m.skills} mode={asideMode ? (t.skills === 'inline' ? 'list' : t.skills) : t.skills} />
    case 'certifications':
      return (
        <div className="cvd-compact">
          {m.certifications.map((c, i) => (
            <div key={i} className="cvd-compact__row">
              <span className="cvd-compact__title">{c.title}</span>
              <span className="cvd-compact__meta">{[c.org, c.dates].filter(Boolean).join(', ')}</span>
            </div>
          ))}
        </div>
      )
    case 'languages':
      if (!asideMode && t.skills === 'inline') {
        return <p>{m.languages.map(l => (l.level ? `${l.name} (${l.level})` : l.name)).join(', ')}</p>
      }
      return (
        <div className="cvd-compact">
          {m.languages.map((l, i) => (
            <div key={i} className="cvd-compact__row cvd-compact__row--split">
              <span className="cvd-compact__title">{l.name}</span>
              {l.level && <span className="cvd-compact__meta">{l.level}</span>}
            </div>
          ))}
        </div>
      )
    case 'references':
      return (
        <div className="cvd-refs">
          {m.references.map((r, i) => (
            <div key={i} className="cvd-ref">
              <div className="cvd-ref__name">{r.name}</div>
              {r.role && <div className="cvd-ref__role">{r.role}</div>}
              {r.contact.map((c, j) => <div key={j} className="cvd-ref__contact">{c}</div>)}
            </div>
          ))}
        </div>
      )
    default:
      return null
  }
}

function Section({ k, m, t, place }) {
  return (
    <section className={`cvd-sec cvd-sec--${k}`}>
      <h2 className="cvd-h"><span>{SECTION_LABEL[k]}</span></h2>
      <div className="cvd-sec__body">
        <SectionBody k={k} m={m} t={t} place={place} />
      </div>
    </section>
  )
}

function NameBlock({ m }) {
  return (
    <div className="cvd-namebox">
      <h1 className="cvd-name">{m.name || 'Your Name'}</h1>
      {m.headline && <div className="cvd-headline">{m.headline}</div>}
    </div>
  )
}

/**
 * Renders a CV as an A4 page (794px wide at 96dpi). Pure presentation: used by
 * the editor preview, template gallery thumbnails, detail page, public link and
 * the print view that produces the PDF.
 */
export function CVDocument({ cv, template, design, className = '' }) {
  const d = resolveDesign(template ?? cv?.template, design ?? cv?.design)
  const t = d.template
  const m = toModel(cv)
  const visible = d.order.filter(k => !d.hidden.has(k) && sectionHasContent(m, k))
  const asideKeys = t.aside ? visible.filter(k => ASIDE_SECTIONS.includes(k)) : []
  const mainKeys = visible.filter(k => !asideKeys.includes(k))
  const showPhoto = t.photo && d.showPhoto
  const contactInAside = t.aside && t.header !== 'banner'

  const header = (
    <header className="cvd-header">
      {t.header === 'banner' && showPhoto && <Photo m={m} />}
      {t.header !== 'aside' && <NameBlock m={m} />}
      {!contactInAside && <ContactList contact={m.contact} inline icons={t.header === 'banner'} />}
      {t.header === 'split' && showPhoto && <Photo m={m} />}
    </header>
  )

  const aside = t.aside && (
    <aside className="cvd-aside">
      {showPhoto && t.header !== 'banner' && <Photo m={m} />}
      {t.header === 'aside' && <NameBlock m={m} />}
      {contactInAside && (
        <section className="cvd-sec cvd-sec--contact">
          <h2 className="cvd-h"><span>Contact</span></h2>
          <div className="cvd-sec__body"><ContactList contact={m.contact} icons /></div>
        </section>
      )}
      {asideKeys.map(k => <Section key={k} k={k} m={m} t={t} place="aside" />)}
    </aside>
  )

  const main = (
    <main className="cvd-main">
      {t.aside && t.header !== 'banner' && t.header !== 'aside' && header}
      {mainKeys.map(k => <Section key={k} k={k} m={m} t={t} place="main" />)}
    </main>
  )

  return (
    <article className={`${docClass(d)} ${className}`} style={docStyle(d)}>
      {(!t.aside || t.header === 'banner') && header}
      {t.aside ? (
        <div className="cvd-body">
          {t.aside === 'left' ? <>{aside}{main}</> : <>{main}{aside}</>}
        </div>
      ) : main}
    </article>
  )
}
