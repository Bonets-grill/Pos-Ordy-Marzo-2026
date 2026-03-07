import { useEffect, useState } from "react";
import { DollarSign, Save, Check, Search } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/core/supabase/client";
import { SYSTEM_CATALOG } from "@/lib/systemCatalog";
import { getTemplateConfig } from "@/lib/templates/configs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PriceOverride {
  systemId: string;
  price: number;
  monthlyFee: number;
}

export function PriceManager() {
  const { t } = useTranslation();
  const [overrides, setOverrides] = useState<Record<string, PriceOverride>>({});
  const [localPrices, setLocalPrices] = useState<Record<string, { price: string; monthlyFee: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPrices();
  }, []);

  async function loadPrices() {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .like("key", "price_%");

    const map: Record<string, PriceOverride> = {};
    if (data) {
      for (const row of data) {
        try {
          const parsed = JSON.parse(row.value);
          const systemId = row.key.replace("price_", "");
          map[systemId] = { systemId, price: parsed.price, monthlyFee: parsed.monthlyFee };
        } catch { /* ignore */ }
      }
    }
    setOverrides(map);

    // Initialize local state
    const local: Record<string, { price: string; monthlyFee: string }> = {};
    for (const sys of SYSTEM_CATALOG) {
      const ov = map[sys.id];
      local[sys.id] = {
        price: String(ov?.price ?? sys.price),
        monthlyFee: String(ov?.monthlyFee ?? sys.monthlyFee),
      };
    }
    setLocalPrices(local);
  }

  async function savePrice(systemId: string) {
    const local = localPrices[systemId];
    if (!local) return;

    const price = Math.max(0, parseInt(local.price) || 0);
    const monthlyFee = Math.max(0, parseInt(local.monthlyFee) || 0);

    setSaving(systemId);
    await supabase
      .from("platform_settings")
      .upsert(
        { key: `price_${systemId}`, value: JSON.stringify({ price, monthlyFee }) },
        { onConflict: "key" }
      );

    setOverrides((prev) => ({
      ...prev,
      [systemId]: { systemId, price, monthlyFee },
    }));
    setSaving(null);
    setSaved(systemId);
    setTimeout(() => setSaved(null), 2000);
  }

  function updateLocal(systemId: string, field: "price" | "monthlyFee", value: string) {
    setLocalPrices((prev) => ({
      ...prev,
      [systemId]: { ...prev[systemId], [field]: value },
    }));
  }

  function hasChanges(systemId: string): boolean {
    const local = localPrices[systemId];
    const catalog = SYSTEM_CATALOG.find((s) => s.id === systemId);
    const ov = overrides[systemId];
    if (!local || !catalog) return false;
    const currentPrice = ov?.price ?? catalog.price;
    const currentMonthly = ov?.monthlyFee ?? catalog.monthlyFee;
    return (
      parseInt(local.price) !== currentPrice ||
      parseInt(local.monthlyFee) !== currentMonthly
    );
  }

  const filtered = SYSTEM_CATALOG.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.id.includes(q) ||
      t(`catalog.sys.${s.id}`).toLowerCase().includes(q) ||
      s.category.includes(q)
    );
  });

  const totalRevenuePotential = SYSTEM_CATALOG.reduce((sum, s) => {
    const ov = overrides[s.id];
    return sum + (ov?.price ?? s.price);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-jade-500" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("admin.priceManager")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("admin.priceManagerDesc")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">${totalRevenuePotential.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{t("admin.catalogValue")}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("admin.searchSystems")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Price table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.systemPrices")} ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    {t("prices.system")}
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    {t("prices.category")}
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    {t("prices.status")}
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-32">
                    {t("prices.price")}
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-32">
                    {t("prices.monthly")}
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 w-24">
                    {t("prices.action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sys) => {
                  const local = localPrices[sys.id];
                  const hasTemplate = !!getTemplateConfig(sys.id);
                  const changed = hasChanges(sys.id);
                  const isOverridden = !!overrides[sys.id];

                  return (
                    <tr key={sys.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {t(`catalog.sys.${sys.id}`)}
                          </span>
                          {isOverridden && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              custom
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{sys.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground capitalize">
                          {t(`catalog.cat.${sys.category}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {hasTemplate ? (
                          <Badge className="bg-jade-500/10 text-jade-600 text-[10px]">
                            Template
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Builder
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={local?.price ?? ""}
                          onChange={(e) => updateLocal(sys.id, "price", e.target.value)}
                          className="h-8 text-sm w-28"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={local?.monthlyFee ?? ""}
                          onChange={(e) => updateLocal(sys.id, "monthlyFee", e.target.value)}
                          className="h-8 text-sm w-28"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant={changed ? "default" : "ghost"}
                          className={`h-8 gap-1 ${changed ? "bg-jade-600 hover:bg-jade-700 text-white" : ""}`}
                          disabled={!changed || saving === sys.id}
                          onClick={() => savePrice(sys.id)}
                        >
                          {saved === sys.id ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
