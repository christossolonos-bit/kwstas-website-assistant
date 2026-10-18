import { AdminClient } from "./AdminClient";

export default function AdminPage() {
  return (
    <main>
      <div className="site-nav">
        <a className="brand" href="/">
          Voice Site Assistant
        </a>
        <ul className="nav-links">
          <li>
            <a href="/demo">Demo store</a>
          </li>
        </ul>
      </div>
      <AdminClient />
    </main>
  );
}
