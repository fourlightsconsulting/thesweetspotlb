export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  return (
    <main className="flex flex-1 items-center justify-center">
      <h1 className="text-4xl font-bold">{lang === "ar" ? "ذا سويت سبوت" : "The Sweet Spot"}</h1>
    </main>
  );
}
