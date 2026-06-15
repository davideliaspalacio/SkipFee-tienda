export const COP = (n: number): string =>
  '$' + new Intl.NumberFormat('es-CO').format(Math.round(n));

export interface Zone {
  id: string;
  name: string;
  tarifa: number;
  /** @deprecated hora pico eliminada; ya no se usa. */
  recargo: number;
  color: string;
  lat: number;
  lng: number;
  archived?: boolean;
  /** Polígono de cobertura: vértices [{lat,lng}] (≥3). null/ausente = sin dibujar. */
  coverage?: Array<{ lat: number; lng: number }> | null;
  /** Respaldo: radio en metros desde (lat,lng) si no hay polígono. */
  coverageRadiusM?: number | null;
}

export const ZONES: Zone[] = [
  { id: 'poblado',  name: 'El Poblado', tarifa: 4500, recargo: 1500, color: '#E85D04', lat: 6.2087, lng: -75.5658 },
  { id: 'envigado', name: 'Envigado',   tarifa: 5500, recargo: 2000, color: '#606C38', lat: 6.1696, lng: -75.5921 },
  { id: 'laureles', name: 'Laureles',   tarifa: 5000, recargo: 1500, color: '#5E6AD2', lat: 6.2486, lng: -75.5933 },
  { id: 'fatima',   name: 'Fátima',     tarifa: 6000, recargo: 2000, color: '#A16207', lat: 6.2364, lng: -75.6028 },
];

// El origen de los domicilios (kitchen / dispatch start) ahora vive en `settings`
// y se edita desde Configuración → Local. Las pantallas Despachos y
// PedidoDetailPanel lo obtienen vía `useSettings()`.

export interface Product {
  id: string;
  name: string;
  price: number;
  cat: string;
  sold: number;
  available: boolean;
  img: string;
  /** Descripción opcional. `null` si el operario no llenó el campo. */
  description: string | null;
}

export type StatusId = 'nuevo' | 'pagado' | 'cocina' | 'empacado' | 'ruta' | 'entregado';

export interface Status {
  id: StatusId;
  label: string;
  color: string;
}

export const STATUSES: Status[] = [
  { id: 'nuevo',     label: 'Nuevo',     color: '#5E6AD2' },
  { id: 'pagado',    label: 'Pagado',    color: '#0EA5E9' },
  { id: 'cocina',    label: 'En cocina', color: '#B45309' },
  { id: 'empacado',  label: 'Empacado',  color: '#A16207' },
  { id: 'ruta',      label: 'En ruta',   color: '#15803D' },
  { id: 'entregado', label: 'Entregado', color: '#52525B' },
];

export interface Customer {
  id: string;
  name: string;
  phone: string;
  addr: string;
  zone: string;
  pedidos: number;
  ticket: number;
  /** ISO `created_at` del último pedido entregado, o `null` si nunca pidió. */
  ultimo: string | null;
  tag: 'VIP' | 'Recurrente' | 'Nuevo';
}

