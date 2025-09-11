import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";

interface Feature {
  id: string;
  title: string;
  description: string;
  image: string;
}

export interface FeaturesSectionProps {
  title: string;
  description: string;
  features: Feature[];
}

export default function FeaturesSection({
  title,
  description,
  features,
}: FeaturesSectionProps) {
  return (
    <section className="w-full py-12 md:py-24 bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">
            {title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => {
            const featureImage = PlaceHolderImages.find(
              (img) => img.id === feature.image
            );
            return (
              <Card key={feature.id} className="bg-card text-card-foreground text-center">
                <CardContent className="pt-6">
                  {featureImage && (
                    <Image
                      src={featureImage.imageUrl}
                      alt={feature.title}
                      width={500}
                      height={500}
                      className="rounded-lg aspect-square object-cover mb-6"
                      data-ai-hint={featureImage.imageHint}
                    />
                  )}
                </CardContent>
                <CardHeader>
                  <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
