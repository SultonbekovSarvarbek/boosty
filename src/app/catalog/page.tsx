import { prisma } from "@/lib/db";
import { Catalog } from "@/components/Catalog";

export default async function CatalogPage({ searchParams }: { searchParams: { cat?: string } }) {
  const [categories, channels] = await Promise.all([
    prisma.category.findMany({ orderBy: { sort: "asc" } }),
    prisma.channel.findMany({
      where: { status: "APPROVED" },
      select: { id: true, username: true, title: true, categoryId: true, subscribers: true, avgViews: true, price: true, isDemo: true },
      orderBy: { avgViews: "desc" },
    }),
  ]);
  const cat = categories.some((c) => c.id === searchParams.cat) ? searchParams.cat! : categories[0]?.id ?? "";
  return (
    <>
      <h1>Выберите каналы</h1>
      <p className="lead">Можно выбрать один или несколько каналов и количество постов. Повторный пост в том же канале обычно набирает чуть меньше.</p>
      <Catalog categories={categories} channels={channels} initialCat={cat} />
    </>
  );
}
