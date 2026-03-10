'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Service } from '@/lib/types';
import {
  Plus, Pencil, Trash2, ArrowLeft, Save, X, Image,
  ChevronDown, ChevronRight, Eye, EyeOff, Utensils,
  Tag, Clock, DollarSign, FolderPlus, AlertTriangle, SlidersHorizontal,
  Upload, GripVertical,
} from 'lucide-react';
import Link from 'next/link';
import { NICHE_TEMPLATES } from '@/lib/templates/registry';
import MenuImportModal, { type ScrapedItem } from './menu-import';

// ── Default categories per niche ────────────────────────────────
const RESTAURANT_CATEGORIES = [
  'Entradas', 'Platos fuertes', 'Pastas', 'Ensaladas',
  'Postres', 'Bebidas', 'Bebidas alcoholicas', 'Para ninos',
];

const NICHE_CATEGORY_MAP: Record<string, string[]> = {
  restaurant: RESTAURANT_CATEGORIES,
  spa: ['Faciales', 'Corporales', 'Manos y pies', 'Masajes', 'Paquetes'],
  gym: ['Clases grupales', 'Entrenamiento personal', 'Horario abierto'],
};

// ── Niche type helper ───────────────────────────────────────────
type NicheMode = 'menu' | 'services';

function getNicheMode(template: string | null): NicheMode {
  if (template === 'restaurant') return 'menu';
  return 'services';
}

