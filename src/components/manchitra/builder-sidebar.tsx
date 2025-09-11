"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUp,
  ArrowDown,
  Palette,
  Layout,
  Sparkles,
  Download,
  Github,
  Home,
} from "lucide-react";
import type { Section } from "@/lib/types";
import { ContentSuggestions } from "./content-suggestions";
import { exportWebsite } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ScrollArea } from "../ui/scroll-area";

interface BuilderSidebarProps {
  sections: Section[];
  themeColors: Record<string, string>;
  onSectionOrderChange: (sections: Section[]) => void;
  onThemeColorChange: (key: string, value: string) => void;
  onSectionPropsChange: (sectionId: string, newProps: any) => void;
  websiteConfig: any;
}

const themeColorConfig = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "primary", label: "Primary" },
  { key: "primaryForeground", label: "Primary Text" },
  { key: "accent", label: "Accent" },
  { key: "accentForeground", label: "Accent Text" },
  { key: "card", label: "Card" },
  { key: "cardForeground", label: "Card Text" },
];

export function BuilderSidebar({
  sections,
  themeColors,
  onSectionOrderChange,
  onThemeColorChange,
  websiteConfig,
  onSectionPropsChange,
}: BuilderSidebarProps) {
  const { toast } = useToast();

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const newSections = [...sections];
    const [movedSection] = newSections.splice(index, 1);
    newSections.splice(newIndex, 0, movedSection);
    onSectionOrderChange(newSections);
  };

  const handleExport = async () => {
    const result = await exportWebsite(websiteConfig);
    toast({
      title: result.success ? "Export Initiated" : "Export Failed",
      description: result.message,
    });
  };

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-2xl font-semibold">Manchitra</h2>
          <SidebarTrigger />
        </div>
        <p className="text-sm text-muted-foreground">Website Builder</p>
      </SidebarHeader>
      <Separator />
      <ScrollArea className="flex-grow">
        <SidebarContent className="p-0">
          <Accordion
            type="multiple"
            defaultValue={["theme", "layout"]}
            className="w-full"
          >
            <AccordionItem value="theme">
              <AccordionTrigger className="px-4 text-base">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 px-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Colors</h4>
                  {themeColorConfig.map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-3 items-center gap-2">
                      <Label htmlFor={key} className="text-sm col-span-1">{label}</Label>
                      <Input
                        id={key}
                        type="color"
                        value={themeColors[key] || ""}
                        onChange={(e) => onThemeColorChange(key, e.target.value)}
                        className="p-1 h-8 col-span-2"
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="layout">
              <AccordionTrigger className="px-4 text-base">
                <div className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Layout
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 px-4">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <span className="text-sm font-medium">
                      {section.component}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleMoveSection(index, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleMoveSection(index, "down")}
                        disabled={index === sections.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="content">
              <AccordionTrigger className="px-4 text-base">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Content
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <ContentSuggestions onApplySuggestion={onSectionPropsChange} sections={sections} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SidebarContent>
      </ScrollArea>
      <Separator />
      <SidebarFooter className="p-4 space-y-2">
        <Button onClick={handleExport} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Export Website
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Templates
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href="https://github.com/firebase/studio" target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
