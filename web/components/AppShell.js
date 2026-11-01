import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
