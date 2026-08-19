export default function Home() {
  return (
    <main className="landing">
      <aside className="landing-sidebar">
        <h2 className="landing-logo">Ephemera</h2>
        <nav>
          <a href="/owner/dashboard" className="landing-nav-link">
            Owner dashboard
          </a>
          <a href="/owner/dashboard" className="landing-nav-link">
            Collaborator dashboard
          </a>
        </nav>
      </aside>

      <section className="landing-content">
        <div className="landing-polaroid">
          <div className="landing-polaroid-photo" />
          <div className="landing-polaroid-caption">Live at your event</div>
        </div>

        <h1>Ephemera</h1>
        <p>A live polaroid wall, built by everyone at the event.</p>
      </section>
    </main>
  );
}