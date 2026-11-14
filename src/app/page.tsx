const collections = [
  { number: "01", title: "The art of the table", note: "Objects that make a moment of a meal.", image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=85", className: "collection-image--table" },
  { number: "02", title: "A softer space", note: "Textures, forms and considered details.", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85", className: "collection-image--space" },
  { number: "03", title: "Daily rituals", note: "Small pauses, thoughtfully made.", image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85", className: "collection-image--ritual" },
];

export default function HomePage() {
  return (
    <main>
      <div className="announcement"><span>AN INVITATION TO SLOW DOWN</span><span className="announcement-divider">✳</span><span>DISCOVER THE WORLD OF YOI KIJI</span></div>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="YOI KIJI home"><span className="wordmark-main">YOI KIJI</span><span className="wordmark-jp">余意生地</span></a>
        <nav aria-label="Main navigation"><a href="/shop">Shop all</a><a href="#collections">Collections</a><a href="#story">Our philosophy</a><a href="#journal">Journal</a></nav>
        <div className="header-actions"><a href="/search" aria-label="Search">Search <span>↗</span></a><a href="/account">Account</a><a className="bag-link" href="/cart">Bag <span>0</span></a></div>
      </header>

      <section className="hero">
        <div className="hero-image" role="img" aria-label="Sunlit, serene Japanese-inspired living space">
          <div className="hero-image-shade" />
          <span className="hero-image-note">FORM / MATERIAL / STILLNESS</span>
          <span className="hero-image-index">TOKYO, 06:18 AM — A STUDY IN LIGHT</span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-mark">✳</span> THE BEAUTY OF ENOUGH</p>
          <h1>Make room<br/>for <em>meaning.</em></h1>
          <p className="hero-description">A thoughtful edit of objects for living well. Rooted in simplicity, made to be lived with.</p>
          <a className="primary-link" href="/shop">Explore the collection <span>↗</span></a>
          <div className="hero-foot"><span>01 — 03</span><span>LESS, BUT BETTER.</span></div>
        </div>
        <div className="hero-vertical">A QUIETER WAY OF LIVING</div>
      </section>

      <section className="brand-strip" aria-label="Brand principles"><span>意 — INTENTION</span><i>✳</i><span>余 — SPACE</span><i>✳</i><span>生 — EVERYDAY LIFE</span><i>✳</i><span>美 — BEAUTY</span></section>

      <section className="intro" id="story">
        <div className="intro-label"><span className="eyebrow">A NOTE ON LIVING</span><span className="intro-number">01 / OUR PHILOSOPHY</span></div>
        <div className="intro-content"><p className="intro-heading">Not more things.<br/><em>More meaning</em> in the things.</p><div className="intro-aside"><p>We believe a well-lived life is shaped by the details we choose to keep close. The curve of a cup. The weight of linen. The quiet ritual of beginning again.</p><a className="underlined-link" href="/our-story">A little about us <span>↗</span></a></div></div>
      </section>

      <section className="collections" id="collections">
        <div className="section-heading"><div><p className="eyebrow">THOUGHTFULLY GATHERED</p><h2>Objects with <em>intention.</em></h2></div><a className="underlined-link" href="/shop">View all collections <span>↗</span></a></div>
        <div className="collection-grid">{collections.map((item) => <a className="collection-card" href="/shop" key={item.number}><div className={`collection-image ${item.className}`} style={{ backgroundImage: `url("${item.image}")` }}><span className="collection-count">{item.number}</span><span className="collection-arrow">↗</span></div><div className="collection-meta"><div><h3>{item.title}</h3><p>{item.note}</p></div><span className="collection-plus">+</span></div></a>)}</div>
      </section>

      <section className="statement">
        <div className="statement-image" role="img" aria-label="Natural textures and quiet interior details" />
        <div className="statement-copy"><p className="eyebrow">THE YOI KIJI POINT OF VIEW</p><p className="statement-quote">“The ordinary, seen with care, becomes <em>extraordinary.</em>”</p><span className="statement-jp">日々の中に、美しさを。</span><a className="underlined-link" href="/our-story">Discover our philosophy <span>↗</span></a></div>
      </section>

      <section className="journal" id="journal"><div><p className="eyebrow">NOTES FOR SLOWER DAYS</p><h2>A little more <em>thought.</em></h2></div><p>Ideas, rituals and inspiration for a life with a little more intention.</p><a className="underlined-link" href="/journal">Visit the journal <span>↗</span></a></section>

      <footer><div className="footer-top"><a className="wordmark footer-wordmark" href="/"><span className="wordmark-main">YOI KIJI</span><span className="wordmark-jp">余意生地</span></a><p>A quieter way of living.</p><a className="back-top" href="#">BACK TO TOP ↑</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} YOI KIJI</span><span>MADE FOR THE EVERYDAY</span><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:hello@yoi-kiji.com">Contact</a></div></div></footer>
    </main>
  );
}
