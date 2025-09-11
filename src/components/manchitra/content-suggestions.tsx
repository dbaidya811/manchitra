"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSuggestions } from "@/lib/actions";
import { Sparkles, Wand2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea } from "../ui/scroll-area";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Section } from "@/lib/types";

type Suggestions = {
  suggestedText: string[];
  suggestedImages: string[];
};

interface ContentSuggestionsProps {
  sections: Section[];
  onApplySuggestion: (sectionId: string, newProps: any) => void;
}

export function ContentSuggestions({ sections, onApplySuggestion }: ContentSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | undefined>(sections[0]?.id);

  const handleSuggest = async () => {
    setIsLoading(true);
    setSuggestions(null);
    const result = await getSuggestions({
      theme: "Modern and clean",
      designDescription: "A minimalist website with a lot of white space and a focus on typography.",
    });
    if (result.success && result.data) {
      setSuggestions(result.data);
    }
    setIsLoading(false);
  };
  
  const handleApplyText = (text: string) => {
    if(!selectedSection) return;
    const section = sections.find(s => s.id === selectedSection);
    // Simple logic: apply to first available text prop
    if (section?.props.headline) {
      onApplySuggestion(selectedSection, { headline: text });
    } else if (section?.props.title) {
       onApplySuggestion(selectedSection, { title: text });
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          Get AI Suggestions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>AI Content Suggestions</DialogTitle>
          <DialogDescription>
            Get text and image ideas for your website. Click to apply.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button onClick={handleSuggest} disabled={isLoading}>
            <Wand2 className="mr-2 h-4 w-4" />
            {isLoading ? "Generating..." : "Generate New Suggestions"}
          </Button>

          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          )}

          {suggestions && (
            <div className="space-y-6">
              <div>
                <Label>Apply to Section</Label>
                 <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                        {sections.map(section => (
                            <SelectItem key={section.id} value={section.id}>{section.component} ({section.id})</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Text Snippets</h4>
                <div className="space-y-2">
                  {suggestions.suggestedText.map((text, i) => (
                    <div
                      key={i}
                      onClick={() => handleApplyText(text)}
                      className="cursor-pointer rounded-md border p-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Image Ideas</h4>
                <div className="grid grid-cols-3 gap-4">
                  {suggestions.suggestedImages.map((img, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-md">
                      <Image
                        src={img}
                        alt={`Suggested image ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
