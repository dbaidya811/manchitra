import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import type { Template } from "@/lib/types";
import { cn } from "@/lib/utils";
import React from "react";

interface TemplateCardProps extends React.HTMLAttributes<HTMLDivElement> {
  template: Template;
  as?: "div" | "a";
}

export const TemplateCard = React.forwardRef<HTMLDivElement, TemplateCardProps>(
  ({ template, className, as = "a", ...props }, ref) => {
    const Comp = as;
    const previewImage = PlaceHolderImages.find(
      (img) => img.id === template.previewImage
    );

    return (
      <Comp
        ref={ref as any}
        className={cn("block cursor-pointer", className)}
        {...props}
      >
        <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
          <CardContent className="p-0">
            {previewImage && (
              <div className="aspect-video overflow-hidden">
                <Image
                  src={previewImage.imageUrl}
                  alt={template.name}
                  width={600}
                  height={400}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  data-ai-hint={previewImage.imageHint}
                />
              </div>
            )}
          </CardContent>
          <CardHeader>
            <CardTitle className="font-headline">{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
        </Card>
      </Comp>
    );
  }
);
TemplateCard.displayName = "TemplateCard";
