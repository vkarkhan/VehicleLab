"use client";

import { useState } from "react";
import { compressToEncodedURIComponent } from "lz-string";

import type { ModelParams } from "@/lib/sim/core";
import { Button } from "@/components/ui/button";

export type ShareConfig = {
  modelId: string;
  scenarioId: string;
  params: ModelParams;
};

type ShareLinkProps = {
  config: ShareConfig;
};

export const ShareLink = ({ config }: ShareLinkProps) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const payload = compressToEncodedURIComponent(JSON.stringify(config));
      const base = window.location.origin;
      const url = ${base}/sim?p=;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Failed to share preset", error);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      {copied ? "Link copied" : "Share"}
    </Button>
  );
};
