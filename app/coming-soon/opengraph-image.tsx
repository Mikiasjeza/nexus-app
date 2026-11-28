import { ImageResponse } from 'next/og'

export const alt =
  'Nexus is coming soon: verified skills, evidence-backed Skill Passports and jobs that fit.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** The share card for the Coming Soon page (links on social sites and chats). */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#000',
        color: '#fff',
        padding: 72,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignSelf: 'flex-start',
          alignItems: 'center',
          height: 64,
          padding: '0 20px',
          background: '#fff',
          color: '#000',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: -1.5,
        }}
      >
        Nexus
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{ fontSize: 28, color: '#bebebe', letterSpacing: 4, textTransform: 'uppercase' }}
        >
          Coming soon
        </div>
        <div
          style={{ fontSize: 92, lineHeight: 1, letterSpacing: -4, marginTop: 24, maxWidth: 980 }}
        >
          Show what you can do. Prove it.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {['#cdabfe', '#d1ddd3', '#fe7141'].map((c) => (
          <div key={c} style={{ width: 120, height: 16, background: c }} />
        ))}
      </div>
    </div>,
    size
  )
}
