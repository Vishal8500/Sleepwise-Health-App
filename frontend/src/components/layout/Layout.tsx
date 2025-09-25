import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
  user?: any;
}

export const Layout = ({ children, user }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header user={user} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};