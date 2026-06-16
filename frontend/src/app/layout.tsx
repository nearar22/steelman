import type { Metadata } from 'next';
import { Libre_Franklin, Newsreader, JetBrains_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';

// Dramatic high-contrast display serif for the big headlines and the case-file
// masthead. This is the "voice" of the dossier.
const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

// Sans grotesque for UI furniture: buttons, kickers, labels, segmented controls.
const ui = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-ui',
  display: 'swap',
});

// Body serif for transcript prose, the human voice of the interrogation.
const body = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

// Monospace for addresses, hashes, counters, and machine meta.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Steelman | On-chain AI debate gauntlet',
  description:
    'Stake a thesis and defend it round by round against an injection-resistant AI adversary. Every ruling settles on-chain under GenLayer validator consensus.',
  openGraph: {
    title: 'Steelman',
    description:
      'An on-chain AI debate gauntlet. Defend your thesis under the lamp; the adversary rules HOLDS, CONCEDES, or COLLAPSES under validator consensus.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${ui.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
