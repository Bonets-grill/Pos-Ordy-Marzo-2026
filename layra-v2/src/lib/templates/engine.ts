// Template Engine — generates complete, working HTML from a SystemConfig
// All navigation, modals, search, filtering, CRUD, charts, export are pre-built and tested.

import type { SystemConfig, ModuleConfig, ColumnConfig, I18nString } from "./types";
import { COMMON_I18N, LANG_LABELS, TEMPLATE_LANGS, translateBadge, type TemplateLang } from "./i18n";

// Resolve an I18nString to the correct language
function r(s: I18nString | undefined, lang: TemplateLang): string {
  if (!s) return "";
  if (typeof s === "string") return s;
  return s[lang] || s.es || s.en || "";
}

// Get a common UI string
function ui(key: string, lang: TemplateLang): string {
  return COMMON_I18N[lang]?.[key] || COMMON_I18N.es[key] || key;
}

// ─── SVG Icons library ───
const ICONS: Record<string, string> = {
  dashboard: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>',
  users: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>',
  calendar: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
  clipboard: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>',
  pill: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-2.828 0l-5.172 5.172a4 4 0 11-5.656-5.656l5.172-5.172a2 2 0 112.828 2.828L8.6 17.772a1 1 0 101.414 1.414l5.172-5.172a2 2 0 000-2.828z"/>',
  dollar: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  video: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>',
  building: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>',
  settings: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
  search: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
  plus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>',
  x: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>',
  eye: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>',
  edit: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>',
  trash: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
  heart: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>',
  chart: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>',
  mail: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
  phone: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>',
  star: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
  truck: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>',
  home: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
  tag: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>',
  clock: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  file: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
  shield: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
  tool: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0"/>',
  book: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>',
  briefcase: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
  camera: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>',
  code: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
  database: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>',
  filter: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>',
  flag: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z"/>',
  globe: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>',
  headphones: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 18v-6a9 9 0 0118 0v6"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>',
  image: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
  key: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>',
  layers: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>',
  link: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>',
  lock: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>',
  mic: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>',
  monitor: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
  package: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
  pen: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>',
  percent: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>',
  play: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  printer: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>',
  refresh: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
  save: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>',
  send: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>',
  server: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>',
  share: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>',
  shopping: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>',
  sidebar: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"/>',
  sliders: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>',
  target: '<circle cx="12" cy="12" r="10" stroke-width="2"/><circle cx="12" cy="12" r="6" stroke-width="2"/><circle cx="12" cy="12" r="2" stroke-width="2"/>',
  trending: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>',
  upload: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>',
  grid: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>',
  list: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  map: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>',
  bell: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>',
  zap: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>',
  download: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>',
  chevronDown: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>',
  logout: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>',
  thermometer: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  toggle: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>',
  umbrella: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v2m0 16v2m-8-8H4m16 0h2M6.343 6.343l-1.414-1.414m12.728 0l1.414-1.414M6.343 17.657l-1.414 1.414m12.728 0l1.414 1.414"/>',
  unlock: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>',
  volume: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>',
  wifi: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"/>',
  speaker: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>',
  "credit-card": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>',
  scissors: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L7.05 21.192m9.9-9.9L21.192 7.05M3.808 3.808l4.243 4.243m5.657 5.657l4.243 4.243M6.343 6.343a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243zm11.314 11.314a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243z"/>',
};

