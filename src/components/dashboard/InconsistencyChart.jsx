import React from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle } from "lucide-react";

export default function InconsistencyChart({ offers }) {
  const data = [
    {
      name: "Inconsistentes",
      value: offers.filter((o) => o.existencia_fisica !== (o.stock_reserva || 0) + (o.stock_tienda || 0)).length,
      color: "hsl(var(--destructive))",
    },
    {
      name: "Sin stock activas",
      value: offers.filter((o) => !o.is_dead && o.existencia_fisica === 0).length,
      color: "hsl(var(--warning))",
    },
    {
      name: "Solo reserva",
      value: offers.filter((o) => o.stock_reserva > 0 && o.stock_tienda === 0).length,
      color: "hsl(var(--chart-3))",
    },
    {
      name: "Diff catálogo",
      value: offers.filter((o) => o.has_catalog_diff).length,
      color: "hsl(var(--chart-4))",
    },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning" />
          <h3 className="text-sm font-semibold">Alertas de Inconsistencia</h3>
        </div>
        <span className="text-xs text-muted-foreground">{total} problemas detectados</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}