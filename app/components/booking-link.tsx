'use client';
import { useState } from 'react';

export default function BookingLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  // Keep server and first client render identical to avoid hydration mismatch.
  const path = `/agendar/${slug}`;

  async function copy() {
    const absoluteUrl = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copie seu link de agendamento:', absoluteUrl);
    }
  }

  return (
    <div className="booking-link-box">
      <div>
        <small>LINK PÚBLICO DE AGENDAMENTO</small>
        <a href={path} target="_blank" rel="noreferrer">{path}</a>
        <p>Compartilhe pelo WhatsApp, Instagram ou coloque na bio.</p>
      </div>
      <div className="booking-link-actions">
        <a className="btn secondary" href={path} target="_blank" rel="noreferrer">Testar link ↗</a>
        <button className="btn" type="button" onClick={copy}>{copied ? 'Link copiado ✓' : 'Copiar link'}</button>
      </div>
    </div>
  );
}
