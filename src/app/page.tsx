import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="hero panel">
        <h1>Voice Site Assistant</h1>
        <p>
          Put a voice chatbot on your static website. Customers ask in everyday
          Greek or English — it answers out loud from your FAQ, so you get fewer
          follow-up calls about shipping, products, and the same questions again
          and again.
        </p>
        <div className="btn-row" style={{ marginTop: "1.25rem" }}>
          <Link className="btn" href="/demo">
            Try the demo
          </Link>
          <Link className="btn secondary" href="/admin">
            Load your answers
          </Link>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>How it works for a site owner</h2>
        <ol className="muted" style={{ lineHeight: 1.7, paddingLeft: "1.2rem" }}>
          <li>Write the answers you usually give on the phone (Greek, English, or both).</li>
          <li>Paste them in Admin and list the important pages of your site.</li>
          <li>Add one script tag to your static HTML — done.</li>
        </ol>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          No OpenAI. Voice uses Edge TTS. The widget floats on top and can
          minimize to a chat icon.
        </p>
      </div>

      <div className="panel" style={{ marginTop: "1.25rem" }}>
        <h2>Add to any static page</h2>
        <p className="muted">
          Host this assistant once, then paste before <code>&lt;/body&gt;</code>{" "}
          on your website:
        </p>
        <pre className="code">{`<script
  src="https://YOUR_ASSISTANT_HOST/embed.js"
  data-api-base="https://YOUR_ASSISTANT_HOST"
  data-auto-scan="true"
  async></script>`}</pre>
      </div>
    </main>
  );
}
