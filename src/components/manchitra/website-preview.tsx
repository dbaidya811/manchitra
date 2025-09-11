import { Section } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import HeroSection from "./sections/hero-section";
import FeaturesSection from "./sections/features-section";
import CtaSection from "./sections/cta-section";
import FooterSection from "./sections/footer-section";

const sectionComponents = {
  Hero: HeroSection,
  Features: FeaturesSection,
  CTA: CtaSection,
  Footer: FooterSection,
};

interface WebsitePreviewProps {
  sections: Section[];
  themeColors: Record<string, string>;
}

function hexToHsl(hex: string): string | null {
  if (!hex || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
    return null;
  }

  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}


export function WebsitePreview({ sections, themeColors }: WebsitePreviewProps) {

  const style = {
    "--preview-bg": hexToHsl(themeColors.background),
    "--preview-fg": hexToHsl(themeColors.foreground),
    "--preview-card": hexToHsl(themeColors.card),
    "--preview-card-fg": hexToHsl(themeColors.cardForeground),
    "--preview-primary": hexToHsl(themeColors.primary),
    "--preview-primary-fg": hexToHsl(themeColors.primaryForeground),
    "--preview-accent": hexToHsl(themeColors.accent),
    "--preview-accent-fg": hexToHsl(themeColors.accentForeground),
  } as React.CSSProperties;


  return (
    <ScrollArea className="h-full w-full bg-background relative">
       <div
        className="website-preview h-full w-full bg-background"
        style={style}
      >
        {sections.map((section) => {
          const Component = sectionComponents[section.component];
          if (!Component) return null;
          return <Component key={section.id} {...section.props} />;
        })}
      </div>
    </ScrollArea>
  );
}
