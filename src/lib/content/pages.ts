/**
 * Textos de ayuda y legales (los únicos textos fijos del sitio, según el brief).
 * Los datos variables (dirección, horarios, mail) se completan con la configuración del local.
 *
 * IMPORTANTE: los textos legales son un borrador. Tienen que revisarlos un abogado o contador
 * antes de publicar el sitio (razón social, CUIT y domicilio legal, plazos y condiciones).
 */
export type Store = { address: string; city: string; province: string; hoursDetail: string; email: string };

export type Section = { title?: string; paragraphs?: string[]; list?: string[] };
export type ContentPage = { title: string; description: string; sections: (store: Store) => Section[] };

export const HELP_PAGES: Record<string, ContentPage> = {
  "como-comprar": {
    title: "Cómo comprar",
    description: "Comprá en tres pasos, con cuotas sin interés y envío a todo el país.",
    sections: () => [
      {
        list: [
          "Elegí tu par, el color y el talle. Si dudás del talle, mirá la guía de talles.",
          "Tocá “Agregar al carrito”. Podés seguir mirando o tocar “Iniciar compra”.",
          "Completá tus datos, elegí cómo te llega (domicilio, sucursal o retiro en el local) y pagá con tarjeta.",
          "Te llega un mail con el número de pedido. Cuando lo despachamos, te mandamos el seguimiento.",
        ],
      },
      {
        title: "Medios de pago",
        paragraphs: [
          "Tarjetas de crédito y débito a través de Payway. Las cuotas sin interés vigentes se muestran en cada producto y en el checkout.",
          "No guardamos los datos de tu tarjeta: el pago se procesa de forma segura en Payway.",
          "Efectivo en Pago Fácil o Rapipago: al terminar la compra te damos un código de pago. Tenés 3 días para pagarlo y preparamos tu pedido cuando se acredita.",
        ],
      },
    ],
  },
  envios: {
    title: "Envíos",
    description: "Andreani y Correo Argentino a todo el país, o retiro gratis en el local.",
    sections: (s) => [
      {
        paragraphs: [
          "Enviamos a todo el país con Andreani y Correo Argentino, a domicilio o a sucursal. El costo y el plazo se calculan con tu código postal en el producto, el carrito o el checkout.",
          `También podés retirar gratis en el local: ${s.address}, ${s.city}. Te avisamos por mail cuando esté listo. Traé tu DNI.`,
        ],
      },
      {
        title: "Plazos",
        paragraphs: [
          "Despachamos dentro de las 48 h hábiles de acreditado el pago. El plazo de la empresa de envío corre desde el despacho.",
          "Cuando sale, te mandamos el número de seguimiento por mail y lo ves en “Mis pedidos”.",
        ],
      },
    ],
  },
  "cambios-y-devoluciones": {
    title: "Cambios y devoluciones",
    description: "Cambiá gratis en el local dentro de los 30 días.",
    sections: (s) => [
      {
        title: "Cambios",
        list: [
          `Cambiá gratis en el local de ${s.address}, ${s.city}, dentro de los 30 días de recibida la compra.`,
          "El par tiene que estar sin uso, con su caja y etiqueta.",
          "Si no podés acercarte, escribinos por WhatsApp y coordinamos el envío (el costo del envío corre por tu cuenta, salvo falla).",
        ],
      },
      {
        title: "Productos con falla",
        paragraphs: ["Si tu par tiene una falla, escribinos con una foto. Lo cambiamos o te devolvemos el dinero, y el envío corre por nuestra cuenta."],
      },
      {
        title: "Arrepentimiento",
        paragraphs: [
          "Tenés 10 días corridos desde que recibís el producto para arrepentirte de la compra, sin dar motivos (Ley 24.240, art. 34). Usá el botón de arrepentimiento al pie de la página.",
        ],
      },
    ],
  },
  "guia-de-talles": {
    title: "Guía de talles",
    description: "Medí tu pie y encontrá tu talle.",
    sections: () => [
      {
        list: [
          "Apoyá el talón contra una pared, sobre una hoja.",
          "Marcá la punta del dedo más largo y medí en centímetros.",
          "Buscá el largo en la tabla. Si estás entre dos talles, elegí el más grande.",
        ],
      },
      {
        title: "Adultos",
        list: ["35 · 22,5 cm", "36 · 23 cm", "37 · 23,8 cm", "38 · 24,5 cm", "39 · 25,2 cm", "40 · 26 cm", "41 · 26,7 cm", "42 · 27,3 cm", "43 · 28 cm", "44 · 28,7 cm", "45 · 29,4 cm", "46 · 30,1 cm"],
      },
      {
        title: "Niños",
        list: ["16 · 10 cm", "17 · 10,7 cm", "18 · 11,3 cm", "19 · 12 cm", "20 · 12,6 cm", "21 · 13,3 cm", "22 · 14 cm", "23 · 14,6 cm", "24 · 15,2 cm", "25 · 15,9 cm", "26 · 16,5 cm", "27 · 17 cm", "28 · 17,8 cm", "29 · 18,5 cm", "30 · 19 cm", "31 · 19,8 cm", "32 · 20,5 cm", "33 · 21 cm", "34 · 21,7 cm"],
      },
      { paragraphs: ["Medidas orientativas: pueden variar según el modelo. Si tenés dudas, escribinos por WhatsApp."] },
    ],
  },
  "preguntas-frecuentes": {
    title: "Preguntas frecuentes",
    description: "Las dudas más comunes sobre compras, envíos y cambios.",
    sections: (s) => [
      { title: "¿Tienen local?", paragraphs: [`Sí: ${s.address}, ${s.city}, ${s.province}. ${s.hoursDetail}.`] },
      { title: "¿Puedo pagar en cuotas sin interés?", paragraphs: ["Sí. Las promos vigentes se ven arriba de todo, en cada producto y en el checkout."] },
      { title: "¿Cuánto tarda el envío?", paragraphs: ["Depende de tu código postal y de la empresa. Lo ves antes de pagar, con el precio."] },
      { title: "¿Puedo retirar en el local?", paragraphs: ["Sí, es gratis. Elegí “Retiro en el local” en el checkout y te avisamos cuando esté listo."] },
      { title: "¿Cómo sigo mi pedido?", paragraphs: ["Con el número de seguimiento que te mandamos por mail cuando despachamos."] },
    ],
  },
};

