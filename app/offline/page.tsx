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
            background: #0D1426;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 1.5rem;
          }
          /* Court-line pattern overlay */
          body::before {
            content: '';
            position: fixed;
            inset: 0;
            background-image:
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
            background-size: 44px 44px;
            pointer-events: none;
          }
          /* Tape stripe top */
          body::after {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 6px;
            background-image: repeating-linear-gradient(
              -45deg,
              #c6f432 0, #c6f432 14px,
              #0d1426 14px, #0d1426 28px
            );
          }
          .card {
            background: #111c38;
            border: 2px solid rgba(255,255,255,0.1);
            border-radius: 2rem;
            padding: 3rem 2.5rem;
            text-align: center;
            max-width: 420px;
            width: 100%;
            position: relative;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(198, 244, 50, 0.12);
            border: 1px solid rgba(198, 244, 50, 0.3);
            border-radius: 999px;
            padding: 0.35rem 1rem;
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: #c6f432;
            margin-bottom: 1.5rem;
          }
          .badge::before {
            content: '';
            width: 8px; height: 8px;
            border-radius: 2px;
            background: #c6f432;
            display: block;
          }
          .paddle {
            font-size: 3.5rem;
            margin-bottom: 1.25rem;
            display: block;
            filter: grayscale(0.3);
          }
          h1 {
            color: #fff;
            font-size: clamp(2rem, 6vw, 2.75rem);
            font-weight: 900;
            letter-spacing: -0.03em;
            line-height: 0.95;
            margin-bottom: 1rem;
          }
          p {
            color: rgba(255,255,255,0.6);
            font-size: 0.95rem;
            line-height: 1.65;
            margin-bottom: 2rem;
            max-width: 300px;
            margin-left: auto;
            margin-right: auto;
          }
          .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #2f5bff;
            color: #fff;
            font-weight: 800;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding: 0.9rem 2.2rem;
            border-radius: 999px;
            text-decoration: none;
            border: none;
            cursor: pointer;
            box-shadow: 0 10px 0 -4px rgba(35,72,224,0.5);
            transition: all 0.2s;
          }
          .btn-primary:hover {
            background: #1b3bd6;
            box-shadow: 0 6px 0 -3px rgba(35,72,224,0.6);
            transform: translateY(2px);
          }
          .divider {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin: 1.5rem 0;
            color: rgba(255,255,255,0.2);
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.15em;
          }
          .divider::before, .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255,255,255,0.1);
          }
          .secondary-btn {
            display: inline-block;
            color: rgba(255,255,255,0.5);
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            text-decoration: none;
            cursor: pointer;
            background: none;
            border: 1px solid rgba(255,255,255,0.15);
            padding: 0.75rem 1.75rem;
            border-radius: 999px;
            transition: all 0.2s;
          }
          .secondary-btn:hover {
            border-color: rgba(255,255,255,0.3);
            color: rgba(255,255,255,0.8);
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <span className="badge">Connection lost</span>
          <span className="paddle">🏓</span>
          <h1>You&apos;re Offline</h1>
          <p>
            Looks like you&apos;ve lost your connection. Connect to Wi-Fi or mobile data and we&apos;ll get you back on the court in seconds.
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
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
