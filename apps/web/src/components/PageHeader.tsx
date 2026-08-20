import { HelpTip } from "./ui";

export function PageHeader({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col items-start gap-3 border-b border-outline-variant/40 pb-5 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-semibold text-on-surface sm:text-3xl">{title}</h1>
        {help && <HelpTip text={help} />}
      </div>
      {children && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">{children}</div>}
    </header>
  );
}
