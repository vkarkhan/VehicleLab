"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PaywallDialogProps {
  children: React.ReactNode;
}

export function PaywallDialog({ children }: PaywallDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to VehicleLab Pro</DialogTitle>
          <DialogDescription>
            Unlock watermark-free exports, advanced suspension controls, PDF reports, and preset libraries.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button asChild size="lg">
            <a href="/pricing">View plans</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
