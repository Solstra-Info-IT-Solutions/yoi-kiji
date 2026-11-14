const collections = [
  { number: "01", title: "Objects for everyday", note: "Useful things, thoughtfully considered." },
  { number: "02", title: "A slower ritual", note: "Small moments made meaningful." },
  { number: "03", title: "Quiet essentials", note: "Less, but chosen with care." },
];

export default function HomePage() {
  return (
    <main>
      <div className="announcement">A considered collection · Made for everyday living</div>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="YOI KIJI home">YOI KIJI<span>余意生地</span></a>
        <nav aria-label="Main navigation"><a href="#collections">Collections</a><a href="#story">Our philosophy</a></nav>
        <a className="bag-link" href="/cart">Bag <span>0</span></a>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">THE ART OF EVERYDAY</p>
          <h1>A quieter<br/><em>way of living.</em></h1>
          <p className="hero-description">Thoughtful objects. Gentle rituals. A little more room for what matters.</p>
          <a className="text-link" href="#collections">Discover the collection <span>↗</span></a>
        </div>
        <div className="hero-art" role="img" aria-label="Abstract warm-toned still life composition">
          <div className="sun-disc"/><div className="vessel vessel-one"/><div className="vessel vessel-two"/>
          <span className="art-caption">静けさの中に、美しさを。</span>
        </div>
        <div className="hero-index">01 / 03</div>
      </section>
      <section className="intro" id="story">
        <p className="eyebrow">A NOTE ON LIVING</p>
        <p>We believe the things around us should bring a sense of <em>ease.</em> YOI KIJI is a study in thoughtful simplicity — where function meets feeling, and everyday life finds its own quiet beauty.</p>
      </section>
      <section className="collections" id="collections">
        <div className="section-heading"><div><p className="eyebrow">EXPLORE WITH INTENTION</p><h2>Find your everyday.</h2></div><span>CURATED, NOT CROWDED</span></div>
        <div className="collection-grid">{collections.map((item) => <article className="collection-card" key={item.number}><span>{item.number}</span><div><h3>{item.title}</h3><p>{item.note}</p></div><a href="/shop" aria-label={`Explore ${item.title}`}>↗</a></article>)}</div>
      </section>
      <footer><a className="wordmark" href="/">YOI KIJI<span>余意生地</span></a><p>A quieter way of living.</p><small>© {new Date().getFullYear()} YOI KIJI. All rights reserved.</small></footer>
    </main>
  );
}
