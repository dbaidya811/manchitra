import { Button } from "@/components/ui/button";

export interface CtaSectionProps {
  title: string;
  description: string;
  ctaText: string;
}

export default function CtaSection({
  title,
  description,
  ctaText,
}: CtaSectionProps) {
  return (
    <section className="w-full py-12 md:py-24 bg-background text-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center bg-accent text-accent-foreground p-8 md:p-12 rounded-lg shadow-lg">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">
            {title}
          </h2>
          <p className="mt-4 text-lg max-w-xl mx-auto">
            {description}
          </p>
          <Button size="lg" className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
            {ctaText}
          </Button>
        </div>
      </div>
    </section>
  );
}
