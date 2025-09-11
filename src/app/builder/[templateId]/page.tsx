"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BuilderSidebar } from "@/components/manchitra/builder-sidebar";
import { WebsitePreview } from "@/components/manchitra/website-preview";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { templates } from "@/lib/templates";
import type { Section, Template } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function BuilderPage({
  params,
}: {
  params: { templateId: string };
}) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [themeColors, setThemeColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadedTemplate = templates.find((t) => t.id === params.templateId);
    if (loadedTemplate) {
      setTemplate(loadedTemplate);
      setSections(loadedTemplate.sections);
    }
  }, [params.templateId]);

  const handleThemeColorChange = (key: string, value: string) => {
    setThemeColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSectionOrderChange = (newSections: Section[]) => {
    setSections(newSections);
  };
  
  const handleSectionPropsChange = (sectionId: string, newProps: any) => {
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === sectionId ? { ...section, props: { ...section.props, ...newProps } } : section
      )
    );
  };

  if (!template) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  const websiteConfig = { template, sections, themeColors };

  return (
    <SidebarProvider>
      <Sidebar>
        <BuilderSidebar
          sections={sections}
          themeColors={themeColors}
          onSectionOrderChange={handleSectionOrderChange}
          onThemeColorChange={handleThemeColorChange}
          onSectionPropsChange={handleSectionPropsChange}
          websiteConfig={websiteConfig}
        />
      </Sidebar>
      <SidebarInset>
        <WebsitePreview
          sections={sections}
          themeColors={themeColors}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
