import { MenuCatalog, MenuCatalogSchema, Product } from "../foundation/contracts";

export class CatalogEngine {
  private readonly byProductId: Map<string, Product>;

  constructor(private readonly catalog: MenuCatalog) {
    this.catalog = MenuCatalogSchema.parse(catalog);
    this.byProductId = new Map(this.catalog.products.map((p) => [p.productId, p]));
  }

  getCatalogVersion(): string {
    return this.catalog.catalogVersion;
  }

  getProduct(productId: string): Product | null {
    return this.byProductId.get(productId) ?? null;
  }

  searchByName(input: string): Product[] {
    const lowered = input.toLowerCase();
    return this.catalog.products.filter((p) => p.name.toLowerCase().includes(lowered));
  }

  validateProduct(productId: string): { ok: boolean; reason?: string } {
    const product = this.getProduct(productId);
    if (!product) return { ok: false, reason: `Producto ${productId} inexistente` };
    if (!product.available) return { ok: false, reason: `Producto ${product.name} no disponible` };
    return { ok: true };
  }
}
