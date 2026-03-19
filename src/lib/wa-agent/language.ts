/**
 * Simple language detection from text + notification translations.
 * Supports: es, en, fr, de, it
 */

type Lang = "es" | "en" | "fr" | "de" | "it";

const LANG_PATTERNS: Record<Lang, RegExp[]> = {
  en: [/\b(hello|hi|hey|please|thanks|thank you|want|would|like|can|the|and|with|without|how much|is it|menu|order)\b/i],
  de: [/\b(hallo|bitte|danke|ich|möchte|ohne|mit|wie viel|speisekarte|bestellen|guten tag|tschüss)\b/i],
  fr: [/\b(bonjour|salut|merci|s'il vous|je veux|voudrais|sans|avec|combien|carte|commander)\b/i],
  it: [/\b(ciao|buongiorno|grazie|vorrei|prego|senza|con|quanto|menù|ordinare)\b/i],
  es: [/\b(hola|gracias|por favor|quiero|quisiera|sin|con|cuánto|menú|pedir|pedido)\b/i],
};

export function detectLanguage(text: string): Lang {
  const lower = text.toLowerCase();
  let bestLang: Lang = "es";
  let bestScore = 0;

  for (const [lang, patterns] of Object.entries(LANG_PATTERNS) as [Lang, RegExp[]][]) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = lower.match(pattern);
      if (matches) score += matches.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  return bestLang;
}

// ─── Notification translations ───

interface NotifyMessages {
  kitchen_accepted: (name: string, orderNum: string, mins: number | string) => string;
  kitchen_rejected: (name: string, orderNum: string) => string;
  order_preparing: (name: string, orderNum: string) => string;
  order_ready: (name: string, orderNum: string, tenantName: string, mapsUrl?: string) => string;
  pickup_confirm_yes: (name: string, orderNum: string, mins: number | string) => string;
  pickup_confirm_no: (name: string, orderNum: string) => string;
  pickup_remind: () => string;
  follow_up: (name: string, tenantName: string) => string;
}

export const NOTIFY_I18N: Record<Lang, NotifyMessages> = {
  es: {
    kitchen_accepted: (name, num, mins) =>
      `🍳 *¡Buenas noticias, ${name}!*\n\nCocina ha aceptado tu pedido #${num} y estará listo en aproximadamente *${mins} minutos*. ⏱️\n\n¿Te parece bien ese tiempo? Responde:\n✅ *SÍ* — para confirmar\n❌ *NO* — para cancelar el pedido`,
    kitchen_rejected: (name, num) =>
      `😔 Lo sentimos mucho, ${name}.\n\nLamentablemente, cocina no puede preparar tu pedido #${num} en este momento.\n\nTe invitamos a intentarlo más tarde o a elegir otros productos. ¡Disculpa las molestias! 🙏`,
    order_preparing: (name, num) =>
      `🔥 *¡${name}!*\n\n¡Tu pedido #${num} ya está en preparación! 👨‍🍳\n\nTe avisaré en cuanto esté listo para recoger. ¡Un poquito de paciencia! 😊`,
    order_ready: (name, num, tenant, maps) =>
      `🎉 *¡${name}! ¡Tu pedido #${num} está LISTO!* 🎉\n\nYa puedes venir a recogerlo. ¡Te esperamos! 😊${maps ? `\n\n📍 *Cómo llegar:* ${maps}` : ""}\n\n¡Muchas gracias por elegir *${tenant}*! ❤️ ¡Que lo disfrutes!`,
    pickup_confirm_yes: (name, num, mins) =>
      `✅ *¡Perfecto, ${name}!*\n\nTu pedido #${num} está confirmado. Estará listo en aproximadamente *${mins} minutos*. ⏱️\n\nTe avisaré cuando esté en preparación y cuando esté listo para recoger. 🍔🔥\n\nSi necesitas algo más, ¡aquí estoy! 😊`,
    pickup_confirm_no: (name, num) =>
      `❌ *Pedido #${num} cancelado.*\n\nSin problema, ${name}. Tu pedido ha sido cancelado.\n\nCuando quieras volver a pedir, solo escríbeme. ¡Aquí estaré! 😊🍔`,
    pickup_remind: () => "Por favor, responde *SÍ* para confirmar o *NO* para cancelar tu pedido. 😊",
    follow_up: (name, tenant) =>
      `👋 *¡Hola, ${name}!*\n\nEsperamos que hayas disfrutado tu pedido de *${tenant}*. 🍔❤️\n\nTu opinión es muy importante para nosotros. Si tienes un momento, nos encantaría que nos dejaras una reseña:`,
  },
  en: {
    kitchen_accepted: (name, num, mins) =>
      `🍳 *Great news, ${name}!*\n\nThe kitchen has accepted your order #${num} and it will be ready in about *${mins} minutes*. ⏱️\n\nDoes that work for you? Reply:\n✅ *YES* — to confirm\n❌ *NO* — to cancel the order`,
    kitchen_rejected: (name, num) =>
      `😔 We're sorry, ${name}.\n\nUnfortunately, the kitchen can't prepare your order #${num} right now.\n\nPlease try again later or choose different items. Sorry for the inconvenience! 🙏`,
    order_preparing: (name, num) =>
      `🔥 *${name}!*\n\nYour order #${num} is now being prepared! 👨‍🍳\n\nI'll let you know as soon as it's ready for pickup. Hang tight! 😊`,
    order_ready: (name, num, tenant, maps) =>
      `🎉 *${name}! Your order #${num} is READY!* 🎉\n\nYou can come pick it up now. We're waiting for you! 😊${maps ? `\n\n📍 *How to get here:* ${maps}` : ""}\n\nThank you for choosing *${tenant}*! ❤️ Enjoy!`,
    pickup_confirm_yes: (name, num, mins) =>
      `✅ *Perfect, ${name}!*\n\nYour order #${num} is confirmed. It will be ready in about *${mins} minutes*. ⏱️\n\nI'll notify you when it's being prepared and when it's ready for pickup. 🍔🔥\n\nIf you need anything else, I'm here! 😊`,
    pickup_confirm_no: (name, num) =>
      `❌ *Order #${num} cancelled.*\n\nNo worries, ${name}. Your order has been cancelled.\n\nWhenever you want to order again, just text me. I'll be here! 😊🍔`,
    pickup_remind: () => "Please reply *YES* to confirm or *NO* to cancel your order. 😊",
    follow_up: (name, tenant) =>
      `👋 *Hey ${name}!*\n\nWe hope you enjoyed your order from *${tenant}*. 🍔❤️\n\nYour feedback means a lot to us. If you have a moment, we'd love a review:`,
  },
  fr: {
    kitchen_accepted: (name, num, mins) =>
      `🍳 *Bonne nouvelle, ${name} !*\n\nLa cuisine a accepté ta commande #${num} et elle sera prête dans environ *${mins} minutes*. ⏱️\n\nÇa te convient ? Réponds :\n✅ *OUI* — pour confirmer\n❌ *NON* — pour annuler la commande`,
    kitchen_rejected: (name, num) =>
      `😔 Désolé, ${name}.\n\nMalheureusement, la cuisine ne peut pas préparer ta commande #${num} pour le moment.\n\nN'hésite pas à réessayer plus tard. Toutes nos excuses ! 🙏`,
    order_preparing: (name, num) =>
      `🔥 *${name} !*\n\nTa commande #${num} est en préparation ! 👨‍🍳\n\nJe te préviens dès qu'elle est prête. Un peu de patience ! 😊`,
    order_ready: (name, num, tenant, maps) =>
      `🎉 *${name} ! Ta commande #${num} est PRÊTE !* 🎉\n\nTu peux venir la récupérer. On t'attend ! 😊${maps ? `\n\n📍 *Comment venir :* ${maps}` : ""}\n\nMerci d'avoir choisi *${tenant}* ! ❤️ Bon appétit !`,
    pickup_confirm_yes: (name, num, mins) =>
      `✅ *Parfait, ${name} !*\n\nTa commande #${num} est confirmée. Elle sera prête dans environ *${mins} minutes*. ⏱️\n\nJe te préviens quand elle sera en préparation et quand elle sera prête. 🍔🔥\n\nSi tu as besoin de quoi que ce soit, je suis là ! 😊`,
    pickup_confirm_no: (name, num) =>
      `❌ *Commande #${num} annulée.*\n\nPas de souci, ${name}. Ta commande a été annulée.\n\nQuand tu veux recommander, écris-moi. Je suis là ! 😊🍔`,
    pickup_remind: () => "Réponds *OUI* pour confirmer ou *NON* pour annuler ta commande. 😊",
    follow_up: (name, tenant) =>
      `👋 *Salut ${name} !*\n\nOn espère que tu as apprécié ta commande de *${tenant}*. 🍔❤️\n\nTon avis compte beaucoup. Si tu as un moment, laisse-nous un avis :`,
  },
  de: {
    kitchen_accepted: (name, num, mins) =>
      `🍳 *Gute Neuigkeiten, ${name}!*\n\nDie Küche hat deine Bestellung #${num} angenommen und sie wird in ca. *${mins} Minuten* fertig sein. ⏱️\n\nPasst das für dich? Antworte:\n✅ *JA* — zum Bestätigen\n❌ *NEIN* — zum Stornieren`,
    kitchen_rejected: (name, num) =>
      `😔 Es tut uns leid, ${name}.\n\nLeider kann die Küche deine Bestellung #${num} im Moment nicht zubereiten.\n\nBitte versuche es später noch einmal. Entschuldigung! 🙏`,
    order_preparing: (name, num) =>
      `🔥 *${name}!*\n\nDeine Bestellung #${num} wird jetzt zubereitet! 👨‍🍳\n\nIch sage dir Bescheid, sobald sie fertig ist. Einen Moment Geduld! 😊`,
    order_ready: (name, num, tenant, maps) =>
      `🎉 *${name}! Deine Bestellung #${num} ist FERTIG!* 🎉\n\nDu kannst sie jetzt abholen. Wir warten auf dich! 😊${maps ? `\n\n📍 *So findest du uns:* ${maps}` : ""}\n\nVielen Dank, dass du *${tenant}* gewählt hast! ❤️ Guten Appetit!`,
    pickup_confirm_yes: (name, num, mins) =>
      `✅ *Perfekt, ${name}!*\n\nDeine Bestellung #${num} ist bestätigt. Sie wird in ca. *${mins} Minuten* fertig sein. ⏱️\n\nIch informiere dich, wenn sie zubereitet wird und wenn sie fertig ist. 🍔🔥\n\nWenn du etwas brauchst, bin ich hier! 😊`,
    pickup_confirm_no: (name, num) =>
      `❌ *Bestellung #${num} storniert.*\n\nKein Problem, ${name}. Deine Bestellung wurde storniert.\n\nWenn du wieder bestellen möchtest, schreib mir einfach. Ich bin hier! 😊🍔`,
    pickup_remind: () => "Bitte antworte *JA* zum Bestätigen oder *NEIN* zum Stornieren. 😊",
    follow_up: (name, tenant) =>
      `👋 *Hallo ${name}!*\n\nWir hoffen, du hast deine Bestellung von *${tenant}* genossen. 🍔❤️\n\nDein Feedback ist uns sehr wichtig. Wenn du einen Moment hast, hinterlasse uns gerne eine Bewertung:`,
  },
  it: {
    kitchen_accepted: (name, num, mins) =>
      `🍳 *Ottime notizie, ${name}!*\n\nLa cucina ha accettato il tuo ordine #${num} e sarà pronto in circa *${mins} minuti*. ⏱️\n\nTi va bene? Rispondi:\n✅ *SÌ* — per confermare\n❌ *NO* — per annullare l'ordine`,
    kitchen_rejected: (name, num) =>
      `😔 Ci dispiace, ${name}.\n\nPurtroppo, la cucina non può preparare il tuo ordine #${num} al momento.\n\nTi invitiamo a riprovare più tardi. Scusa il disagio! 🙏`,
    order_preparing: (name, num) =>
      `🔥 *${name}!*\n\nIl tuo ordine #${num} è in preparazione! 👨‍🍳\n\nTi avviserò quando sarà pronto. Un po' di pazienza! 😊`,
    order_ready: (name, num, tenant, maps) =>
      `🎉 *${name}! Il tuo ordine #${num} è PRONTO!* 🎉\n\nPuoi venire a ritirarlo. Ti aspettiamo! 😊${maps ? `\n\n📍 *Come arrivare:* ${maps}` : ""}\n\nGrazie per aver scelto *${tenant}*! ❤️ Buon appetito!`,
    pickup_confirm_yes: (name, num, mins) =>
      `✅ *Perfetto, ${name}!*\n\nIl tuo ordine #${num} è confermato. Sarà pronto in circa *${mins} minuti*. ⏱️\n\nTi avviserò quando sarà in preparazione e quando sarà pronto. 🍔🔥\n\nSe hai bisogno di altro, sono qui! 😊`,
    pickup_confirm_no: (name, num) =>
      `❌ *Ordine #${num} annullato.*\n\nNessun problema, ${name}. Il tuo ordine è stato annullato.\n\nQuando vuoi riordinare, scrivimi. Sarò qui! 😊🍔`,
    pickup_remind: () => "Per favore rispondi *SÌ* per confermare o *NO* per annullare il tuo ordine. 😊",
    follow_up: (name, tenant) =>
      `👋 *Ciao ${name}!*\n\nSperiamo che tu abbia apprezzato il tuo ordine da *${tenant}*. 🍔❤️\n\nLa tua opinione è molto importante. Se hai un momento, lasciaci una recensione:`,
  },
};

export function getLang(sessionContext: Record<string, unknown> | null): Lang {
  const stored = (sessionContext as Record<string, unknown> | null)?.detected_language as string;
  if (stored && stored in NOTIFY_I18N) return stored as Lang;
  return "es";
}

// ─── Agent error messages (Dify failures) ───

interface AgentErrors {
  buildInputsFailed: () => string;
  connectionError: () => string;
  emptyResponse: () => string;
}

export const AGENT_ERRORS: Record<Lang, AgentErrors> = {
  es: {
    buildInputsFailed: () => "¡Disculpa! Estoy teniendo un problemita. ¿Puedes intentar en un momento?",
    connectionError: () => "¡Disculpa! Error de conexión. Intenta en un momento.",
    emptyResponse: () => "No pude procesar tu mensaje. ¿Puedes intentar de nuevo?",
  },
  en: {
    buildInputsFailed: () => "Sorry! I'm having a little issue. Can you try again in a moment?",
    connectionError: () => "Sorry! Connection error. Please try again in a moment.",
    emptyResponse: () => "I couldn't process your message. Can you try again?",
  },
  fr: {
    buildInputsFailed: () => "Désolé ! J'ai un petit problème. Peux-tu réessayer dans un moment ?",
    connectionError: () => "Désolé ! Erreur de connexion. Réessaie dans un moment.",
    emptyResponse: () => "Je n'ai pas pu traiter ton message. Peux-tu réessayer ?",
  },
  de: {
    buildInputsFailed: () => "Entschuldigung! Ich habe gerade ein kleines Problem. Kannst du es in einem Moment nochmal versuchen?",
    connectionError: () => "Entschuldigung! Verbindungsfehler. Bitte versuche es gleich nochmal.",
    emptyResponse: () => "Ich konnte deine Nachricht nicht verarbeiten. Kannst du es nochmal versuchen?",
  },
  it: {
    buildInputsFailed: () => "Scusa! Sto avendo un piccolo problema. Puoi riprovare tra un momento?",
    connectionError: () => "Scusa! Errore di connessione. Riprova tra un momento.",
    emptyResponse: () => "Non sono riuscito a elaborare il tuo messaggio. Puoi riprovare?",
  },
};
