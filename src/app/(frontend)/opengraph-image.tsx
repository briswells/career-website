import { ImageResponse } from 'next/og'

export const alt = 'Brian Wells'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#131211',
          color: '#f0ede9',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, color: '#2dd4bf' }}>brianwells.org</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: '-0.03em' }}>Brian Wells</div>
          <div style={{ fontSize: 30, color: '#a8a19a', maxWidth: 900 }}>
            Software & infrastructure engineer
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#a8a19a' }}>Brian Wells</div>
      </div>
    ),
    size,
  )
}
