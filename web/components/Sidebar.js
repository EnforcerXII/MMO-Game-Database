"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Overview", href: "/" },
  { label: "Players", href: "/players" },
  { label: "Guilds", href: "/guilds" },
  { label: "Matches", href: "/matches" },
  { label: "Inventory", href: "/inventory" },
  { label: "Achievements", href: "/achievements" },
  {
    label: "Friendships",
    href: "/friendships",
  }
];

export default function Sidebar({ Role }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <h2>ARENA OPS</h2>
      <p className="sidebar-label">MANAGEMENT</p>

      {(Role === "ADMIN" ? links : [{ label: "My account", href: "/account" }]).map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`nav-item ${
            pathname === link.href ? "active" : ""
          }`}
        >
          {link.label}
        </Link>
      ))}
    </aside>
  );
}
