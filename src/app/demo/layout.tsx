import { DemoNav } from "@/components/DemoNav";
import { EmbedScript } from "@/components/EmbedScript";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main>
        <DemoNav />
        {children}
      </main>
      <EmbedScript />
    </>
  );
}
