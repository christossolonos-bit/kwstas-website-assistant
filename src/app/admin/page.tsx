import { AdminClient } from "./AdminClient";

export default function AdminPage() {
  return (
    <main>
      <div className="site-nav">
        <a className="brand" href="/">
          YGIA voice assistant
        </a>
        <ul className="nav-links">
          <li>
            <a href="/">Customer call desk</a>
          </li>
        </ul>
      </div>
      <AdminClient />
    </main>
  );
}
