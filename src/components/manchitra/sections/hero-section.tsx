import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export interface HeroSectionProps {
  headline: string;
  subheadline: string;
  image: string;
  ctaText: string;
}

export default function HeroSection({
  headline,
  subheadline,
  image,
  ctaText,
}: HeroSectionProps) {
  const heroImage = PlaceHolderImages.find((img) => img.id === image);

  return (
    <section className="relative w-full text-foreground bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8 py-12 md:py-24">
          <div className="md:w-1/2 text-center md:text-left">
            <h1 className="font-headline text-4xl md:text-6xl font-bold leading-tight text-foreground">
              {headline}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto md:mx-0">
              {subheadline}
            </p>
            <Button size="lg" className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
              {ctaText}
            </Button>
          </div>
          <div className="md:w-1/2">
            {heroImage && (
              <Image
                src={heroImage.imageUrl}
                alt={headline}
                width={600}
                height={600}
                className="rounded-lg shadow-2xl aspect-square object-cover"
                data-ai-hint={heroImage.imageHint}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