export const CUSTOMERS: Customer[] = [
  { id: 'u01', name: 'María Camila Ruiz',     phone: '+57 312 645 1209', addr: 'Cra. 35 #8-71, El Poblado',         zone: 'poblado',  pedidos: 14, ticket: 38500, ultimo: '2026-06-07T17:42:00Z', tag: 'VIP' },
  { id: 'u02', name: 'Andrés Felipe Ochoa',   phone: '+57 304 117 8821', addr: 'Cl. 33 #74-12, Laureles',           zone: 'laureles', pedidos: 9,  ticket: 41200, ultimo: '2026-06-06T00:08:00Z', tag: 'Recurrente' },
  { id: 'u03', name: 'Laura Mejía Jaramillo', phone: '+57 320 558 0033', addr: 'Cl. 37 Sur #28-04, Envigado',       zone: 'envigado', pedidos: 22, ticket: 45100, ultimo: '2026-06-07T16:18:00Z', tag: 'VIP' },
  { id: 'u04', name: 'Santiago Hoyos',        phone: '+57 318 902 6614', addr: 'Cra. 80 #44-21, Laureles',          zone: 'laureles', pedidos: 3,  ticket: 29800, ultimo: '2026-06-04T18:00:00Z', tag: 'Recurrente' },
  { id: 'u05', name: 'Valentina Cardona',     phone: '+57 312 332 8941', addr: 'Cra. 43A #11-50, El Poblado',       zone: 'poblado',  pedidos: 1,  ticket: 26000, ultimo: '2026-06-01T20:00:00Z', tag: 'Nuevo' },
  { id: 'u06', name: 'Miguel Ángel Posada',   phone: '+57 301 412 7700', addr: 'Cra. 78 #50A-30, Laureles',         zone: 'laureles', pedidos: 17, ticket: 39400, ultimo: '2026-06-06T18:55:00Z', tag: 'VIP' },
  { id: 'u07', name: 'Daniela Arango',        phone: '+57 320 887 1102', addr: 'Cl. 12 Sur #43E-20, El Poblado',    zone: 'poblado',  pedidos: 5,  ticket: 33700, ultimo: '2026-06-07T15:30:00Z', tag: 'Recurrente' },
  { id: 'u08', name: 'Juan Pablo Tobón',      phone: '+57 318 045 9912', addr: 'Cra. 47 #32 Sur-110, Envigado',     zone: 'envigado', pedidos: 11, ticket: 42100, ultimo: '2026-06-05T19:00:00Z', tag: 'VIP' },
  { id: 'u09', name: 'Catalina Builes',       phone: '+57 312 776 4413', addr: 'Cl. 18 #41-22, El Poblado',         zone: 'poblado',  pedidos: 6,  ticket: 35200, ultimo: '2026-06-07T16:55:00Z', tag: 'Recurrente' },
  { id: 'u10', name: 'Mateo Restrepo Salazar',phone: '+57 304 559 8814', addr: 'Cra. 73 #B-21, Fátima',             zone: 'fatima',   pedidos: 2,  ticket: 28400, ultimo: '2026-06-02T18:00:00Z', tag: 'Nuevo' },
];

export interface Order {
  id: string;
  number: number;
  cliente: string;
  items: string;
  itemList: string[];
  total: number;
  /** Propina que dejó el cliente en la tienda web (ya incluida en `total`). 0 si no dejó. */
  tip: number;
  /** Porcentaje elegido si usó el botón "10%"; null si fue monto custom o sin propina. */
  tipPercent: number | null;
  zone: string;
  zoneName: string;
  status: StatusId;
  /** Pedido sin pagar aún (borrador con carrito o pago iniciado). Se muestra en "Nuevo" con distintivo y no se arrastra. */
  unpaid?: boolean;
  /** Cocinero asignado (cola por carga + horario al pagar). undefined = sin asignar. */
  cookId?: string;
  cookName?: string;
  minutos: number;
  address: string;
  phone: string;
  paymentMethod: string;
  note: string | null;
  lat: number;
  lng: number;
}

const ORDER_SAMPLES = [
  { items: '2× Pastrami Bros, 1× Coca Zero',    total: 62500 },
  { items: '1× Cubano, 1× Limonada de coco',    total: 34500 },
  { items: '3× Porchetta, 2× Cerveza Club',     total: 112000 },
  { items: '1× Pollo Buffalo, 1× Brownie',      total: 36000 },
  { items: '2× Reuben Brisket, 1× Agua gas',    total: 65500 },
  { items: '1× Combo Pastrami + Coca',          total: 32000 },
  { items: '1× Smash Burger, 1× Cheesecake',    total: 38000 },
  { items: '2× Veggie Bros, 2× Limonada',       total: 61000 },
  { items: '1× Pastrami Bros, 1× Cerveza',      total: 36000 },
  { items: '1× Combo Cubano + Cerveza',         total: 31000 },
];

