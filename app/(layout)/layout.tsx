import CommandShell from '@/components/CommandShell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CommandShell>{children}</CommandShell>;
}

