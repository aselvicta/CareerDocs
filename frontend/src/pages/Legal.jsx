import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { AppLogo, Wordmark } from '../AppLogo'
import { useTheme } from '../ThemeContext'
import { api } from '../api'
import './landing.css'
import './legal.css'

// The contact address comes from the backend (CONTACT_EMAIL env var, served at /api/site/),
// so it can change without a frontend rebuild. Fetched once per page load.
let contactPromise
function useContactEmail() {
  const [email, setEmail] = useState('')
  useEffect(() => {
    contactPromise ||= api.get('/site/', { public: true })
      .then(d => (d?.contact_email || '').trim())
      .catch(() => { contactPromise = null; return '' })
    let live = true
    contactPromise.then(e => { if (live) setEmail(e) })
    return () => { live = false }
  }, [])
  return email
}

const SITE = typeof window !== 'undefined' ? window.location.origin : ''
const UPDATED = '16 November 2026'

function LegalShell({ title, children }) {
  const { theme, toggleTheme } = useTheme()
  const email = useContactEmail()
  useEffect(() => {
    document.title = `${title} | CareerDocs`
    window.scrollTo(0, 0)
    return () => { document.title = 'CareerDocs: build CVs and cover letters with AI' }
  }, [title])

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav__inner">
          <Link to="/" className="lp-brand" aria-label="CareerDocs home">
            <AppLogo className="lp-brand__mark" alt="" /> <Wordmark />
          </Link>
          <div className="lp-nav__actions" style={{ marginLeft: 'auto' }}>
            <button type="button" className="lp-icon-btn" onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <Link to="/" className="lp-link">Home</Link>
          </div>
        </div>
      </header>
      <main className="lp-wrap legal">
        <h1>{title}</h1>
        <p className="legal__updated">Last updated: {UPDATED}</p>
        {children}
      </main>
      <footer className="lp-footer">
        <div className="lp-wrap legal__footer">
          <Link to="/">Home</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          {email && <a href={`mailto:${email}`}>{email}</a>}
        </div>
        <div className="lp-wrap lp-footer__copy">© {new Date().getFullYear()} CareerDocs. All rights reserved.</div>
      </footer>
    </div>
  )
}

function Mail() {
  const email = useContactEmail()
  return email ? <a href={`mailto:${email}`}>{email}</a> : <span>our support email</span>
}