const FIRST = ['María Camila','Andrés','Laura','Santiago','Valentina','Miguel','Daniela','Juan Pablo','Catalina','Mateo','Sofía','Tomás','Isabela','Felipe','Manuela','Sergio','Antonia','Emilio','Mariana','Nicolás'];
const LAST  = ['Ruiz','Ochoa','Mejía','Hoyos','Cardona','Posada','Arango','Tobón','Builes','Salazar','Vélez','Aristizábal','Quintero','Jaramillo','Echavarría'];

const seed = (initial: number) => {
  let n = initial;
  return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; };
};
const rnd = seed(42);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

const statusDist: StatusId[] = [
  'nuevo','nuevo','nuevo','pagado','pagado','cocina','cocina','cocina',
  'empacado','empacado','empacado','empacado','empacado','ruta','ruta','ruta',
  'entregado','entregado','entregado','entregado',
];

export const ORDERS: Order[] = (() => {
  const out: Order[] = [];
  for (let i = 0; i < 50; i++) {
    const sample = ORDER_SAMPLES[i % ORDER_SAMPLES.length];
    const zone = pick(ZONES);
    const status = statusDist[i % statusDist.length];
    const min = status === 'entregado'
      ? 35 + Math.floor(rnd() * 60)
      : Math.floor(rnd() * 50) + 2;
    const baseTotal = sample.total + Math.floor(rnd() * 6) * 1000;
    const tip = rnd() > 0.6 ? 2000 + Math.floor(rnd() * 4) * 1000 : 0;
    out.push({
      id: String(50 - i).padStart(3, '0'),
      number: 50 - i,
      cliente: pick(FIRST) + ' ' + pick(LAST),
      items: sample.items,
      itemList: sample.items.split(', '),
      total: baseTotal + tip,
      tip,
      tipPercent: tip > 0 && rnd() > 0.5 ? 10 : null,
      zone: zone.id,
      zoneName: zone.name,
      status,
      minutos: min,
      address: pick(['Cra. 35 #8-71','Cl. 33 #74-12','Cra. 43A #11-50','Cl. 37 Sur #28-04','Cra. 80 #44-21','Cl. 12 Sur #43E-20']) + ', ' + zone.name,
      phone: '+57 3' + String(Math.floor(rnd() * 90 + 10)) + ' ' + String(Math.floor(rnd() * 900 + 100)) + ' ' + String(Math.floor(rnd() * 9000 + 1000)),
      paymentMethod: rnd() > 0.4 ? 'Wompi · Tarjeta' : 'Wompi · PSE',
      note: rnd() > 0.7 ? pick(['Sin cebolla, gracias','Empacar aparte por favor','Tocar timbre, no llamar','Pan integral si pueden']) : null,
      lat: zone.lat + (rnd() - 0.5) * 0.024,
      lng: zone.lng + (rnd() - 0.5) * 0.024,
    });
  }
  return out;
})();

export const SALES_7D = [
  { day: 'Lun', sales: 1180000, orders: 38 },
  { day: 'Mar', sales: 1410000, orders: 46 },
  { day: 'Mié', sales: 1320000, orders: 44 },
  { day: 'Jue', sales: 1520000, orders: 51 },
  { day: 'Vie', sales: 1860000, orders: 58 },
  { day: 'Sáb', sales: 2240000, orders: 67 },
  { day: 'Dom', sales: 1950000, orders: 55 },
];

export const HOURLY_HEATMAP: number[][] = (() => {
  const rows: number[][] = [];
  for (let d = 0; d < 7; d++) {
    const row: number[] = [];
    for (let h = 0; h < 12; h++) {
      let v = 0.1 + (h >= 1 && h <= 3 ? 0.5 : 0) + (h >= 7 && h <= 10 ? 0.7 : 0);
      v += rnd() * 0.25;
      if (d >= 4) v += 0.18;
      row.push(Math.min(1, v));
    }
    rows.push(row);
  }
  return rows;
})();

export type ChatStatus = 'bot' | 'human' | 'pending';