function svgIcon(name: string, cls = "w-5 h-5"): string {
  const path = ICONS[name] || ICONS.dashboard;
  return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${path}</svg>`;
}

// ─── Badge color helper ───
function badgeClass(color: string): string {
  const map: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    gray: "bg-gray-100 text-gray-700",
    orange: "bg-orange-100 text-orange-700",
    pink: "bg-pink-100 text-pink-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return map[color] || map.gray;
}

// ─── Dashboard chart data generator ───
function generateChartBars(brandColor: string, lang: TemplateLang): string {
  const dayKeys = ["ui.mon", "ui.tue", "ui.wed", "ui.thu", "ui.fri", "ui.sat", "ui.sun"];
  const days = dayKeys.map((k) => ui(k, lang));
  return days.map((d) => {
    const h = 20 + Math.floor(Math.random() * 60);
    return `<div class="flex flex-col items-center gap-1 flex-1">
      <div class="w-full rounded-t-md transition-all hover:opacity-80" style="height:${h}px;background:${brandColor}"></div>
      <span class="text-[10px] text-gray-400">${d}</span>
    </div>`;
  }).join("");
}

// Escape string for safe use inside JS single-quoted strings
function jsStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// ─── Main render function ───
export function renderSystemHtml(config: SystemConfig, lang: TemplateLang = "es"): string {
  const allModules = [...config.modules, ...(config.tenantAdmin?.modules || []), ...(config.superAdmin?.modules || [])];
  const firstModId = allModules[0]?.id || "dashboard";
  const totalRows = allModules.reduce((acc, m) => acc + m.table.rows.length, 0);
  const totalModules = allModules.length;
  const hasDashboard = allModules[0]?.id === "dashboard";
  const systemName = r(config.name, lang);

  // Build module label map resolved in current lang
  const modLabelMap: Record<string, string> = {};
  for (const m of allModules) modLabelMap[m.id] = r(m.label, lang);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
  <title>${systemName} — ${r(config.subtitle, lang) || "Sistema"}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { font-family: 'Inter', system-ui, sans-serif; }
    .module-panel { display: none; }
    .module-panel.active { display: block; }
    .sidebar-btn.active { background: rgba(255,255,255,0.08); color: white; }
    .sidebar-btn.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; border-radius: 0 3px 3px 0; background: ${config.brandColor}; }
    .sidebar-btn { position: relative; }
    .modal-overlay { display: none; }
    .modal-overlay.open { display: flex; }
    .detail-panel { display: none; }
    .detail-panel.open { display: flex; flex-direction: column; }
    .dropdown { display: none; }
    .dropdown.open { display: block; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
    .animate-in { animation: fadeIn 0.2s ease-out; }
    .animate-slide { animation: slideIn 0.25s ease-out; }
    .chart-bar { transition: height 0.3s ease; }
    tr.highlight { background: rgba(16,185,129,0.05) !important; }
  </style>
</head>
<body class="bg-gray-50 h-screen flex overflow-hidden">

<!-- SIDEBAR -->
<aside id="sidebar" class="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0 transition-transform duration-200 lg:translate-x-0 -translate-x-full fixed lg:static h-full z-40">
  <div class="p-5 border-b border-gray-800">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg" style="background:${config.brandColor}">
        ${config.icon || systemName.charAt(0)}
      </div>
      <div>
        <div class="font-semibold text-sm">${systemName}</div>
        ${config.subtitle ? `<div class="text-[11px] text-gray-400">${r(config.subtitle, lang)}</div>` : ""}
      </div>
    </div>
  </div>

  <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
    ${config.modules.map((m, i) => `
    <button data-nav="${m.id}" onclick="showModule('${m.id}')" class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors ${i === 0 ? "active" : ""}">
      ${svgIcon(m.icon, "w-5 h-5 flex-shrink-0")}
      <span>${r(m.label, lang)}</span>
    </button>`).join("")}

    ${config.tenantAdmin ? `
    <div class="pt-4 mt-4 border-t border-gray-800">
      <p class="px-3 text-[10px] uppercase tracking-wider text-gray-500 mb-2">${ui("ui.tenantAdmin", lang)}</p>
      ${config.tenantAdmin.modules.map((m) => `
      <button data-nav="${m.id}" onclick="showModule('${m.id}')" class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors">
        ${svgIcon(m.icon, "w-5 h-5 flex-shrink-0")}
        <span>${r(m.label, lang)}</span>
      </button>`).join("")}
    </div>` : ""}

    ${config.superAdmin ? `
    <div class="pt-4 mt-4 border-t border-gray-800">
      <p class="px-3 text-[10px] uppercase tracking-wider text-gray-500 mb-2">${ui("ui.superAdmin", lang)}</p>
      ${config.superAdmin.modules.map((m) => `
      <button data-nav="${m.id}" onclick="showModule('${m.id}')" class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors">
        ${svgIcon(m.icon, "w-5 h-5 flex-shrink-0")}
        <span>${r(m.label, lang)}</span>
      </button>`).join("")}
    </div>` : ""}
  </nav>

  <div class="p-4 border-t border-gray-800">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white" style="background:${config.brandColor}">SA</div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">Super Admin</div>
        <div class="text-[11px] text-gray-400 truncate">admin@${systemName.toLowerCase().replace(/\s/g, "")}.io</div>
      </div>
    </div>
  </div>
</aside>

<!-- MOBILE OVERLAY -->
<div id="sidebar-overlay" class="fixed inset-0 bg-black/50 z-30 lg:hidden hidden" onclick="toggleSidebar()"></div>

<!-- MAIN CONTENT -->
<div class="flex-1 flex flex-col overflow-hidden">
  <!-- Header -->
  <header class="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
    <button onclick="toggleSidebar()" class="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
    <h1 id="page-title" class="text-lg font-semibold text-gray-900">${r(allModules[0]?.label, lang) || ui("ui.dashboard", lang)}</h1>
    <div class="flex-1"></div>
    <div class="flex items-center gap-2">
      <!-- Export CSV -->
      <button onclick="exportCSV()" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600" title="${ui("ui.export", lang)}">
        ${svgIcon("download", "w-3.5 h-3.5")}
        <span>${ui("ui.export", lang)}</span>
      </button>
      <!-- Language selector -->
      <div class="relative">
        <button onclick="toggleDropdown('lang-dd')" class="flex items-center gap-1 px-2 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          ${svgIcon("globe", "w-3.5 h-3.5")}
          <span>${LANG_LABELS[lang]}</span>
          ${svgIcon("chevronDown", "w-3 h-3")}
        </button>
        <div id="lang-dd" class="dropdown absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in">
          ${TEMPLATE_LANGS.map((l) => `
          <button onclick="switchLang('${l}')" class="w-full flex items-center gap-2 px-3 py-2 text-sm ${l === lang ? "text-gray-900 font-medium bg-gray-50" : "text-gray-600 hover:bg-gray-50"}">
            ${l === lang ? svgIcon("shield", "w-3.5 h-3.5 text-emerald-500") : '<span class="w-3.5 h-3.5"></span>'}
            ${LANG_LABELS[l]}
          </button>`).join("")}
        </div>
      </div>
      <!-- Notifications -->
      <div class="relative">
        <button onclick="toggleDropdown('notif-dd')" class="p-2 rounded-lg hover:bg-gray-100 relative">
          ${svgIcon("bell", "w-5 h-5 text-gray-500")}
          <span id="notif-badge" class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">3</span>
        </button>
        <div id="notif-dd" class="dropdown absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-in">
          <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p class="text-sm font-semibold text-gray-900">${ui("ui.notifications", lang)}</p>
            <button onclick="document.querySelectorAll('#notif-dd .notif-item').forEach(n=>n.remove());document.getElementById('notif-badge').style.display='none';showToast('${jsStr(ui("ui.notifCleared", lang))}')" class="text-xs text-gray-400 hover:text-gray-600">${ui("ui.clearAll", lang)}</button>
          </div>
          <div class="max-h-64 overflow-y-auto">
            <div class="notif-item px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
              <p class="text-sm text-gray-800">${ui("ui.notif1", lang)}</p>
              <p class="text-xs text-gray-400 mt-0.5">${ui("ui.notif1Time", lang)}</p>
            </div>
            <div class="notif-item px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
              <p class="text-sm text-gray-800">${ui("ui.notif2", lang)}</p>
              <p class="text-xs text-gray-400 mt-0.5">${ui("ui.notif2Time", lang)}</p>
            </div>
            <div class="notif-item px-4 py-3 hover:bg-gray-50">
              <p class="text-sm text-gray-800">${ui("ui.notif3", lang)}</p>
              <p class="text-xs text-gray-400 mt-0.5">${ui("ui.notif3Time", lang)}</p>
            </div>
          </div>
        </div>
      </div>
      <!-- Profile dropdown -->
      <div class="relative">
        <button onclick="toggleDropdown('profile-dd')" class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium text-white" style="background:${config.brandColor}">SA</div>
          ${svgIcon("chevronDown", "w-3.5 h-3.5 text-gray-400")}
        </button>
        <div id="profile-dd" class="dropdown absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in">
          <div class="px-4 py-3 border-b border-gray-100">
            <p class="text-sm font-medium text-gray-900">Super Admin</p>
            <p class="text-xs text-gray-500">admin@${systemName.toLowerCase().replace(/\s/g, "")}.io</p>
          </div>
          <button onclick="showToast('${jsStr(ui("ui.profileSoon", lang))}')" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">${svgIcon("users", "w-4 h-4 text-gray-400")} ${ui("ui.profile", lang)}</button>
          <button onclick="showToast('${jsStr(ui("ui.configSoon", lang))}')" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">${svgIcon("settings", "w-4 h-4 text-gray-400")} ${ui("ui.config", lang)}</button>
          <div class="border-t border-gray-100 mt-1 pt-1">
            <button onclick="showToast('${jsStr(ui("ui.loggedOut", lang))}')" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">${svgIcon("logout", "w-4 h-4")} ${ui("ui.logout", lang)}</button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Content area -->
  <main id="main-content" class="flex-1 overflow-y-auto p-6">
    ${allModules.map((m, i) => renderModule(m, i === 0, config.brandColor, hasDashboard && i === 0, lang)).join("\n")}
  </main>

  <!-- Footer status bar -->
  <footer class="h-8 bg-white border-t border-gray-200 flex items-center px-4 text-[11px] text-gray-400 gap-4">
    <span>${systemName} v1.0</span>
    <span>|</span>
    <span>${totalModules} ${ui("ui.modules", lang)}</span>
    <span>|</span>
    <span>${totalRows} ${ui("ui.recordsCount", lang)}</span>
    <div class="flex-1"></div>
    <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> ${ui("ui.connected", lang)}</span>
  </footer>
</div>

<!-- DETAIL PANEL (slide from right) -->
<div id="detail-panel" class="detail-panel fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-2xl z-50 animate-slide">
  <div class="flex items-center justify-between p-4 border-b border-gray-200">
    <h3 class="text-lg font-semibold text-gray-900" id="detail-title">${ui("ui.detail", lang)}</h3>
    <button onclick="closeDetail()" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">${svgIcon("x", "w-5 h-5")}</button>
  </div>
  <div id="detail-body" class="flex-1 overflow-y-auto p-5"></div>
</div>
<div id="detail-overlay" class="fixed inset-0 bg-black/30 z-40 hidden" onclick="closeDetail()"></div>

<!-- MODALS -->
${allModules.filter((m) => m.modal).map((m) => renderModal(m, config.brandColor, lang)).join("\n")}

<!-- JAVASCRIPT -->
<script>
// i18n strings for JS runtime
const I18N = {
  prev: '${jsStr(ui("ui.prev", lang))}',
  next: '${jsStr(ui("ui.next", lang))}',
  showing: '${jsStr(ui("ui.showing", lang))}',
  of: '${jsStr(ui("ui.of", lang))}',
  records: '${jsStr(ui("ui.records", lang))}',
  created: '${jsStr(ui("ui.created", lang))}',
  deleted: '${jsStr(ui("ui.deleted", lang))}',
  confirmDelete: '${jsStr(ui("ui.confirmDelete", lang))}',
  requiredFields: '${jsStr(ui("ui.requiredFields", lang))}',
  noEditForm: '${jsStr(ui("ui.noEditForm", lang))}',
  detail: '${jsStr(ui("ui.detail", lang))}',
  csvExported: '${jsStr(ui("ui.csvExported", lang))}',
};

// Navigation
const MOD_LABELS = ${JSON.stringify(modLabelMap)};
function showModule(id) {
  document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('mod-' + id);
  if (panel) { panel.classList.add('active'); panel.classList.add('animate-in'); }
  document.querySelectorAll('.sidebar-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.nav === id);
  });
  document.getElementById('page-title').textContent = MOD_LABELS[id] || id;
  if (window.innerWidth < 1024) toggleSidebar(false);
  updateRowCount(id);
}

// Sidebar toggle
function toggleSidebar(forceState) {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const isOpen = !sb.classList.contains('-translate-x-full');
  const shouldOpen = forceState !== undefined ? forceState : !isOpen;
  sb.classList.toggle('-translate-x-full', !shouldOpen);
  ov.classList.toggle('hidden', !shouldOpen);
}

// Dropdown toggle
function toggleDropdown(id) {
  const dd = document.getElementById(id);
  if (dd) dd.classList.toggle('open');
}
document.addEventListener('click', function(e) {
  document.querySelectorAll('.dropdown.open').forEach(d => {
    if (!d.parentElement.contains(e.target)) d.classList.remove('open');
  });
});

// Language switching — communicates with parent iframe
function switchLang(newLang) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'switchLang', lang: newLang }, '*');
  } else {
    // Standalone mode: reload with lang param
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLang);
    window.location.href = url.toString();
  }
}

// Modal system
function openModal(id) {
  const m = document.getElementById('modal-' + id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById('modal-' + id);
  if (m) { m.classList.remove('open'); m.querySelector('form')?.reset(); }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    closeDetail();
  }
});

// Search filtering
function searchTable(moduleId, inputEl) {
  const query = inputEl.value.toLowerCase();
  const table = document.querySelector('#mod-' + moduleId + ' tbody');
  if (!table) return;
  table.querySelectorAll('tr').forEach(row => {
    const match = row.textContent.toLowerCase().includes(query);
    row.style.display = match ? '' : 'none';
    row.dataset.filtered = match ? 'false' : 'true';
  });
  paginate(moduleId, 1);
}

// Tab filtering
function filterTab(moduleId, tabEl, field, value) {
  tabEl.parentElement.querySelectorAll('button').forEach(b => {
    b.className = b.className.replace(/border-\\S+ text-\\S+/g, '').trim();
    b.classList.add('border-transparent', 'text-gray-500');
  });
  tabEl.classList.remove('border-transparent', 'text-gray-500');
  tabEl.classList.add('border-current');
  tabEl.style.color = '${config.brandColor}';
  const table = document.querySelector('#mod-' + moduleId + ' tbody');
  if (!table) return;
  const colIndex = parseInt(field);
  table.querySelectorAll('tr').forEach(row => {
    let match = true;
    if (value !== 'all') {
      const cell = row.children[colIndex];
      match = cell ? cell.textContent.toLowerCase().includes(value.toLowerCase()) : false;
    }
    row.style.display = match ? '' : 'none';
    row.dataset.filtered = match ? 'false' : 'true';
  });
  paginate(moduleId, 1);
}

// Pagination
const PAGE_BRAND = '${config.brandColor}';
function paginate(moduleId, page) {
  const pager = document.querySelector('#mod-' + moduleId + ' .pager');
  if (!pager) return;
  const perPage = parseInt(pager.dataset.perPage) || 10;
  const tbody = document.querySelector('#mod-' + moduleId + ' tbody');
  if (!tbody) return;
  const allRows = Array.from(tbody.querySelectorAll('tr'));
  const visibleRows = allRows.filter(r => r.dataset.filtered !== 'true');
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / perPage));
  page = Math.max(1, Math.min(page, totalPages));
  pager.dataset.page = page;
  allRows.forEach(r => r.style.display = 'none');
  visibleRows.forEach((r, i) => {
    r.style.display = (i >= (page - 1) * perPage && i < page * perPage) ? '' : 'none';
  });
  let html = '<button onclick="paginate(\\''+moduleId+'\\','+(page-1)+')" class="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs'+(page<=1?' opacity-40 pointer-events-none':'')+'">&laquo; '+I18N.prev+'</button>';
  for (let p = 1; p <= totalPages; p++) {
    if (p === page) {
      html += '<button class="px-3 py-1.5 rounded-lg text-white text-xs" style="background:'+PAGE_BRAND+'">'+p+'</button>';
    } else if (Math.abs(p - page) < 3 || p === 1 || p === totalPages) {
      html += '<button onclick="paginate(\\''+moduleId+'\\','+p+')" class="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs">'+p+'</button>';
    } else if (Math.abs(p - page) === 3) {
      html += '<span class="px-1 text-gray-400">…</span>';
    }
  }
  html += '<button onclick="paginate(\\''+moduleId+'\\','+(page+1)+')" class="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs'+(page>=totalPages?' opacity-40 pointer-events-none':'')+'">'+I18N.next+' &raquo;</button>';
  pager.innerHTML = html;
  const counter = document.querySelector('#mod-' + moduleId + ' .row-count');
  const showing = visibleRows.filter((r,i) => i >= (page-1)*perPage && i < page*perPage).length;
  if (counter) counter.textContent = I18N.showing + ' ' + showing + ' ' + I18N.of + ' ' + visibleRows.length + ' ' + I18N.records;
}

// Update visible row count
function updateRowCount(moduleId) {
  const tbody = document.querySelector('#mod-' + moduleId + ' tbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(r => {
    r.dataset.filtered = r.style.display === 'none' ? 'true' : 'false';
  });
  paginate(moduleId, 1);
}

// Form submit
function submitForm(moduleId) {
  const form = document.getElementById('form-' + moduleId);
  if (!form) return;
  const inputs = form.querySelectorAll('input, select, textarea');
  const data = {};
  let valid = true;
  inputs.forEach(inp => {
    if (inp.required && !inp.value.trim()) {
      inp.classList.add('ring-2', 'ring-red-400');
      valid = false;
    } else {
      inp.classList.remove('ring-2', 'ring-red-400');
    }
    data[inp.name] = inp.value;
  });
  if (!valid) { showToast(I18N.requiredFields, 'error'); return; }
  const tbody = document.querySelector('#mod-' + moduleId + ' tbody');
  if (tbody) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-100 hover:bg-gray-50 transition-colors animate-in';
    const firstRow = tbody.querySelector('tr');
    if (firstRow) {
      const cells = firstRow.querySelectorAll('td');
      cells.forEach((cell, i) => {
        const td = document.createElement('td');
        td.className = cell.className;
        const keys = Object.keys(data);
        td.innerHTML = i < keys.length ? data[keys[i]] : cell.innerHTML;
        tr.appendChild(td);
      });
    }
    tbody.insertBefore(tr, tbody.firstChild);
  }
  form.reset();
  closeModal(moduleId);
  showToast(I18N.created);
  updateRowCount(moduleId);
}

// Edit row
function editRow(btn, moduleId) {
  const row = btn.closest('tr');
  if (!row) return;
  const modal = document.getElementById('modal-' + moduleId);
  if (!modal) { showToast(I18N.noEditForm); return; }
  const form = modal.querySelector('form');
  if (!form) return;
  const cells = row.querySelectorAll('td');
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach((inp, i) => {
    if (i < cells.length) inp.value = cells[i].textContent.trim();
  });
  row.classList.add('highlight');
  row.dataset.editing = 'true';
  openModal(moduleId);
}

// Toast notifications
function showToast(msg, type) {
  const t = document.createElement('div');
  const color = type === 'error' ? 'bg-red-500' : 'bg-gray-900';
  const icon = type === 'error'
    ? '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    : '<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
  t.className = 'fixed bottom-4 right-4 ' + color + ' text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-[60] animate-in';
  t.innerHTML = icon + '<span>' + msg + '</span>';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// Delete row
function deleteRow(btn) {
  if (!confirm(I18N.confirmDelete)) return;
  const row = btn.closest('tr');
  if (row) { row.style.opacity = '0'; row.style.transition = 'opacity 0.2s'; setTimeout(() => row.remove(), 200); }
  showToast(I18N.deleted);
}

// Detail panel
function showDetail(btn) {
  const row = btn.closest('tr');
  if (!row) return;
  const headers = row.closest('table').querySelectorAll('thead th');
  const cells = row.querySelectorAll('td');
  let html = '<div class="space-y-4">';
  headers.forEach((th, i) => {
    if (i < cells.length - 1) {
      html += '<div class="border-b border-gray-100 pb-3"><p class="text-xs font-medium text-gray-400 uppercase mb-1">' + th.textContent + '</p><p class="text-sm text-gray-900">' + cells[i].innerHTML + '</p></div>';
    }
  });
  html += '</div>';
  document.getElementById('detail-body').innerHTML = html;
  document.getElementById('detail-title').textContent = cells[0]?.textContent?.trim() || I18N.detail;
  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('detail-overlay').classList.remove('hidden');
}
function closeDetail() {
  document.getElementById('detail-panel').classList.remove('open');
  document.getElementById('detail-overlay').classList.add('hidden');
}

// Export CSV
function exportCSV() {
  const active = document.querySelector('.module-panel.active');
  if (!active) return;
  const table = active.querySelector('table');
  if (!table) return;
  let csv = '';
  const headers = [];
  table.querySelectorAll('thead th').forEach(th => headers.push('"' + th.textContent.trim() + '"'));
  csv += headers.join(',') + '\\n';
  table.querySelectorAll('tbody tr').forEach(row => {
    if (row.style.display === 'none') return;
    const vals = [];
    row.querySelectorAll('td').forEach(td => vals.push('"' + td.textContent.trim().replace(/"/g, '""') + '"'));
    csv += vals.join(',') + '\\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '${systemName.toLowerCase().replace(/\s/g, "-")}-export.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast(I18N.csvExported);
}

// Init
showModule('${firstModId}');
<\/script>
</body>
</html>`;
}

