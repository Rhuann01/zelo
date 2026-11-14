export type BannerNicho = "barbearia" | "manicure" | "salao" | "estetica" | "outro";

export interface PresetBanner {
  id: string;
  label: string;
  src: string;
  nicho: BannerNicho;
}

export const PRESET_BANNERS: PresetBanner[] = [
  // Barbearia
  { id: "barbeiro01", label: "Barbearia Clássica", src: "/banners/barbeiro01.webp", nicho: "barbearia" },
  { id: "barbeiro02", label: "Corte & Navalha", src: "/banners/barbeiro02.webp", nicho: "barbearia" },

  // Manicure
  { id: "manicure01", label: "Manicure & Spa", src: "/banners/manicure01.webp", nicho: "manicure" },
  { id: "manicure03", label: "Nails & Esmaltação", src: "/banners/manicure03.webp", nicho: "manicure" },
  { id: "manicure04", label: "Studio de Unhas", src: "/banners/manicure04.webp", nicho: "manicure" },

  // Salão & Cabelo
  { id: "cabelaria01", label: "Salão Moderno", src: "/banners/cabelaria01.webp", nicho: "salao" },
  { id: "cabelaria02", label: "Cabelos & Estilo", src: "/banners/cabelaria02.webp", nicho: "salao" },
  { id: "cabelaria03", label: "Espaço Hair", src: "/banners/cabelaria03.webp", nicho: "salao" },

  // Estética
  { id: "estetica01", label: "Estética Facial", src: "/banners/estetica01.webp", nicho: "estetica" },
  { id: "estetica02", label: "Cílios & Design", src: "/banners/estetica02.webp", nicho: "estetica" },
  { id: "estetica03", label: "Clínica & Bem-estar", src: "/banners/estetica03.webp", nicho: "estetica" },

  // Outros (aparecem para TODOS os nichos)
  { id: "outros01", label: "Ambiente Minimalista", src: "/banners/outros01.webp", nicho: "outro" },
  { id: "outros02", label: "Recepção Aconchegante", src: "/banners/outros02.webp", nicho: "outro" },
  { id: "outros03", label: "Textura Editorial", src: "/banners/outros03.webp", nicho: "outro" },
  { id: "outros04", label: "Atendimento VIP", src: "/banners/outros04.webp", nicho: "outro" },
];

/**
 * Retorna os banners específicos do nicho da loja + os banners universais ("outro").
 */
export function getBannersForNicho(nicho: string): PresetBanner[] {
  const normalized = nicho.toLowerCase();
  return PRESET_BANNERS.filter(
    (b) => b.nicho === normalized || b.nicho === "outro"
  );
}
