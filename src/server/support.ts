import "server-only";

import { prisma } from "@/db/client";

export type FaqArticleRow = {
  id: string;
  slug: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export async function listFaqArticles(): Promise<FaqArticleRow[]> {
  return prisma.faqArticle.findMany({
    where: { published: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      slug: true,
      category: true,
      question: true,
      answer: true,
      sortOrder: true,
    },
  });
}

export async function getFaqCategories(): Promise<string[]> {
  const rows = await prisma.faqArticle.findMany({
    where: { published: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
    select: { category: true },
  });
  return rows.map((r) => r.category);
}

/** Keyword search fallback when AI is unavailable. */
export function searchFaqs(articles: FaqArticleRow[], query: string): FaqArticleRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/).filter(Boolean);
  return articles
    .map((a) => {
      const haystack = `${a.question} ${a.answer} ${a.category}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0);
      return { article: a, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ article }) => article);
}

/** Compact FAQ context for AI RAG-lite prompt injection. */
export function buildFaqContext(articles: FaqArticleRow[], maxChars = 12_000): string {
  let out = "";
  for (const a of articles) {
    const block = `Q: ${a.question}\nA: ${a.answer}\n\n`;
    if (out.length + block.length > maxChars) break;
    out += block;
  }
  return out.trim();
}
