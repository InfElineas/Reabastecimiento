import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: { icon: AlertCircle, color: "bg-destructive/10 text-destructive border-destructive/20", badge: "destructive" },
  warning: { icon: AlertTriangle, color: "bg-warning/10 text-warning border-warning/20", badge: "outline" },
  info: { icon: Info, color: "bg-info/10 text-info border-info/20", badge: "secondary" },
};

export default function AlertCard({ title, count, severity = "warning", items = [] }) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={cn("p-4 border", config.color)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <Badge variant={config.badge} className="text-xs">{count}</Badge>
      </div>
      {items.length > 0 && (
        <div className="space-y-1 mt-2">
          {items.slice(0, 3).map((item, i) => (
            <p key={i} className="text-xs opacity-80 truncate">• {item}</p>
          ))}
          {items.length > 3 && (
            <p className="text-xs opacity-60">+{items.length - 3} más</p>
          )}
        </div>
      )}
    </Card>
  );
}