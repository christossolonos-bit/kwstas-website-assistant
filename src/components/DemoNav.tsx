import Link from "next/link";

export function DemoNav() {
  return (
    <nav className="site-nav">
      <Link className="brand" href="/demo">
        Lumina Skin
      </Link>
      <ul className="nav-links">
        <li>
          <Link href="/demo">Shop</Link>
        </li>
        <li>
          <Link href="/demo/products/hydra-glow-serum">Serum</Link>
        </li>
        <li>
          <Link href="/demo/products/night-repair-cream">Night Cream</Link>
        </li>
        <li>
          <Link href="/demo/shipping">Shipping</Link>
        </li>
        <li>
          <Link href="/demo/about">About</Link>
        </li>
        <li>
          <Link href="/admin">Admin</Link>
        </li>
      </ul>
    </nav>
  );
}
