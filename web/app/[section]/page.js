import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";

const sections = {
  guilds: {
    title: "Guild Management",
    description: "Manage guilds, members and guild leadership.",
  },
  matches: {
    title: "Match Management",
    description: "View matches, participants and match statistics.",
  },
  inventory: {
    title: "Inventory Management",
    description: "Manage player inventories and game items.",
  },
  achievements: {
    title: "Achievement Management",
    description: "View achievements and player unlocks.",
  },
};

export default async function SectionPage({ params }) {
  const { section } = await params;
  const page = sections[section];

  if (!page) notFound();

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <p className="eyebrow">GAME MANAGEMENT SYSTEM</p>
          <h1>{page.title}</h1>
        </div>
      </header>

      <section className="welcome">
        <p>COMING NEXT</p>
        <h2>{page.title}</h2>
        <span>{page.description}</span>
      </section>

      <p className="placeholder-note">
        This section is not connected to its database operations yet.
        We'll implement it in the next development milestone.
      </p>

      <Link href="/" className="back-link">
        ← Back to Dashboard
      </Link>
    </AppShell>
  );
}
