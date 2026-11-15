import Link from "next/link";
export default function NotFound() {
  return <main className="not-found"><p className="eyebrow">YOI KIJI / 404</p><h1>Not quite<br/><em>where you meant to be.</em></h1><p>The page may have moved, or the collection is not available.</p><Link className="primary-link" href="/">Return home <span>↗</span></Link></main>;
}
