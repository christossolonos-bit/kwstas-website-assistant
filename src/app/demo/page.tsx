import Link from "next/link";

export default function DemoHomePage() {
  return (
    <>
      <section className="hero">
        <h1>Skin that feels simple</h1>
        <p>
          Two hero formulas. Ask the assistant in the corner — type or speak —
          and it will take you to the right product.
        </p>
      </section>

      <div className="product-grid">
        <Link className="product-card" href="/demo/products/hydra-glow-serum">
          <h2>Hydra Glow Serum</h2>
          <p>Daily hydration for dry and dehydrated skin. Fragrance-free.</p>
        </Link>
        <Link className="product-card" href="/demo/products/night-repair-cream">
          <h2>Night Repair Cream</h2>
          <p>Overnight barrier support for fine lines and recovery.</p>
        </Link>
        <Link className="product-card" href="/demo/shipping">
          <h2>Shipping & Returns</h2>
          <p>Fast dispatch and a clear 30-day return window.</p>
        </Link>
      </div>
    </>
  );
}
