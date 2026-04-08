import React from "react";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ImageOff } from "lucide-react";

export default function PhotoCoverageChart({ products }) {
  const withPhotos = products.filter((p) => p.fotos && p.fotos.length > 0).length;
  const withoutPhotos = products.length - withPhotos;

  const data = [
    { name: "Con fotos", value: withPhotos, color: "hsl(var(--accent))" },
    { name: "Sin fotos", value: withoutPhotos, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  const pct = products.length > 0 ? Math.round((withPhotos / products.length) * 100) : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <ImageOff size={16} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold">Cobertura de Fotos</h3>
      </div>
      {data.length > 0 ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold">{pct}%</span>
            <span className="text-xs text-muted-foreground">cobertura</span>
          </div>
        </div>
      ) : (
        <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
      )}
      <div className="flex flex-wrap gap-3 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-muted-foreground">{d.name}: <strong className="text-foreground">{d.value}</strong></span>
          </div>
        ))}
      </div>
    </Card>
  );
}