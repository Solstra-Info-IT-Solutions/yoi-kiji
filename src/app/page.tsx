import { getActiveCategories } from "@/lib/catalog";

const fallbackCategories = [
  { number: "01", name: "Bedsheets", note: "A softer beginning and end to every day.", image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=88", slug: "bedsheets" },
  { number: "02", name: "Curtains", note: "Light, filtered to feel just right.", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=88", slug: "curtains" },
  { number: "03", name: "Upholstery", note: "Texture that makes a space your own.", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=88", slug: "upholstery" },
  { number: "04", name: "Bath linen", note: "Everyday rituals, made more considered.", image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=88", slug: "bath-linen" },
  { number: "05", name: "Kitchen linen", note: "The thoughtful details of daily living.", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=88", slug: "kitchen-linen" },
];

const bedsheetVariants = ["Single", "Double", "King", "Fitted"];

export default async function HomePage() {
  const dbCategories = (await getActiveCategories()).filter(category => category.parentId === null);\n  const imageFallbacks = Object.fromEntries(fallbackCategories.map(category => [category.slug, category.image]));\n  const categories = dbCategories.length ? dbCategories.map((category, index) => ({ number: String(index + 1).padStart(2, "0"), name: category.name, note: category.description ?? "Thoughtfully chosen textiles for the spaces you return to.", image: category.imageUrl ?? imageFallbacks[category.slug] ?? fallbackCategories[index % fallbackCategories.length].image, slug: category.slug })) : fallbackCategories;
  return (
    <main>

      <section className="hero">
        <div className="hero-photo" role="img" aria-label="Beautifully layered bed linen in a calm, natural bedroom">
          <div className="hero-photo-overlay" />
          <div className="hero-photo-caption"><span>THE TEXTURE OF HOME</span><span>01 — A STUDY IN COMFORT</span></div>
        </div>
        <div className="hero-panel">
          <p className="eyebrow"><span className="eyebrow-dot" /> CONSIDERED TEXTILES · EST. IN EVERYDAY</p>
          <h1>Live in<br/><em>the feeling.</em></h1>
          <p className="hero-description">Thoughtfully chosen textiles for the spaces you return to. Made to be touched, lived in, and loved a little longer.</p>
          <a className="primary-link" href="/shop">Discover the collection <span>↗</span></a>
          <div className="hero-panel-bottom"><span>YOI KIJI / HOME TEXTILES</span><span>01 / 05</span></div>
        </div>
        <span className="hero-side-note">SOFTNESS IN EVERY DETAIL</span>
      </section>

      <section className="brand-marquee" aria-label="Brand values"><span>COMFORT, CONSIDERED</span><i>✳</i><span>TEXTURE WITH INTENTION</span><i>✳</i><span>MADE FOR YOUR EVERYDAY</span><i>✳</i><span>COMFORT, CONSIDERED</span></section>

      <section className="intro" id="story">
        <div className="intro-kicker"><span className="eyebrow">A HOME, MORE YOURS</span><span>THE YOI KIJI POINT OF VIEW — 001</span></div>
        <div className="intro-grid"><h2>It begins with<br/><em>how it feels.</em></h2><div className="intro-copy"><p>Home is not simply a place. It is the softness at the end of a long day, the light through a familiar window, the small details that make a space feel unmistakably yours.</p><p>We bring together considered textiles for bedrooms, windows, living spaces and everyday rituals.</p><a className="text-link" href="/our-story">Get to know YOI KIJI <span>↗</span></a></div></div>
      </section>

      <section className="categories" id="collections">
        <div className="section-heading"><div><p className="eyebrow">THE COLLECTIONS</p><h2>Find your <em>favourite feel.</em></h2></div><a className="text-link" href="/shop">Explore everything <span>↗</span></a></div>
        <div className="category-grid">{categories.map((item) => <a className={`category-card category-card--${item.slug}`} href={`/shop/${item.slug}`} key={item.number}><div className="category-image" style={{ backgroundImage: `url("${item.image}")` }}><span className="category-number">{item.number}</span><span className="category-arrow">↗</span></div><div className="category-meta"><div><h3>{item.name}</h3><p>{item.note}</p></div><span className="category-plus">+</span></div></a>)}</div>
      </section>

      <section className="bedsheet-feature">
        <div className="bedsheet-image" role="img" aria-label="Crisp, inviting bed linen in a softly lit bedroom"><span>THE BEDDING EDIT / 001</span></div>
        <div className="bedsheet-copy"><p className="eyebrow">MADE FOR YOUR KIND OF COMFORT</p><h2>A better<br/><em>kind of rest.</em></h2><p>Find the right fit for your bed, your space and the way you unwind.</p><div className="size-list"><span>CHOOSE YOUR FIT</span>{bedsheetVariants.map((size) => <span key={size}>{size}</span>)}</div><a className="light-link" href="/shop/bedsheets">Shop bedsheets <span>↗</span></a></div>
      </section>

      <section className="promise"><span className="promise-mark">✳</span><p>Made for the moments<br/>that make a <em>home.</em></p><span className="promise-jp">日々を、心地よく。</span></section>

      <section className="journal"><div><p className="eyebrow">NOTES ON MAKING A HOME</p><h2>Live well.<br/><em>Feel at home.</em></h2></div><p>Ideas, care notes and inspiration for choosing, styling and living with textiles you love.</p><a className="text-link" href="/journal">Read the journal <span>↗</span></a></section>


    </main>
  );
}