export default function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [services, setServices] = useState<Service[]>([]);
  const [businessId, setBusinessId] = useState<string>('');
  const [businessName, setBusinessName] = useState('');
  const [businessTemplate, setBusinessTemplate] = useState<string | null>(null);
  const [businessColor, setBusinessColor] = useState('#3b82f6');
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDuration, setFormDuration] = useState('15');
  const [formCategory, setFormCategory] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formAllergens, setFormAllergens] = useState('');
  const [formModifiers, setFormModifiers] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);

  // View state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [dragCat, setDragCat] = useState<string | null>(null);

  const nicheMode = getNicheMode(businessTemplate);
  const tpl = businessTemplate ? NICHE_TEMPLATES[businessTemplate] : null;
  const labels = tpl?.labels || { service: 'Servicio', service_plural: 'Servicios' };

  useEffect(() => {
    loadData();
  }, [slug]);

  async function loadData() {
    const { data: biz } = await supabase
      .from('businesses')
      .select('id, name, template, branding')
      .eq('slug', slug)
      .single();

    if (!biz) return;
    setBusinessId(biz.id);
    setBusinessName(biz.name);
    setBusinessTemplate(biz.template || null);
    setBusinessColor(biz.branding?.color || '#3b82f6');
    setCategoryOrder(biz.branding?.category_order || []);

    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', biz.id)
      .order('sort_order');

    setServices(data || []);
    setLoading(false);
  }

  // ── Categories derived from services + defaults, respecting saved order ──
  const existingCategories = [...new Set(services.map(s => s.category).filter(Boolean))] as string[];
  const defaultCategories = NICHE_CATEGORY_MAP[businessTemplate || ''] || [];
  const rawCategories = [...new Set([...defaultCategories, ...existingCategories])];
  // Apply saved order: ordered ones first, then any new ones not yet in the order
  const allCategories = categoryOrder.length > 0
    ? [...categoryOrder.filter(c => rawCategories.includes(c)), ...rawCategories.filter(c => !categoryOrder.includes(c))]
    : rawCategories;
  const uncategorized = services.filter(s => !s.category);

  function resetForm() {
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormDuration('15');
    setFormCategory('');
    setFormImageUrl('');
    setFormAllergens('');
    setFormModifiers('');
    setEditing(null);
    setShowAdd(false);
    setShowNewCategory(false);
    setNewCategoryName('');
  }

  function startEdit(service: Service) {
    setFormName(service.name);
    setFormDesc(service.description || '');
    setFormPrice(service.price?.toString() || '');
    setFormDuration(service.avg_duration_min.toString());
    setFormCategory(service.category || '');
    setFormImageUrl(service.image_url || '');
    setFormAllergens(service.allergens || '');
    setFormModifiers(service.modifiers || '');
    setEditing(service.id);
    setShowAdd(false);
  }

  function startAddInCategory(category: string) {
    resetForm();
    setFormCategory(category);
    setShowAdd(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);

    const finalCategory = showNewCategory && newCategoryName.trim()
      ? newCategoryName.trim()
      : formCategory || null;

    const payload: Record<string, unknown> = {
      business_id: businessId,
      name: formName.trim(),
      description: formDesc.trim() || null,
      price: formPrice ? parseFloat(formPrice) : null,
      avg_duration_min: parseInt(formDuration) || 15,
      sort_order: services.length,
      category: finalCategory,
      image_url: formImageUrl.trim() || null,
      allergens: formAllergens.trim() || null,
      modifiers: formModifiers.trim() || null,
    };

    if (editing) {
      await supabase.from('services').update(payload).eq('id', editing);
    } else {
      await supabase.from('services').insert(payload);
    }

    resetForm();
    await loadData();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este elemento?')) return;
    await supabase.from('services').delete().eq('id', id);
    await loadData();
  }

  async function toggleActive(service: Service) {
    await supabase.from('services').update({ is_active: !service.is_active }).eq('id', service.id);
    await loadData();
  }

  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const saveCategoryOrder = useCallback(async (newOrder: string[]) => {
    setCategoryOrder(newOrder);
    const { data: biz } = await supabase
      .from('businesses')
      .select('branding')
      .eq('id', businessId)
      .single();
    const branding = biz?.branding || {};
    await supabase
      .from('businesses')
      .update({ branding: { ...branding, category_order: newOrder } })
      .eq('id', businessId);
  }, [businessId, supabase]);

  function handleCatDragStart(cat: string) {
    setDragCat(cat);
  }

  function handleCatDragOver(e: React.DragEvent, overCat: string) {
    e.preventDefault();
    if (!dragCat || dragCat === overCat) return;
    const from = allCategories.indexOf(dragCat);
    const to = allCategories.indexOf(overCat);
    if (from === -1 || to === -1) return;
    const reordered = [...allCategories];
    reordered.splice(from, 1);
    reordered.splice(to, 0, dragCat);
    setCategoryOrder(reordered);
  }

  function handleCatDrop() {
    if (dragCat) {
      saveCategoryOrder(allCategories);
    }
    setDragCat(null);
  }

  async function handleImport(items: ScrapedItem[]) {
    setImporting(true);
    const rows = items.map((item, idx) => ({
      business_id: businessId,
      name: item.name,
      description: item.description || null,
      price: item.price,
      avg_duration_min: 15,
      is_active: true,
      sort_order: services.length + idx,
      category: item.category || null,
      image_url: item.image_url || null,
      allergens: item.allergens || null,
      modifiers: item.modifiers || null,
    }));

    // Bulk insert
    await supabase.from('services').insert(rows);
    await loadData();
    setShowImport(false);
    setImporting(false);
  }

  const isFormOpen = showAdd || !!editing;
  const activeCount = services.filter(s => s.is_active).length;
  const totalCount = services.length;

  // ══════════════ RENDER ══════════════

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/admin/${slug}`} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {nicheMode === 'menu' ? 'Menu' : labels.service_plural}
              </h1>
              <p className="text-xs text-gray-500">
                {businessName} · {activeCount} activos / {totalCount} total
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isFormOpen && nicheMode === 'menu' && (
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Importar carta
              </button>
            )}
            {!isFormOpen && (
              <button
                onClick={() => { resetForm(); setShowAdd(true); }}
                className="flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: businessColor }}
              >
                <Plus className="w-4 h-4" />
                {nicheMode === 'menu' ? 'Agregar platillo' : `Agregar ${labels.service.toLowerCase()}`}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* ── Add/Edit Form ── */}
        {isFormOpen && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-2" style={{ borderColor: `${businessColor}30` }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                {nicheMode === 'menu' ? <Utensils className="w-4 h-4" /> : null}
                {editing
                  ? (nicheMode === 'menu' ? 'Editar platillo' : `Editar ${labels.service.toLowerCase()}`)
                  : (nicheMode === 'menu' ? 'Nuevo platillo' : `Nuevo ${labels.service.toLowerCase()}`)
                }
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {nicheMode === 'menu' ? 'Nombre del platillo *' : `Nombre del ${labels.service.toLowerCase()} *`}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={nicheMode === 'menu' ? 'Ej: Pizza Margherita' : 'Ej: Corte clasico'}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Descripcion {nicheMode === 'menu' ? '(ingredientes, preparacion)' : '(opcional)'}
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder={nicheMode === 'menu' ? 'Tomate, mozzarella, albahaca fresca...' : 'Descripcion opcional'}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                />
              </div>

              {/* Category (for menu mode or if categories exist) */}
              {(nicheMode === 'menu' || allCategories.length > 0) && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Categoria
                  </label>
                  {!showNewCategory ? (
                    <div className="flex gap-2">
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                      >
                        <option value="">Sin categoria</option>
                        {allCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewCategory(true)}
                        className="px-3 py-2 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-700 text-sm flex items-center gap-1"
                      >
                        <FolderPlus className="w-4 h-4" />
                        Nueva
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nombre de la nueva categoria"
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                        className="px-3 py-2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Price + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Precio
                  </label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {nicheMode === 'menu' ? 'Tiempo prep. (min)' : 'Duracion (min)'}
                  </label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    min="1"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                </div>
              </div>

              {/* Image URL (menu mode) */}
              {nicheMode === 'menu' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Image className="w-3 h-3" />
                    Imagen URL (opcional)
                  </label>
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                  {formImageUrl && (
                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                      <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              )}

              {/* Allergens (menu mode) */}
              {nicheMode === 'menu' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Alergenos (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={formAllergens}
                    onChange={(e) => setFormAllergens(e.target.value)}
                    placeholder="gluten, lacteos, huevo, frutos secos..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                  {formAllergens && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formAllergens.split(',').map((a, i) => a.trim()).filter(Boolean).map((a, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modifiers (menu mode) */}
              {nicheMode === 'menu' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" />
                    Modificadores (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={formModifiers}
                    onChange={(e) => setFormModifiers(e.target.value)}
                    placeholder="sin cebolla, extra queso, sin picante..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">El bot mostrara estas opciones al cliente cuando pida este platillo</p>
                  {formModifiers && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formModifiers.split(',').map((m) => m.trim()).filter(Boolean).map((m, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!formName.trim() || saving}
                className="w-full py-3 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
                style={{ backgroundColor: businessColor }}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : services.length === 0 && !isFormOpen ? (
          <EmptyState
            nicheMode={nicheMode}
            labels={labels}
            color={businessColor}
            onAdd={() => setShowAdd(true)}
          />
        ) : nicheMode === 'menu' ? (
          /* ══════════════ RESTAURANT MENU VIEW ══════════════ */
          <div className="space-y-4">
            {/* Categorized sections */}
            {allCategories.map(cat => {
              const items = services.filter(s => s.category === cat);
              if (items.length === 0) return null;
              const isCollapsed = collapsedCategories.has(cat);
              const activeInCat = items.filter(s => s.is_active).length;

              return (
                <div
                  key={cat}
                  className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${dragCat === cat ? 'opacity-50 scale-[0.98]' : ''}`}
                  draggable
                  onDragStart={() => handleCatDragStart(cat)}
                  onDragOver={(e) => handleCatDragOver(e, cat)}
                  onDrop={handleCatDrop}
                  onDragEnd={() => setDragCat(null)}
                >
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing" />
                      {isCollapsed
                        ? <ChevronRight className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                      <h3 className="font-semibold text-gray-900">{cat}</h3>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {activeInCat}/{items.length}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); startAddInCategory(cat); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title={`Agregar a ${cat}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </button>

                  {/* Items */}
                  {!isCollapsed && (
                    <div className="border-t border-gray-100">
                      {items.map(item => (
                        <MenuItemRow
                          key={item.id}
                          item={item}
                          color={businessColor}
                          onEdit={() => startEdit(item)}
                          onDelete={() => handleDelete(item.id)}
                          onToggle={() => toggleActive(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized items */}
            {uncategorized.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100">
                  <h3 className="font-semibold text-gray-500">Sin categoria</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {uncategorized.length}
                  </span>
                </div>
                {uncategorized.map(item => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    color={businessColor}
                    onEdit={() => startEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                    onToggle={() => toggleActive(item)}
                  />
                ))}
              </div>
            )}

            {/* Empty categories as placeholders */}
            {allCategories
              .filter(cat => services.filter(s => s.category === cat).length === 0)
              .map(cat => (
                <div
                  key={cat}
                  className={`bg-white/60 rounded-2xl border-2 border-dashed border-gray-200 p-5 flex items-center justify-between ${dragCat === cat ? 'opacity-50' : ''}`}
                  draggable
                  onDragStart={() => handleCatDragStart(cat)}
                  onDragOver={(e) => handleCatDragOver(e, cat)}
                  onDrop={handleCatDrop}
                  onDragEnd={() => setDragCat(null)}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing" />
                    <span className="text-sm text-gray-400">{cat}</span>
                  </div>
                  <button
                    onClick={() => startAddInCategory(cat)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar
                  </button>
                </div>
              ))
            }
          </div>
        ) : (
          /* ══════════════ GENERIC SERVICES LIST ══════════════ */
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className={`bg-white rounded-xl p-4 shadow-sm flex items-center justify-between ${
                  !service.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    {!service.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactivo</span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{service.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    {service.price != null && <span>${service.price}</span>}
                    <span>{service.avg_duration_min} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(service)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      service.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {service.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    onClick={() => startEdit(service)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import modal */}
      <MenuImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        color={businessColor}
      />
    </div>
  );
}

// ── Menu Item Row (restaurant) ──────────────────────────────────

function MenuItemRow({
  item,
  color,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: Service;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${!item.is_active ? 'opacity-40' : ''}`}>
      {/* Image */}
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.name}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl" style={{ backgroundColor: `${color}10` }}>
          <Utensils className="w-5 h-5" style={{ color: `${color}80` }} />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
          {!item.is_active && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">Oculto</span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {item.price != null && (
            <span className="text-sm font-semibold" style={{ color }}>${item.price}</span>
          )}
          {item.avg_duration_min > 0 && (
            <span className="text-xs text-gray-400">{item.avg_duration_min} min</span>
          )}
        </div>
        {/* Allergens + Modifiers badges */}
        {(item.allergens || item.modifiers) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.allergens?.split(',').map((a, i) => (
              <span key={`a-${i}`} className="px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                {a.trim()}
              </span>
            ))}
            {item.modifiers && (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-500 rounded-full border border-blue-100">
                {item.modifiers.split(',').length} modificadores
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          title={item.is_active ? 'Ocultar del menu' : 'Mostrar en menu'}
        >
          {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────

function EmptyState({
  nicheMode,
  labels,
  color,
  onAdd,
}: {
  nicheMode: NicheMode;
  labels: { service: string; service_plural: string };
  color: string;
  onAdd: () => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        {nicheMode === 'menu'
          ? <Utensils className="w-7 h-7" style={{ color }} />
          : <Tag className="w-7 h-7" style={{ color }} />
        }
      </div>
      <p className="text-gray-500 mb-1 font-medium">
        {nicheMode === 'menu' ? 'Tu menu esta vacio' : `No tienes ${labels.service_plural.toLowerCase()} aun`}
      </p>
      <p className="text-gray-400 text-sm mb-6">
        {nicheMode === 'menu'
          ? 'Agrega platillos organizados por categoria para que tus clientes puedan ver el menu y hacer pedidos por WhatsApp.'
          : `Agrega ${labels.service_plural.toLowerCase()} para que tus clientes puedan elegir al tomar turno.`
        }
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        style={{ backgroundColor: color }}
      >
        {nicheMode === 'menu' ? 'Agregar primer platillo' : `Agregar ${labels.service.toLowerCase()}`}
      </button>
    </div>
  );
}
