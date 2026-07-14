import { useRef } from 'react'
import { PageHeader } from '../components/ui'

export default function Settings({ settings, setSettings }) {
  const logoInput = useRef(null)

  function patch(partial) {
    setSettings(prev => ({ ...prev, ...partial }))
  }

  function handleLogo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => patch({ logo: reader.result })
    reader.readAsDataURL(file)
  }

  return (
    <>
      <PageHeader
        title="Business Info & PDF Branding"
        subtitle="Everything here appears on every estimate and invoice PDF you download."
      />

      <div className="builder-grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="card">
          <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label>Business name</label>
              <input value={settings.businessName} onChange={e => patch({ businessName: e.target.value })} />
            </div>
            <div className="field">
              <label>Tagline</label>
              <input value={settings.tagline} onChange={e => patch({ tagline: e.target.value })} />
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Address</label>
            <input value={settings.address} onChange={e => patch({ address: e.target.value })} />
          </div>

          <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 12 }}>
            <div className="field">
              <label>Phone</label>
              <input value={settings.phone} onChange={e => patch({ phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={settings.email} onChange={e => patch({ email: e.target.value })} />
            </div>
            <div className="field">
              <label>Website</label>
              <input value={settings.website} onChange={e => patch({ website: e.target.value })} placeholder="optional" />
            </div>
          </div>

          <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
            <div className="field">
              <label>Accent color (used on PDFs + app)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={settings.accentColor} onChange={e => patch({ accentColor: e.target.value })} style={{ width: 44, padding: 2, height: 36 }} />
                <input value={settings.accentColor} onChange={e => patch({ accentColor: e.target.value })} className="figure" />
              </div>
            </div>
            <div className="field">
              <label>Logo</label>
              <input ref={logoInput} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handleLogo} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => logoInput.current?.click()}>Upload logo</button>
                {settings.logo && <button className="btn btn-ghost btn-sm" onClick={() => patch({ logo: null })}>Remove</button>}
              </div>
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Default estimate terms</label>
            <textarea rows={3} value={settings.estimateTerms} onChange={e => patch({ estimateTerms: e.target.value })} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Default invoice terms</label>
            <textarea rows={3} value={settings.invoiceTerms} onChange={e => patch({ invoiceTerms: e.target.value })} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Footer note (thank-you line)</label>
            <input value={settings.footerNote} onChange={e => patch({ footerNote: e.target.value })} />
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--text-400)', marginTop: 14 }}>
            Saved automatically in this browser. When you download a PDF you can also override the terms
            just for that one document without changing these defaults.
          </p>
        </div>

        <div className="card">
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>PDF header preview</strong>
          <div className="pdf-preview">
            {settings.logo && <img src={settings.logo} alt="Logo" className="pdf-preview-logo" />}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{settings.businessName}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-600)' }}>{settings.tagline}</div>
              <div style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 4 }}>{settings.address}</div>
            </div>
            <div className="pdf-preview-accent" style={{ background: settings.accentColor }}>ESTIMATE</div>
          </div>
        </div>
      </div>
    </>
  )
}
