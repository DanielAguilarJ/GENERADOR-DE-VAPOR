import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Generador de Vapor Fresnel',
  description: 'Simulador Termodinámico de un Concentrador Solar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}