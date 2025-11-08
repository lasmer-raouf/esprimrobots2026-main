import { Monitor } from "lucide-react";

export function MobileWarning() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <Monitor className="w-20 h-20 text-primary" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Desktop Required</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Please open this website on a desktop computer or a device with a larger screen for the best experience.
          </p>
        </div>
      </div>
    </div>
  );
}