export function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This policy explains what information CareerDocs (<a href={SITE}>{SITE.replace('https://', '')}</a>)
        collects, how we use it, who we share it with, and the choices you have. It covers our website and
        the CareerDocs web app. If you have questions, email <Mail />.
      </p>

      <h2>Summary</h2>
      <ul>
        <li>We collect what you give us (account details and the content of your CVs, letters and applications) and basic usage logs.</li>
        <li>If you sign in with Google, we receive only your name, email address and profile picture URL from Google, and we use them to create and run your account.</li>
        <li>If you connect Gmail, we can only <strong>send</strong> emails you ask us to send. We cannot read, search or delete your email.</li>
        <li>We do not sell your data, we do not use it for advertising, and we do not use Google user data to train AI models.</li>
        <li>You can delete your documents at any time and ask us to delete your account.</li>
      </ul>

      <h2>1. Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account details:</strong> your email address, an optional username, your name and a password (stored only as a one-way hash). Accounts created with Google sign-in have no password.</li>
        <li><strong>Profile details:</strong> name, email, phone number, location, summary and referees, which you can save to pre-fill new documents.</li>
        <li><strong>Document content:</strong> everything you type into CVs and letters, including work history, education, skills, links, referee contact details and an optional photo, plus earlier saved versions so you can undo changes.</li>
        <li><strong>Imported files:</strong> if you import a Word or PDF CV, we read the file to pull out its text and fill in a new CV. We keep the resulting CV, not the uploaded file.</li>
        <li><strong>Job applications:</strong> job titles, companies, links, deadlines, status and notes you enter, and details of emails you send through CareerDocs (recipient, subject, sender address, time and, for Gmail, the message and thread IDs).</li>
      </ul>

      <h3>Information collected automatically</h3>
      <ul>
        <li><strong>Activity logs:</strong> pages you visit in the app and actions such as sign-in, export or AI requests, together with your IP address, browser user agent, the website that referred you (domain only) and a time stamp. Numbers in page addresses are replaced with placeholders, so we do not log which specific document you opened.</li>
        <li><strong>Browser storage:</strong> we keep your sign-in token, a random visitor ID used to count visits, and display preferences (such as dark mode) in your browser&apos;s local storage. Our server also sets a session cookie and a security (CSRF) cookie. We do not use advertising or cross-site tracking cookies.</li>
        <li><strong>Hosting analytics:</strong> our host, Vercel, provides privacy-friendly page view statistics that do not use cookies.</li>
      </ul>

      <h2>2. Google user data</h2>
      <p>CareerDocs offers two optional Google features. We request only the access each one needs.</p>

      <h3>Sign in with Google</h3>
      <p>
        <strong>Access requested:</strong> <code>openid</code>, <code>email</code> and <code>profile</code>.
        Google shares your name, email address, whether the email is verified, and your profile picture URL.
      </p>
      <p>
        <strong>How we use it:</strong> to create your account or sign you in, and to pre-fill the name and email
        on your CareerDocs profile. We do not store your profile picture. We do not keep the Google access
        token after sign-in.
      </p>

      <h3>Connect Gmail (send email from your own address)</h3>
      <p>
        <strong>Access requested:</strong> <code>https://www.googleapis.com/auth/gmail.send</code> plus your email
        address so we know which account you connected.
      </p>
      <p>
        <strong>How we use it:</strong> only to send an email when you press Send in CareerDocs, for example a job
        application with your CV and cover letter attached. The message goes out from your Gmail account and is
        saved in your Gmail &quot;Sent&quot; folder like any email you write yourself. This permission does
        not let us read, search, label or delete any of your email, and we never send anything without your
        action.
      </p>
      <p>
        <strong>What we store:</strong> the connected Gmail address, a Google refresh token encrypted at rest,
        the connection date and the time it was last used. For each email you send we store the recipient,
        subject, time and Gmail message and thread IDs on the related job application so you can see what you
        sent. We do not store the contents of your mailbox.
      </p>
      <p>
        <strong>How to remove access:</strong> disconnect the account in CareerDocs under Settings. We then
        revoke the token with Google and delete it. You can also remove CareerDocs at any time from your Google
        Account at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.
      </p>

      <h3>Limited Use</h3>
      <p>
        CareerDocs&apos; use and transfer to any other app of information received from Google APIs will adhere
        to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>,
        including the Limited Use requirements. In particular, we:
      </p>
      <ul>
        <li>use Google user data only to provide and improve the user-facing features described above;</li>
        <li>do not transfer Google user data to others except as needed to provide those features, to comply with the law, or as part of a merger or sale of the service with notice to you;</li>
        <li>do not use or transfer Google user data for advertising, and do not sell it;</li>
        <li>do not use Google user data to develop, improve or train generalised or non-personalised AI or machine learning models;</li>
        <li>do not allow people to read Google user data unless you give us permission (for example, for support), it is needed for security or to investigate abuse, or it is required by law.</li>
      </ul>

      <h2>3. How we use information</h2>
      <ul>
        <li>To provide the service: store and display your documents, export them to PDF or Word, create share links, and send emails you ask us to send.</li>
        <li>To run AI features when you ask for them (see section 4).</li>
        <li>To keep the service secure, prevent abuse, and fix problems.</li>
        <li>To understand, in aggregate, how the app is used so we can improve it.</li>
        <li>To contact you about your account or important changes to the service.</li>
      </ul>

      <h2>4. AI features</h2>
      <p>
        When you use an AI feature (such as Enhance, Suggest, Generate a letter, Tailor to a job, ATS check, or
        the help chat), we send the text needed for that request, which may include parts of your CV, letter or a
        job description you paste in, to our AI provider, DeepSeek, which returns suggested text. We only send
        content when you trigger an AI feature. We do not send your Gmail access or tokens to the AI provider,
        and we do not use your content to train AI models ourselves.
      </p>

      <h2>5. Who we share information with</h2>
      <p>We do not sell your personal information. We share it only with:</p>
      <ul>
        <li><strong>Service providers</strong> that run CareerDocs for us: Vercel (website hosting and page statistics), Render (application server and database), DeepSeek (AI text generation, only when you use AI features), and our email provider (for emails sent from the CareerDocs address).</li>
        <li><strong>Google</strong>, when you choose to sign in with Google or send email through Gmail.</li>
        <li><strong>People you choose:</strong> recipients of emails you send, and anyone you give a CV share link to. Anyone with a share link can view that CV until you turn sharing off.</li>
        <li><strong>Authorities</strong>, when we are legally required to, or to protect the rights, safety and property of our users or others.</li>
      </ul>
      <p>
        A small number of CareerDocs administrators can access account and document data to provide support,
        investigate abuse and keep the service running.
      </p>

      <h2>6. Data retention and deletion</h2>
      <ul>
        <li>Documents, applications and profile details stay in your account until you delete them or your account is deleted.</li>
        <li>Deleting a CV or letter removes it and its saved versions.</li>
        <li>Disconnecting Gmail deletes the stored token immediately.</li>
        <li>Activity logs are deleted after 12 months.</li>
        <li>
          To delete your account and all data linked to it, email <Mail /> from the address on your account.
          We will complete the deletion within 30 days, including any Google data we hold. Backups are
          overwritten on a rolling basis after that.
        </li>
      </ul>

      <h2>7. Security</h2>
      <p>
        Data is sent over HTTPS. Passwords are hashed, and Gmail refresh tokens are encrypted before they are
        stored. Access to production systems is limited to administrators. No method of storage or transmission
        is completely secure, but we work to protect your information and will tell you if a breach affects you.
      </p>

      <h2>8. Your rights and choices</h2>
      <p>
        You can view, edit, export and delete your documents in the app at any time. You can also ask us for a
        copy of your data, to correct it, or to delete it by emailing <Mail />. Depending on where you live,
        including under Tanzania&apos;s Personal Data Protection Act, you may have further rights, such as to
        object to some processing or to complain to a data protection authority.
      </p>

      <h2>9. International transfers</h2>
      <p>
        Our providers may process data in countries other than yours, including the United States. We use
        providers that protect data in line with this policy.
      </p>

      <h2>10. Children</h2>
      <p>
        CareerDocs is not intended for children under 13, and we do not knowingly collect their information.
        If you believe a child has given us personal information, contact us and we will delete it.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy. We will change the date at the top, and if the changes are significant we
        will tell you in the app or by email before they take effect.
      </p>

      <h2>12. Contact</h2>
      <p>Questions or requests about privacy: <Mail />.</p>
    </LegalShell>
  )
}

