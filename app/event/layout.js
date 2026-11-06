// Guest-facing routes share the warm wooden-table theme.
export default function GuestLayout({ children }) {
  return <div className="theme-guest min-h-screen text-ink">{children}</div>;
}
