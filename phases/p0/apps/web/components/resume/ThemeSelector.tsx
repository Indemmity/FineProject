"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AVAILABLE_THEMES, type ResumeTheme } from "@jobplatform/shared/lib/pdf/themes";

interface ThemeSelectorProps {
  resumeId: string;
  tailoredText?: string;
  onExport: (theme: string) => Promise<void>;
  isExporting: boolean;
}

export function ThemeSelector({
  resumeId,
  tailoredText,
  onExport,
  isExporting,
}: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeSelect = (theme: ResumeTheme) => {
    onExport(theme.id);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Choose Template & Export
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Resume Template</DialogTitle>
            <DialogDescription>
              Choose from {AVAILABLE_THEMES.length} professional resume templates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Theme Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                  onClick={() => handleThemeSelect(theme)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{theme.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {theme.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {theme.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