export interface Chat {
  id: string;
  name: string;
  phone: string;
  last: string;
  time: string;
  unread: number;
  status: ChatStatus;
  zone: string;
  prevOrders: number;
  avgTicket: number;
}

export const CHATS: Chat[] = [
  { id: 'ch1', name: 'María Camila Ruiz',       phone: '+57 312 645 1209', last: '¿Tienen Pastrami Bros disponible?', time: '12:42', unread: 0, status: 'bot',     zone: 'poblado',  prevOrders: 13, avgTicket: 38500 },
  { id: 'ch2', name: 'Andrés Felipe Ochoa',     phone: '+57 304 117 8821', last: 'No me llegó el código de Wompi…',   time: '12:38', unread: 2, status: 'human',   zone: 'laureles', prevOrders: 9,  avgTicket: 41200 },
  { id: 'ch3', name: 'Carlos Mauricio Bedoya',  phone: '+57 312 901 7733', last: 'Listo, va para allá entonces',      time: '12:31', unread: 0, status: 'bot',     zone: 'envigado', prevOrders: 4,  avgTicket: 32100 },
  { id: 'ch4', name: 'Sofía Restrepo',          phone: '+57 318 904 5512', last: 'Hola! Quiero hacer un pedido grande',time: '12:25', unread: 1, status: 'pending', zone: 'poblado',  prevOrders: 0,  avgTicket: 0 },
  { id: 'ch5', name: 'Tomás Aristizábal',       phone: '+57 301 442 1188', last: '¿Aceptan Nequi?',                    time: '12:18', unread: 1, status: 'human',   zone: 'fatima',   prevOrders: 2,  avgTicket: 28800 },
  { id: 'ch6', name: 'Laura Mejía',             phone: '+57 320 558 0033', last: 'Gracias, todo perfecto 🙌',          time: '11:51', unread: 0, status: 'bot',     zone: 'envigado', prevOrders: 22, avgTicket: 45100 },
  { id: 'ch7', name: 'Felipe Quintero',         phone: '+57 312 088 9921', last: '¿Cuánto se demora?',                 time: '11:44', unread: 0, status: 'bot',     zone: 'laureles', prevOrders: 6,  avgTicket: 36200 },
  { id: 'ch8', name: 'Isabela Hoyos',           phone: '+57 304 311 5566', last: 'Pongan 2 brownies por fa',           time: '11:28', unread: 0, status: 'bot',     zone: 'poblado',  prevOrders: 11, avgTicket: 41500 },
];

export interface ChatMessage {
  who: 'bot' | 'in' | 'out';
  text: string;
  time: string;
  mediaUrl?: string | null;
}

export const CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  ch2: [
    { who: 'bot', text: '¡Hola Andrés! Soy el bot de Bros and Subs 🤖 ¿Qué te provoca hoy?', time: '12:30' },
    { who: 'in',  text: 'Quiero 1 Pastrami Bros y 1 Cubano para llevar', time: '12:31' },
    { who: 'bot', text: 'Perfecto. Confirmo: 1× Pastrami Bros ($28.000) + 1× Cubano ($26.000) = $54.000. ¿Dirección igual a la última (Cl. 33 #74-12, Laureles)?', time: '12:31' },
    { who: 'in',  text: 'Sí, misma dirección', time: '12:32' },
    { who: 'bot', text: 'Listo. Te envío link de pago Wompi en un segundo.', time: '12:32' },
    { who: 'bot', text: 'https://wompi.co/checkout/abc123… Total: $58.500 (incluye domicilio $4.500)', time: '12:33' },
    { who: 'in',  text: 'No me llegó el código de Wompi…', time: '12:38' },
  ],
};

export const FINANCIAL_30D = {
  bruto: 48700000,
  domicilios: -5100000,
  comisiones: -1460000,
  neto: 42140000,
  variation: 18.4,
};

export const REVIEWS = {
  ratingAvg: 4.82,
  reviewsGoogle: 47,
  cuponesUsados: 23,
  postventaResponses: 142,
};
