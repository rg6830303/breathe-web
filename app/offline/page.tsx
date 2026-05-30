"use client";

export default function OfflinePage() {
  return (
    <html lang="en">
      <head>
        <title>Offline — Breathe Pickleball</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1E3FBF 0%, #0E1F6F 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 1.5rem;
          }
          .card {
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 2rem;
            padding: 3rem 2rem;
            text-align: center;
            max-width: 400px;
            width: 100%;
            backdrop-filter: blur(20px);
          }
          .emoji { font-size: 4rem; margin-bottom: 1rem; display: block; }
          h1 {
            color: #fff;
            font-size: 1.75rem;
            font-weight: 800;
            margin-bottom: 0.75rem;
          }
          p {
            color: rgba(255,255,255,0.7);
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #AAFF00;
            color: #0E1F6F;
            font-weight: 800;
            font-size: 0.9rem;
            padding: 0.85rem 2rem;
            border-radius: 100px;
            text-decoration: none;
            transition: opacity 0.2s;
            border: none;
            cursor: pointer;
          }
          .btn:hover { opacity: 0.9; }
          .divider {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin: 1.5rem 0;
            color: rgba(255,255,255,0.3);
            font-size: 0.75rem;
          }
          .divider::before, .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255,255,255,0.15);
          }
          .secondary-btn {
            display: inline-block;
            color: rgba(255,255,255,0.7);
            font-size: 0.85rem;
            font-weight: 600;
            text-decoration: underline;
            cursor: pointer;
            background: none;
            border: none;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <span className="emoji">🏓</span>
          <h1>You&apos;re Offline</h1>
          <p>
            Looks like you&apos;ve lost your connection. Connect to Wi-Fi or mobile data and we&apos;ll get you back on the court in seconds.
          </p>
          <button className="btn" onClick={() => window.location.reload()}>
            ↻ &nbsp;Try again
          </button>
          <div className="divider">or</div>
          <button className="secondary-btn" onClick={() => window.history.back()}>
            ← Go back
          </button>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `window.addEventListener('online', () => window.location.reload());` }} />
      </body>
    </html>
  );
}
