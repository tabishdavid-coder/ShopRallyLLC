import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { FaqAiAssistant } from "@/components/support/faq-ai-assistant";
import { listFaqArticles } from "@/server/support";
import { Button } from "@/components/ui/button";

export const metadata = { title: "FAQ — ShopRally" };
export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const articles = await listFaqArticles();
  const byCategory = articles.reduce<Record<string, typeof articles>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1" asChild>
          <Link href="/support">
            <ChevronLeft className="size-4" />
            Back to Support
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">FAQ library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {articles.length} articles across {Object.keys(byCategory).length} categories
        </p>
      </div>

      <FaqAiAssistant />

      {Object.entries(byCategory).map(([category, items]) => (
        <section key={category} className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-navy">{category}</h2>
          <div className="divide-y rounded-lg border bg-card shadow-sm">
            {items.map((a) => (
              <details key={a.id} className="group px-4 py-3">
                <summary className="cursor-pointer list-none font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    {a.question}
                    <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
                  </span>
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {a.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ))}

      {articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No FAQ articles yet. Run <code className="text-xs">npm run db:seed</code> to load defaults.
        </p>
      ) : null}
    </div>
  );
}