// ─── Render a single module panel ───
function renderModule(mod: ModuleConfig, isFirst: boolean, brandColor: string, isDashboard: boolean, lang: TemplateLang): string {
  const chartSection = isDashboard ? `
    <!-- Chart Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-700">${ui("ui.weeklyActivity", lang)}</h3>
          <span class="text-xs text-gray-400">${ui("ui.last7days", lang)}</span>
        </div>
        <div class="flex items-end gap-2 h-24">${generateChartBars(brandColor, lang)}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-700">${ui("ui.distribution", lang)}</h3>
          <span class="text-xs text-gray-400">${ui("ui.thisMonth", lang)}</span>
        </div>
        <div class="space-y-3">
          ${[[ui("ui.completed", lang), 72, "bg-emerald-500"], [ui("ui.inProgress", lang), 18, "bg-blue-500"], [ui("ui.pending", lang), 10, "bg-yellow-500"]].map(([label, pct, bg]) => `
          <div>
            <div class="flex justify-between text-xs mb-1"><span class="text-gray-600">${label}</span><span class="font-medium text-gray-900">${pct}%</span></div>
            <div class="w-full h-2 bg-gray-100 rounded-full"><div class="h-2 rounded-full ${bg}" style="width:${pct}%"></div></div>
          </div>`).join("")}
        </div>
      </div>
    </div>` : "";

  return `
  <!-- MODULE:${mod.id} -->
  <section id="mod-${mod.id}" class="module-panel ${isFirst ? "active" : ""}">
    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-${Math.min(mod.kpis.length, 4)} gap-4 mb-6">
      ${mod.kpis.map((kpi) => `
      <div class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">${r(kpi.label, lang)}</span>
          ${kpi.change ? `<span class="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${kpi.trend === "up" ? "bg-emerald-50 text-emerald-600" : kpi.trend === "down" ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-500"}">${kpi.trend === "up" ? "↑" : kpi.trend === "down" ? "↓" : ""}${kpi.change}</span>` : ""}
        </div>
        <div class="text-2xl font-bold text-gray-900">${r(kpi.value, lang)}</div>
      </div>`).join("")}
    </div>

    ${chartSection}

    <!-- Toolbar: Search + Tabs + Actions -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            ${svgIcon("search", "w-4 h-4 text-gray-400")}
          </div>
          <input type="text" placeholder="${r(mod.table.searchPlaceholder, lang) || ui("ui.search", lang)}" oninput="searchTable('${mod.id}', this)"
            class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent outline-none" style="--tw-ring-color:${brandColor}"/>
        </div>

        ${mod.tabs ? `
        <div class="flex gap-1">
          ${mod.tabs.map((tab, i) => `
          <button onclick="filterTab('${mod.id}', this, '${tab.filterField}', '${tab.filterValue}')"
            class="px-3 py-1.5 text-xs font-medium rounded-full border ${i === 0 ? "border-current" : "border-gray-200 text-gray-500 hover:border-gray-300"} transition-colors"
            ${i === 0 ? `style="color:${brandColor}"` : ""}>
            ${r(tab.label, lang)}
          </button>`).join("")}
        </div>` : ""}

        ${mod.modal ? `
        <button onclick="openModal('${mod.id}')" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity" style="background:${brandColor}">
          ${svgIcon("plus", "w-4 h-4")}
          <span class="hidden sm:inline">${r(mod.modal.title, lang)}</span>
          <span class="sm:hidden">${ui("ui.new", lang)}</span>
        </button>` : ""}
      </div>

      <!-- Data Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50/50">
              ${mod.table.columns.map((col) => `<th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">${r(col.label, lang)}</th>`).join("")}
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">${ui("ui.actions", lang)}</th>
            </tr>
          </thead>
          <tbody>
            ${mod.table.rows.map((row) => `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              ${mod.table.columns.map((col) => renderCell(col, row, lang)).join("")}
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-0.5">
                  <button onclick="showDetail(this)" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="${ui("ui.viewDetail", lang)}">${svgIcon("eye", "w-4 h-4")}</button>
                  <button onclick="editRow(this,'${mod.id}')" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="${ui("ui.edit", lang)}">${svgIcon("edit", "w-4 h-4")}</button>
                  <button onclick="deleteRow(this)" class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="${ui("ui.delete", lang)}">${svgIcon("trash", "w-4 h-4")}</button>
                </div>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <!-- Pagination + row count -->
      <div class="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
        <span class="row-count">${ui("ui.showing", lang)} ${mod.table.rows.length} ${ui("ui.of", lang)} ${mod.table.rows.length} ${ui("ui.records", lang)}</span>
        <div class="pager flex gap-1" data-module="${mod.id}" data-per-page="10" data-page="1"></div>
      </div>
    </div>
  </section>`;
}

// ─── Render table cell ───
function renderCell(col: ColumnConfig, row: Record<string, string | number>, lang: TemplateLang): string {
  const val = row[col.key] ?? "";
  switch (col.type) {
    case "badge": {
      const color = col.badgeColors?.[String(val)] || "gray";
      const badgeText = translateBadge(String(val), lang);
      return `<td class="px-4 py-3"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass(color)}">${badgeText}</span></td>`;
    }
    case "currency":
      return `<td class="px-4 py-3 text-sm font-semibold text-gray-900">${val}</td>`;
    case "avatar":
      return `<td class="px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold">${String(val).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</div>
          <span class="text-sm font-medium text-gray-900">${val}</span>
        </div>
      </td>`;
    case "date":
      return `<td class="px-4 py-3 text-sm text-gray-500">${val}</td>`;
    default:
      return `<td class="px-4 py-3 text-sm text-gray-700">${val}</td>`;
  }
}

// ─── Render modal ───
function renderModal(mod: ModuleConfig, brandColor: string, lang: TemplateLang): string {
  if (!mod.modal) return "";
  return `
  <div id="modal-${mod.id}" class="modal-overlay fixed inset-0 bg-black/50 items-center justify-center z-50" onclick="if(event.target===this)closeModal('${mod.id}')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-in" onclick="event.stopPropagation()">
      <div class="flex items-center justify-between p-5 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">${r(mod.modal.title, lang)}</h3>
        <button onclick="closeModal('${mod.id}')" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          ${svgIcon("x", "w-5 h-5")}
        </button>
      </div>
      <form id="form-${mod.id}" onsubmit="event.preventDefault();submitForm('${mod.id}')" class="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        ${mod.modal.fields.map((f) => {
    if (f.type === "select") {
      return `<div>
              <label class="block text-sm font-medium text-gray-700 mb-1">${r(f.label, lang)}${f.required ? " *" : ""}</label>
              <select name="${f.name}" ${f.required ? "required" : ""} class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent outline-none" style="--tw-ring-color:${brandColor}">
                <option value="">${ui("ui.select", lang)}</option>
                ${f.options?.map((o) => `<option value="${o.value}">${r(o.label, lang)}</option>`).join("") || ""}
              </select>
            </div>`;
    }
    if (f.type === "textarea") {
      return `<div>
              <label class="block text-sm font-medium text-gray-700 mb-1">${r(f.label, lang)}${f.required ? " *" : ""}</label>
              <textarea name="${f.name}" ${f.required ? "required" : ""} placeholder="${r(f.placeholder, lang)}" rows="3"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent outline-none" style="--tw-ring-color:${brandColor}"></textarea>
            </div>`;
    }
    if (f.type === "checkbox") {
      return `<label class="flex items-center gap-2">
              <input type="checkbox" name="${f.name}" class="w-4 h-4 rounded border-gray-300 focus:ring-2" style="accent-color:${brandColor}"/>
              <span class="text-sm text-gray-700">${r(f.label, lang)}</span>
            </label>`;
    }
    return `<div>
            <label class="block text-sm font-medium text-gray-700 mb-1">${r(f.label, lang)}${f.required ? " *" : ""}</label>
            <input type="${f.type}" name="${f.name}" ${f.required ? "required" : ""} placeholder="${r(f.placeholder, lang)}"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent outline-none" style="--tw-ring-color:${brandColor}"/>
          </div>`;
  }).join("")}
      </form>
      <div class="flex gap-3 p-5 pt-0">
        <button type="button" onclick="closeModal('${mod.id}')" class="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">${ui("ui.cancel", lang)}</button>
        <button type="button" onclick="document.getElementById('form-${mod.id}').dispatchEvent(new Event('submit'))" class="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity" style="background:${brandColor}">${ui("ui.save", lang)}</button>
      </div>
    </div>
  </div>`;
}
