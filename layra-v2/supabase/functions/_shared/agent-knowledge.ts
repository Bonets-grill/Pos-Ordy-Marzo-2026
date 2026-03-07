// Real knowledge base per agent type
// This is what each agent ACTUALLY knows — no invented data

export interface AgentKnowledge {
  businessName: Record<string, string>;
  services: Array<{
    name: Record<string, string>;
    price: string;
    duration?: string;
    description?: Record<string, string>;
  }>;
  hours: string;
  location?: string;
  faqs: Array<{
    q: Record<string, string>;
    a: Record<string, string>;
  }>;
  policies: Record<string, string>;
  availableSlots: string[]; // demo slots
}

function k(es: string, en: string): Record<string, string> {
  return { es, en, fr: en, de: en, it: en };
}

export const AGENT_KNOWLEDGE: Record<string, AgentKnowledge> = {
  // ══════════════════════════════════
  // BASIC AGENTS — Local businesses
  // ══════════════════════════════════

  barber_shop: {
    businessName: k("La Barberia", "The Barber Shop"),
    services: [
      { name: k("Corte clasico", "Classic Haircut"), price: "15", duration: "30min" },
      { name: k("Corte + barba", "Haircut + Beard"), price: "25", duration: "45min" },
      { name: k("Arreglo de barba", "Beard Trim"), price: "10", duration: "20min" },
      { name: k("Afeitado clasico con toalla caliente", "Classic Hot Towel Shave"), price: "20", duration: "30min" },
      { name: k("Corte ninos (hasta 12 anos)", "Kids Haircut (under 12)"), price: "12", duration: "25min" },
      { name: k("Coloracion/tinte", "Hair Coloring"), price: "35", duration: "60min" },
      { name: k("Tratamiento capilar", "Hair Treatment"), price: "20", duration: "30min" },
    ],
    hours: "Lunes-Sabado 09:00-20:00 / Mon-Sat 09:00-20:00",
    faqs: [
      { q: k("Necesito cita previa?", "Do I need an appointment?"), a: k("Recomendamos reservar cita, pero tambien aceptamos clientes sin cita si hay disponibilidad.", "We recommend booking an appointment, but walk-ins are accepted if available.") },
      { q: k("Que metodos de pago aceptan?", "What payment methods do you accept?"), a: k("Efectivo, tarjeta de credito/debito, Bizum y Apple Pay.", "Cash, credit/debit card, Bizum, and Apple Pay.") },
      { q: k("Hacen cortes para ninos?", "Do you cut children's hair?"), a: k("Si, cortamos el pelo a ninos a partir de 3 anos. Precio especial de 12 EUR.", "Yes, we cut children's hair from age 3. Special price of 12 EUR.") },
      { q: k("Puedo cancelar mi cita?", "Can I cancel my appointment?"), a: k("Si, puedes cancelar o reprogramar con al menos 2 horas de antelacion sin coste.", "Yes, you can cancel or reschedule with at least 2 hours notice at no charge.") },
    ],
    policies: k("Cancelacion gratuita con 2h de antelacion. Sin penalizacion por primera cancelacion tardia. El agente puede reagendar automaticamente.", "Free cancellation with 2h notice. No penalty for first late cancellation. Agent can auto-reschedule."),
    availableSlots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"],
  },

  hair_salon: {
    businessName: k("Salon de Belleza", "Beauty Salon"),
    services: [
      { name: k("Lavado + Corte", "Wash & Cut"), price: "30", duration: "45min" },
      { name: k("Secado / Brushing", "Blow-dry"), price: "20", duration: "30min" },
      { name: k("Coloracion completa", "Full Coloring"), price: "55", duration: "90min" },
      { name: k("Mechas / Highlights", "Highlights"), price: "70", duration: "120min" },
      { name: k("Tratamiento de keratina", "Keratin Treatment"), price: "90", duration: "120min" },
      { name: k("Hidratacion profunda", "Deep Conditioning"), price: "35", duration: "45min" },
      { name: k("Peinado de novia", "Bridal Styling"), price: "120", duration: "90min" },
      { name: k("Corte ninos", "Kids Cut"), price: "18", duration: "30min" },
    ],
    hours: "Martes-Sabado 09:00-19:00 / Tue-Sat 09:00-19:00",
    faqs: [
      { q: k("Cuanto dura una coloracion?", "How long does coloring take?"), a: k("Una coloracion completa tarda aproximadamente 90 minutos. Las mechas pueden tardar hasta 2 horas.", "A full coloring takes about 90 minutes. Highlights can take up to 2 hours.") },
      { q: k("Trabajan con productos veganos?", "Do you use vegan products?"), a: k("Si, tenemos una linea completa de productos veganos y cruelty-free disponible bajo solicitud.", "Yes, we have a complete line of vegan and cruelty-free products available on request.") },
    ],
    policies: k("Cancelacion gratuita con 4h de antelacion. Deposito de 20 EUR para servicios de novia.", "Free cancellation with 4h notice. 20 EUR deposit for bridal services."),
    availableSlots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"],
  },

  auto_mechanic: {
    businessName: k("Taller Mecanico", "Auto Repair Shop"),
    services: [
      { name: k("Cambio de aceite", "Oil Change"), price: "45", duration: "30min" },
      { name: k("Revision de frenos", "Brake Inspection"), price: "30", duration: "45min" },
      { name: k("Cambio de pastillas de freno", "Brake Pad Replacement"), price: "120", duration: "60min" },
      { name: k("Rotacion de neumaticos", "Tire Rotation"), price: "25", duration: "30min" },
      { name: k("Diagnostico del motor", "Engine Diagnostics"), price: "60", duration: "60min" },
      { name: k("Reparacion de aire acondicionado", "AC Repair"), price: "150", duration: "120min" },
      { name: k("Cambio de bateria", "Battery Replacement"), price: "90", duration: "30min" },
      { name: k("Revision general / ITV", "General Inspection / MOT"), price: "80", duration: "90min" },
      { name: k("Alineacion y balanceo", "Alignment & Balancing"), price: "55", duration: "45min" },
    ],
    hours: "Lunes-Viernes 08:00-18:00, Sabados 09:00-14:00 / Mon-Fri 08:00-18:00, Sat 09:00-14:00",
    faqs: [
      { q: k("Trabajan con todas las marcas?", "Do you work with all car brands?"), a: k("Si, reparamos coches de todas las marcas y modelos. Europeos, asiaticos y americanos.", "Yes, we repair cars of all makes and models. European, Asian, and American.") },
      { q: k("Ofrecen servicio de grua?", "Do you offer towing?"), a: k("Si, tenemos servicio de grua dentro de un radio de 30km. Coste: 50 EUR.", "Yes, we offer towing within a 30km radius. Cost: 50 EUR.") },
      { q: k("Dan presupuesto gratis?", "Do you give free estimates?"), a: k("El diagnostico basico cuesta 60 EUR, pero si realizas la reparacion con nosotros, se descuenta del total.", "The basic diagnostic costs 60 EUR, but if you proceed with the repair, it's deducted from the total.") },
    ],
    policies: k("Garantia de 6 meses en todas las reparaciones. Presupuesto previo obligatorio para trabajos superiores a 200 EUR.", "6-month warranty on all repairs. Mandatory prior estimate for jobs over 200 EUR."),
    availableSlots: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"],
  },

  restaurant_agent: {
    businessName: k("El Restaurante", "The Restaurant"),
    services: [
      { name: k("Reserva de mesa (2 personas)", "Table for 2"), price: "0", duration: "90min" },
      { name: k("Reserva de mesa (4 personas)", "Table for 4"), price: "0", duration: "90min" },
      { name: k("Reserva de grupo (6-10)", "Group Reservation (6-10)"), price: "0" },
      { name: k("Menu del dia", "Daily Menu"), price: "14.50" },
      { name: k("Menu degustacion", "Tasting Menu"), price: "35" },
      { name: k("Pedido para llevar", "Takeout Order"), price: "Segun carta / Per menu" },
      { name: k("Catering para eventos", "Event Catering"), price: "Desde/From 25pp" },
    ],
    hours: "Lunes-Domingo 13:00-16:00, 20:00-23:30 / Mon-Sun 13:00-16:00, 20:00-23:30",
    faqs: [
      { q: k("Tienen opciones vegetarianas/veganas?", "Do you have vegetarian/vegan options?"), a: k("Si, tenemos 5 platos vegetarianos y 3 veganos en nuestra carta, mas opciones en el menu del dia.", "Yes, we have 5 vegetarian and 3 vegan dishes on our menu, plus options in the daily menu.") },
      { q: k("Aceptan mascotas?", "Are pets allowed?"), a: k("Si, son bienvenidas en nuestra terraza exterior. En interior no es posible.", "Yes, they're welcome on our outdoor terrace. Not allowed indoors.") },
      { q: k("Tienen parking?", "Do you have parking?"), a: k("Tenemos convenio con el parking de la calle lateral. 2h gratis con consumicion.", "We have an agreement with the parking on the side street. 2h free with any purchase.") },
    ],
    policies: k("Reservas se mantienen 15 minutos. Grupos de +6 necesitan tarjeta de credito. Cancelacion con 4h de antelacion.", "Reservations held for 15 minutes. Groups of 6+ require credit card. Cancellation with 4h notice."),
    availableSlots: ["13:00", "13:30", "14:00", "14:30", "15:00", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"],
  },

  dentist_agent: {
    businessName: k("Clinica Dental", "Dental Clinic"),
    services: [
      { name: k("Limpieza dental", "Dental Cleaning"), price: "60", duration: "45min" },
      { name: k("Revision general", "General Checkup"), price: "40", duration: "30min" },
      { name: k("Empaste", "Filling"), price: "80", duration: "45min" },
      { name: k("Endodoncia", "Root Canal"), price: "250", duration: "90min" },
      { name: k("Blanqueamiento", "Teeth Whitening"), price: "200", duration: "60min" },
      { name: k("Consulta de ortodoncia", "Orthodontics Consultation"), price: "0", duration: "30min" },
      { name: k("Urgencia dental", "Dental Emergency"), price: "80", duration: "30min" },
      { name: k("Radiografia panoramica", "Panoramic X-Ray"), price: "35", duration: "15min" },
    ],
    hours: "Lunes-Viernes 09:00-20:00 / Mon-Fri 09:00-20:00",
    faqs: [
      { q: k("Trabajan con seguros dentales?", "Do you accept dental insurance?"), a: k("Si, trabajamos con las principales aseguradoras: Sanitas, Adeslas, DKV, Asisa y Mapfre.", "Yes, we work with major insurance providers. Please check with us for your specific plan.") },
      { q: k("Es doloroso el blanqueamiento?", "Is whitening painful?"), a: k("El procedimiento es indoloro. Algunos pacientes experimentan sensibilidad temporal que desaparece en 24-48h.", "The procedure is painless. Some patients experience temporary sensitivity that fades in 24-48h.") },
      { q: k("Atienden urgencias?", "Do you handle emergencies?"), a: k("Si, reservamos espacios diarios para urgencias. Llamanos y te atenderemos lo antes posible. Fuera de horario, llama al 112.", "Yes, we reserve daily slots for emergencies. Call us and we'll see you ASAP. After hours, call 112.") },
    ],
    policies: k("Primera consulta de ortodoncia gratuita. Cancelacion con 24h de antelacion. Financiacion disponible para tratamientos +500 EUR.", "First orthodontics consultation free. 24h cancellation notice. Financing available for treatments over 500 EUR."),
    availableSlots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
  },

  vet_clinic: {
    businessName: k("Clinica Veterinaria", "Veterinary Clinic"),
    services: [
      { name: k("Consulta general", "General Consultation"), price: "40", duration: "30min" },
      { name: k("Vacunacion", "Vaccination"), price: "35", duration: "20min" },
      { name: k("Desparasitacion", "Deworming"), price: "25", duration: "15min" },
      { name: k("Consulta de cirugia", "Surgery Consultation"), price: "50", duration: "30min" },
      { name: k("Limpieza dental", "Dental Cleaning"), price: "120", duration: "60min" },
      { name: k("Urgencia veterinaria", "Veterinary Emergency"), price: "80", duration: "variable" },
      { name: k("Microchip", "Microchipping"), price: "30", duration: "10min" },
      { name: k("Peluqueria canina", "Dog Grooming"), price: "35", duration: "60min" },
    ],
    hours: "Lunes-Viernes 09:00-20:00, Sabados 10:00-14:00 / Mon-Fri 09:00-20:00, Sat 10:00-14:00",
    faqs: [
      { q: k("Atienden urgencias fuera de horario?", "Do you handle after-hours emergencies?"), a: k("Si, tenemos servicio de urgencias 24h. Fuera de horario llama al telefono de emergencias.", "Yes, we have 24h emergency service. After hours, call the emergency line.") },
      { q: k("Que vacunas necesita mi cachorro?", "What vaccines does my puppy need?"), a: k("Cachorros: parvovirus, moquillo, hepatitis a las 6-8 semanas. Refuerzo a las 12 semanas. Rabia a los 3 meses.", "Puppies: parvovirus, distemper, hepatitis at 6-8 weeks. Booster at 12 weeks. Rabies at 3 months.") },
    ],
    policies: k("Cancelacion con 4h de antelacion. Urgencias sin cita cuando hay disponibilidad. Historiales digitales accesibles.", "4h cancellation notice. Walk-in emergencies when available. Digital records accessible."),
    availableSlots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
  },

  gym_agent: {
    businessName: k("El Gimnasio", "The Gym"),
    services: [
      { name: k("Membresia mensual", "Monthly Membership"), price: "39/mes", duration: "30 dias" },
      { name: k("Membresia anual", "Annual Membership"), price: "29/mes", duration: "12 meses" },
      { name: k("Pase diario", "Day Pass"), price: "10" },
      { name: k("Entrenamiento personal (sesion)", "Personal Training (session)"), price: "45", duration: "60min" },
      { name: k("Pack 10 sesiones personal", "10-Session PT Pack"), price: "350" },
      { name: k("Clases grupales (yoga, spinning, boxeo, CrossFit)", "Group Classes (yoga, spinning, boxing, CrossFit)"), price: "Incluido/Included" },
      { name: k("Descuento estudiante (-25%)", "Student Discount (-25%)"), price: "29/mes" },
    ],
    hours: "Lunes-Viernes 06:00-23:00, Sabados-Domingos 08:00-21:00 / Mon-Fri 06:00-23:00, Sat-Sun 08:00-21:00",
    faqs: [
      { q: k("Hay compromiso de permanencia?", "Is there a commitment period?"), a: k("No, la membresia mensual es sin permanencia. La anual tiene un descuento pero requiere 12 meses.", "No, the monthly membership has no commitment. The annual has a discount but requires 12 months.") },
      { q: k("Que clases estan incluidas?", "What classes are included?"), a: k("Todas las clases grupales estan incluidas: yoga, spinning, boxeo, CrossFit, pilates, HIIT y zumba.", "All group classes are included: yoga, spinning, boxing, CrossFit, pilates, HIIT, and zumba.") },
    ],
    policies: k("Cancelacion de membresia con 30 dias de aviso. Congelacion de membresia disponible (max 2 meses/ano). Toalla obligatoria.", "30-day notice for membership cancellation. Membership freeze available (max 2 months/year). Towel required."),
    availableSlots: ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"],
  },

  // ══════════════════════════════════
  // PREMIUM AGENTS
  // ══════════════════════════════════

  sales_sdr: {
    businessName: k("Equipo Comercial IA", "AI Sales Team"),
    services: [
      { name: k("Consulta gratuita de 15 min", "Free 15-min Consultation"), price: "0", duration: "15min" },
      { name: k("Demo del producto", "Product Demo"), price: "0", duration: "30min" },
      { name: k("Auditoria de procesos", "Process Audit"), price: "0", duration: "45min" },
      { name: k("Plan Starter", "Starter Plan"), price: "99/mes" },
      { name: k("Plan Professional", "Professional Plan"), price: "249/mes" },
      { name: k("Plan Enterprise", "Enterprise Plan"), price: "Personalizado/Custom" },
    ],
    hours: "Lunes-Viernes 09:00-19:00 / Mon-Fri 09:00-19:00",
    faqs: [
      { q: k("Que hace exactamente el agente SDR?", "What does the SDR agent actually do?"), a: k("Cualifica leads automaticamente, envia emails personalizados, agenda reuniones con tu equipo comercial y hace seguimiento a prospectos 24/7 por WhatsApp.", "Automatically qualifies leads, sends personalized emails, schedules meetings with your sales team, and follows up with prospects 24/7 via WhatsApp.") },
      { q: k("Se integra con mi CRM?", "Does it integrate with my CRM?"), a: k("Si, nos integramos con HubSpot, Salesforce, Pipedrive y cualquier CRM via API/webhooks.", "Yes, we integrate with HubSpot, Salesforce, Pipedrive, and any CRM via API/webhooks.") },
      { q: k("Hay periodo de prueba?", "Is there a trial period?"), a: k("Si, 14 dias de prueba gratis con todas las funcionalidades. Sin tarjeta de credito.", "Yes, 14-day free trial with all features. No credit card required.") },
    ],
    policies: k("14 dias de prueba gratis. Cancelacion en cualquier momento. SLA de respuesta < 2s. Datos nunca compartidos.", "14-day free trial. Cancel anytime. Response SLA < 2s. Data never shared."),
    availableSlots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"],
  },

  customer_support: {
    businessName: k("Centro de Soporte", "Support Center"),
    services: [
      { name: k("Soporte por chat", "Chat Support"), price: "Incluido/Included" },
      { name: k("Soporte por email", "Email Support"), price: "Incluido/Included" },
      { name: k("Gestion de devoluciones", "Return Processing"), price: "Incluido/Included" },
      { name: k("Rastreo de pedidos", "Order Tracking"), price: "Incluido/Included" },
      { name: k("Escalado a humano", "Human Escalation"), price: "Incluido/Included" },
    ],
    hours: "24/7",
    faqs: [
      { q: k("Como devuelvo un producto?", "How do I return a product?"), a: k("Tienes 30 dias para devolver. Contactanos con tu numero de pedido y gestionamos la recogida.", "You have 30 days to return. Contact us with your order number and we'll arrange pickup.") },
      { q: k("Donde esta mi pedido?", "Where is my order?"), a: k("Dame tu numero de pedido y te doy el estado exacto con rastreo en tiempo real.", "Give me your order number and I'll provide the exact status with real-time tracking.") },
    ],
    policies: k("Resolucion en primera respuesta objetivo 85%. Escalado a humano en < 2 min cuando necesario. CSAT objetivo > 4.5/5.", "First response resolution target 85%. Human escalation in < 2 min when needed. CSAT target > 4.5/5."),
    availableSlots: [],
  },

  medspa_clinic: {
    businessName: k("Clinica Estetica", "Med Spa Clinic"),
    services: [
      { name: k("Consulta de valoracion (gratis)", "Assessment Consultation (free)"), price: "0", duration: "30min" },
      { name: k("Botox (zona)", "Botox (area)"), price: "250", duration: "30min" },
      { name: k("Acido hialuronico labios", "Lip Filler"), price: "350", duration: "45min" },
      { name: k("Peeling quimico", "Chemical Peel"), price: "120", duration: "45min" },
      { name: k("Laser depilacion (sesion)", "Laser Hair Removal (session)"), price: "80", duration: "30min" },
      { name: k("Microneedling", "Microneedling"), price: "180", duration: "60min" },
      { name: k("Tratamiento PRP facial", "Facial PRP Treatment"), price: "300", duration: "60min" },
      { name: k("Contorno corporal", "Body Contouring"), price: "400", duration: "60min" },
    ],
    hours: "Lunes-Viernes 09:00-20:00, Sabados 10:00-15:00 / Mon-Fri 09:00-20:00, Sat 10:00-15:00",
    faqs: [
      { q: k("El botox es seguro?", "Is Botox safe?"), a: k("Si, el botox es un procedimiento seguro cuando lo realiza un profesional certificado. Nuestros medicos tienen +10 anos de experiencia.", "Yes, Botox is safe when performed by a certified professional. Our doctors have 10+ years of experience.") },
      { q: k("Cuanto dura el efecto del acido hialuronico?", "How long do fillers last?"), a: k("Los resultados duran entre 6-12 meses dependiendo de la zona y el metabolismo de cada persona.", "Results last 6-12 months depending on the area and individual metabolism.") },
      { q: k("Financian los tratamientos?", "Do you offer financing?"), a: k("Si, ofrecemos financiacion sin intereses hasta 12 meses para tratamientos superiores a 500 EUR.", "Yes, we offer interest-free financing up to 12 months for treatments over 500 EUR.") },
    ],
    policies: k("Consulta de valoracion gratuita. Cancelacion con 24h de antelacion. Consentimiento informado obligatorio. Revision gratuita post-tratamiento.", "Free assessment consultation. 24h cancellation notice. Mandatory informed consent. Free post-treatment review."),
    availableSlots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
  },

  real_estate_agent: {
    businessName: k("Inmobiliaria IA", "AI Real Estate"),
    services: [
      { name: k("Valoracion gratuita de propiedad", "Free Property Valuation"), price: "0", duration: "30min" },
      { name: k("Busqueda personalizada de propiedades", "Personalized Property Search"), price: "0" },
      { name: k("Visita guiada presencial", "In-person Guided Tour"), price: "0", duration: "45min" },
      { name: k("Tour virtual 360", "360 Virtual Tour"), price: "0", duration: "20min" },
      { name: k("Gestion de documentacion", "Documentation Management"), price: "Incluido/Included" },
      { name: k("Comision de venta", "Sales Commission"), price: "3-5%" },
    ],
    hours: "Lunes-Sabado 09:00-20:00 / Mon-Sat 09:00-20:00",
    faqs: [
      { q: k("Cual es la comision?", "What is the commission?"), a: k("Nuestra comision es del 3-5% sobre el precio de venta. Para compradores, nuestro servicio es gratuito.", "Our commission is 3-5% of the sale price. For buyers, our service is free.") },
      { q: k("Gestionan los papeles?", "Do you handle paperwork?"), a: k("Si, gestionamos toda la documentacion: contrato de arras, escritura, registro y cambio de titularidad.", "Yes, we handle all documentation: deposit contract, deed, registration, and title transfer.") },
    ],
    policies: k("Valoraciones gratuitas sin compromiso. Visitas coordinadas en 24-48h. Servicio multilingue.", "Free no-obligation valuations. Tours coordinated within 24-48h. Multilingual service."),
    availableSlots: ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00", "19:00"],
  },
};

// Get knowledge for any agent. Falls back to a minimal default.
export function getAgentKnowledge(agentId: string): AgentKnowledge {
  if (AGENT_KNOWLEDGE[agentId]) return AGENT_KNOWLEDGE[agentId];

  return {
    businessName: k("Negocio", "Business"),
    services: [
      { name: k("Consulta", "Consultation"), price: "0" },
    ],
    hours: "Lunes-Viernes 09:00-18:00 / Mon-Fri 09:00-18:00",
    faqs: [],
    policies: k("Consultar politicas con el equipo.", "Check policies with the team."),
    availableSlots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
  };
}
