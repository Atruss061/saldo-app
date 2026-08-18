export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex items-center justify-between gap-4 border-b border-outline-variant/40 pb-5">
      <h1 className="font-display text-3xl font-semibold text-on-surface">{title}</h1>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