export const LEGAL_PAGES: Record<string, ContentPage> = {
  "terminos-y-condiciones": {
    title: "Términos y condiciones",
    description: "Condiciones de uso y de compra en la tienda online de Albertito Calzados.",
    sections: (s) => [
      {
        paragraphs: [
          `Estas condiciones rigen las compras en este sitio, operado por Albertito Calzados, con local en ${s.address}, ${s.city}, ${s.province}. [Completar razón social, CUIT y domicilio legal.]`,
          "Al comprar aceptás estas condiciones. Las podemos actualizar; rige la versión vigente al momento de tu compra.",
        ],
      },
      {
        title: "Precios y stock",
        paragraphs: [
          "Los precios están expresados en pesos argentinos con IVA incluido. Las promociones rigen dentro de las fechas indicadas y hasta agotar stock.",
          "La compra queda confirmada cuando el pago se acredita. Si un producto se quedara sin stock después del pago, te devolvemos el importe completo o te ofrecemos un cambio.",
        ],
      },
      {
        title: "Pagos",
        paragraphs: ["Los pagos con tarjeta se procesan a través de Payway. No almacenamos los datos de tu tarjeta."],
      },
      {
        title: "Envíos, cambios y arrepentimiento",
        paragraphs: [
          "Los envíos, cambios y devoluciones se rigen por lo informado en las páginas de Ayuda.",
          "Podés revocar la compra dentro de los 10 días corridos desde la entrega (Ley 24.240, art. 34) con el botón de arrepentimiento.",
        ],
      },
      {
        title: "Defensa del consumidor",
        paragraphs: [
          "Ante cualquier reclamo, podés contactarnos o acudir a la Dirección Nacional de Defensa del Consumidor (argentina.gob.ar/produccion/defensadelconsumidor) o a la autoridad de tu provincia.",
        ],
      },
    ],
  },
  privacidad: {
    title: "Políticas de privacidad",
    description: "Qué datos usamos, para qué y cómo ejercer tus derechos.",
    sections: (s) => [
      {
        title: "Qué datos usamos",
        paragraphs: [
          "Los que nos das al comprar (nombre, DNI, mail, teléfono y dirección) para procesar y enviar tu pedido, y tu mail y preferencias si te suscribís al newsletter.",
          "No guardamos los datos de tu tarjeta.",
        ],
      },
      {
        title: "Para qué",
        list: ["Procesar pagos y envíos.", "Avisarte del estado de tu pedido.", "Mandarte ofertas, solo si te suscribiste (te podés dar de baja cuando quieras)."],
      },
      {
        title: "Con quién los compartimos",
        paragraphs: ["Solo con quienes los necesitan para tu compra: el procesador de pagos (Payway) y la empresa de envío elegida."],
      },
      {
        title: "Tus derechos",
        paragraphs: [
          `Podés pedir acceso, rectificación o supresión de tus datos escribiendo a ${s.email} (Ley 25.326). La Agencia de Acceso a la Información Pública es el órgano de control.`,
        ],
      },
    ],
  },
};

export const ABOUT_PAGE: ContentPage = {
  title: "Nosotros",
  description: "Desde 1977, parte de tu historia.",
  sections: (s) => [
    {
      paragraphs: [
        "Hay lugares que, con el paso del tiempo, se convierten en parte de nuestra historia. Desde 1977, en Albertito Calzados acompañamos los pasos de cada familia de Villa Mercedes.",
        "Generaciones enteras eligieron acá su primer par de zapatitos, el calzado del cole, el del trabajo y el de salir.",
        "Nuestra esencia sigue siendo la misma: variedad, buenos precios y atención de barrio, para que toda la familia encuentre su par.",
      ],
    },
    { title: "Visitanos", paragraphs: [`${s.address}, ${s.city}, ${s.province}. ${s.hoursDetail}.`] },
  ],
};
