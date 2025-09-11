import Link from "next/link";
import { TemplateCard } from "@/components/manchitra/template-card";
import { templates } from "@/lib/templates";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Manchitra
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground sm:text-xl">
          Create beautiful websites in minutes.
          <br />
          Choose a template to get started.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Link href={`/builder/${template.id}`} key={template.id} passHref>
            <TemplateCard as="div" template={template} />
          </Link>
        ))}
      </div>
    </main>
  );
}
