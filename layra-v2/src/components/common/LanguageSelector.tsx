import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, type Lang } from "@/lib/constants";
import { LANGUAGE_LABELS } from "@/i18n";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSelector() {
  const lang = useUIStore((s) => s.lang);
  const setLang = useUIStore((s) => s.setLang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLang(l as Lang)}
            className={lang === l ? "bg-accent" : ""}
          >
            {LANGUAGE_LABELS[l as Lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
