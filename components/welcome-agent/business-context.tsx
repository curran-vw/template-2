"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, RefreshCw, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/use-workspace";
import { crawlWebsite } from "@/app/actions/crawl";

interface BusinessContextProps {
  website: string;
  purpose: string;
  additionalContext?: string;
  websiteSummary?: string;
  onWebsiteChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onAdditionalContextChange: (value: string) => void;
  onWebsiteSummaryChange: (summary: string) => void;
  agentId?: string;
  validationError?: string;
  showTooltip?: boolean;
  onTooltipOpenChange?: (open: boolean) => void;
}

export function BusinessContext({
  website,
  purpose,
  additionalContext,
  websiteSummary: initialWebsiteSummary,
  onWebsiteChange,
  onPurposeChange,
  onAdditionalContextChange,
  onWebsiteSummaryChange,
  agentId,
  validationError,
  showTooltip,
  onTooltipOpenChange,
}: BusinessContextProps) {
  const { workspace } = useWorkspace();
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<"idle" | "success" | "failed">("idle");
  const [showAdditionalContext, setShowAdditionalContext] = useState(!!additionalContext);
  const [websiteSummary, setWebsiteSummary] = useState(initialWebsiteSummary || "");
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);

  useEffect(() => {
    if (initialWebsiteSummary) {
      setWebsiteSummary(initialWebsiteSummary);
      setCrawlStatus("success");
    }
  }, [initialWebsiteSummary]);

  useEffect(() => {
    setShowAdditionalContext(!!additionalContext);
  }, [additionalContext]);

  const handleCrawl = async () => {
    if (!website) return;

    // Normalize the URL
    let normalizedUrl = website;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    setIsCrawling(true);

    const { success, error, summary } = await crawlWebsite({
      url: website,
      workspaceId: workspace?.id!,
      agentId,
    });

    if (success) {
      toast.success("Success", {
        description: success,
      });
      setCrawlStatus("success");
      setWebsiteSummary(summary);
      onWebsiteSummaryChange(summary);
    } else if (error) {
      setCrawlStatus("failed");
      toast.error("Error", {
        description: error,
      });
    }
    setIsCrawling(false);
  };

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label className='text-sm font-medium'>Website URL</Label>
        <p className='text-xs text-muted-foreground'>
          We will crawl this website to get more information about your business
        </p>
        <div className='flex gap-2'>
          <Input
            placeholder='https://example.com'
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
            className='flex-1'
          />
          <Button
            onClick={handleCrawl}
            disabled={!website || isCrawling}
            variant={crawlStatus === "failed" ? "destructive" : "outline"}
            className='h-9 min-w-[90px] text-xs'
          >
            {isCrawling ? (
              <>
                <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                Crawling...
              </>
            ) : crawlStatus === "success" ? (
              <>
                <Check className='mr-1 h-3 w-3' />
                Crawled
              </>
            ) : crawlStatus === "failed" ? (
              <>
                <RefreshCw className='mr-1 h-3 w-3' />
                Failed, try again
              </>
            ) : (
              "Crawl Page"
            )}
          </Button>
        </div>
      </div>

      <div className='space-y-2'>
        <Label className='text-sm font-medium'>What are people signing up for?</Label>
        <TooltipProvider>
          <Tooltip open={showTooltip}>
            <TooltipTrigger asChild>
              <Textarea
                placeholder="Describe what users are signing up for (e.g., 'Our monthly newsletter about AI trends')"
                value={purpose}
                onChange={(e) => onPurposeChange(e.target.value)}
                className={cn(
                  "min-h-[100px]",
                  validationError && "border-destructive focus-visible:ring-destructive",
                )}
              />
            </TooltipTrigger>
            {validationError && <TooltipContent>{validationError}</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className='space-y-2'>
        <div className='flex items-center'>
          <Checkbox
            id='show-additional-context'
            checked={showAdditionalContext}
            onCheckedChange={(checked) => setShowAdditionalContext(checked === true)}
          />
          <Label htmlFor='show-additional-context' className='ml-2 text-sm font-medium'>
            Add additional context
          </Label>
        </div>
        {showAdditionalContext && (
          <Textarea
            placeholder='Any other relevant information about your business'
            value={additionalContext}
            onChange={(e) => onAdditionalContextChange(e.target.value)}
            className='mt-2 min-h-[100px]'
          />
        )}
      </div>

      {/* Only show website summary after successful crawl */}
      {crawlStatus === "success" && websiteSummary && (
        <div className='space-y-2'>
          <button
            onClick={() => setIsSummaryCollapsed((prev) => !prev)}
            className='flex w-full items-center gap-2 text-sm font-medium transition-colors hover:text-muted-foreground'
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", !isSummaryCollapsed && "rotate-90")}
            />
            Website Summary
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-in-out",
              isSummaryCollapsed ? "max-h-0 opacity-0" : "max-h-[300px] opacity-100",
            )}
          >
            <Textarea value={websiteSummary} readOnly className='min-h-[100px] bg-muted/50' />
          </div>
        </div>
      )}
    </div>
  );
}
