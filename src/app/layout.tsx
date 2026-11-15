import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { DeviceTelemetryPing } from "@/components/device-telemetry-ping";
import { ZeloToastViewport } from "@/components/zelo-toast";
import { getSiteUrl } from "@/lib/seo/site-url";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Zelo — Sua agenda online com a cara do seu negócio",
  description:
    "Sistema de agendamento online para barbearias, salões, manicures e estúdios. Página exclusiva, sinal via PIX e lembretes automáticos.",
  keywords: [
    "agendamento online barbearia",
    "sistema para barbearia",
    "agenda online salão de beleza",
    "agendamento manicure",
    "agendamento com sinal pix",
    "Zelo",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zelo",
  },
  openGraph: {
    title: "Zelo — Sua agenda online com a cara do seu negócio",
    description:
      "Crie a página exclusiva do seu negócio com sua cor, seu formato, agendamento sem fila e sinal via PIX.",
    url: "/",
    siteName: "Zelo",
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: "/og-zelo.png",
        width: 1200,
        height: 630,
        alt: "Zelo — Sua agenda online com a cara do seu negócio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zelo — Sua agenda online com a cara do seu negócio",
    description:
      "Página exclusiva de agendamento online com sinal via PIX para barbearias, salões e estúdios.",
    images: ["/og-zelo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF9F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;function sync(){var dark=d.classList.contains('dark');d.style.colorScheme=dark?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',dark?'#0E0E11':'#FAF9F6');}if(localStorage.getItem('zelo_theme')==='dark'){d.classList.add('dark');}sync();new MutationObserver(sync).observe(d,{attributes:true,attributeFilter:['class']});}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <DeviceTelemetryPing />
        <ZeloToastViewport />
        {children}
      </body>
    </html>
  );
}
