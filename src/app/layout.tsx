import Navigation from '../components/Navigation';
import { ThemeProvider } from '../components/ThemeProvider';
import './globals.css';

export const metadata = {
  title: 'AI Flashcards',
  description: 'Master your Japanese and English vocabulary with AI-powered flashcards',
};

// Script to prevent flash of unstyled content
const themeScript = `
  (function() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'dark' || (!stored && prefersDark) ? 'dark' :
                  stored === 'light' ? 'light' :
                  (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.add(theme);
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#fafafa" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased transition-colors">
        <ThemeProvider>
          <Navigation />
          <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
