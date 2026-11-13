import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLojaPublicaBySlug } from "@/lib/public/get-loja-publica";
import { LojaPublicaView } from "@/components/loja-publica-view";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLojaPublicaBySlug(slug);
  if (!data) {
    return { title: "Espaço não encontrado — Zelo" };
  }

  const local = [data.loja.bairro, data.loja.cidade].filter(Boolean).join(", ");
  return {
    title: `${data.loja.nome} — Agendamento Online | Zelo`,
    description: local
      ? `Agende seu horário em ${data.loja.nome} (${local}) sem espera.`
      : `Agende seu horário em ${data.loja.nome} online com confirmação imediata.`,
  };
}

export default async function LojaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getLojaPublicaBySlug(slug);

  if (!data) {
    notFound();
  }

  return (
    <LojaPublicaView
      loja={data.loja}
      servicos={data.servicos}
      profissionais={data.profissionais}
    />
  );
}