export function TermsOfService() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        These terms apply when you use CareerDocs (<a href={SITE}>{SITE.replace('https://', '')}</a>). By creating
        an account or using the service you agree to them. Our <Link to="/privacy">Privacy Policy</Link> explains
        how we handle your information.
      </p>

      <h2>1. The service</h2>
      <p>
        CareerDocs helps you write CVs and letters, improve them with AI, export them, send them by email and
        track job applications. We may change, add or remove features over time.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must give accurate information and keep your sign-in details safe. You are responsible for activity
        on your account. You must be at least 13 years old to use CareerDocs.
      </p>

      <h2>3. Your content</h2>
      <p>
        You own the content you create. You give us permission to store, process and display it only as needed to
        run the service for you, for example to export a PDF, send an email you request or process an AI request.
        You are responsible for making sure your content is accurate and that you have the right to include
        other people&apos;s details, such as referees.
      </p>

      <h2>4. AI suggestions</h2>
      <p>
        AI-generated text can be wrong or incomplete. Review everything before you use or send it. You are
        responsible for what you submit to employers.
      </p>

      <h2>5. Sending email</h2>
      <p>
        When you send email through CareerDocs, including through a connected Gmail account, you are the sender.
        Do not use CareerDocs to send spam, bulk unsolicited messages, or anything unlawful, misleading or
        abusive.
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        Do not misuse the service: no attempts to break or overload it, access other people&apos;s data, or use
        it to impersonate someone else. We may suspend or close accounts that break these terms.
      </p>

      <h2>7. Ending your account</h2>
      <p>
        You can stop using CareerDocs at any time and ask us to delete your account by emailing <Mail />.
      </p>

      <h2>8. Disclaimers and liability</h2>
      <p>
        CareerDocs is provided &quot;as is&quot;. We do not guarantee that it will always be available or error
        free, or that using it will lead to a job. To the extent the law allows, we are not liable for indirect
        or consequential losses arising from your use of the service.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these terms. We will change the date at the top and tell you about significant changes
        before they take effect.
      </p>

      <h2>10. Contact</h2>
      <p>Questions about these terms: <Mail />.</p>
    </LegalShell>
  )
}
