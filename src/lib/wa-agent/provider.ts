import type { WAProviderInterface, WAProvider } from "./types";
import { EvolutionProvider } from "./providers/evolution";
import { MetaProvider } from "./providers/meta";

const providers: Record<WAProvider, WAProviderInterface> = {
  evolution: new EvolutionProvider(),
  meta: new MetaProvider(),
};

export function getProvider(type: WAProvider): WAProviderInterface {
  const provider = providers[type];
  if (!provider) throw new Error(`Unknown provider: ${type}`);
  return provider;
}

export { EvolutionProvider } from "./providers/evolution";
export { MetaProvider } from "./providers/meta";
