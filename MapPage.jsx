import { useMemo, useState } from 'react'
import { PageHeader, EmptyState } from '../components/ui'

// Uses Google's keyless embed endpoint (maps?q=...&output=embed) so this
// works with zero API key / billing setup. Good for a small business's own
// address list; for a public-facing product at scale you'd move to the
// Maps JavaScript API with a proper key for multi-pin views and quota.
function embedUrl(address) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
}

export default function MapPage({ clients }) {
  const locations = useMemo(() => {
    return clients
      .filter(c => c.address)
      .map(c => ({ id: `client-${c.id}`, label: c.name, sub: 'Client', address: c.address }))
  }, [clients])

  const [selectedId, setSelectedId] = useState(locations[0]?.id ?? null)
  const selected = locations.find(l => l.id === selectedId) || locations[0] || null

  return (
    <>
      <PageHeader title="Job Site Map" subtitle="Every client address, ready to route to." />

      {locations.length === 0 ? (
        <EmptyState title="No addresses yet" subtitle="Add an address to a client to see it here." />
      ) : (
        <div className="builder-grid">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {selected && (
              <iframe
                title="map"
                width="100%"
                height="480"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                src={embedUrl(selected.address)}
              />
            )}
          </div>

          <div className="card">
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Addresses</strong>
            <div style={{ marginTop: 10 }}>
              {locations.map(l => (
                <div
                  key={l.id}
                  className={`map-list-item ${selected?.id === l.id ? 'map-list-item-active' : ''}`}
                  onClick={() => setSelectedId(l.id)}
                >
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{l.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-400)' }}>{l.sub}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-600)', marginTop: 2 }}>{l.address}</div>
                  <a
                    className="figure"
                    style={{ fontSize: 11.5, color: 'var(--ink-700)' }}
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(l.address)}`}
                    target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                  >
                    Get directions →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
