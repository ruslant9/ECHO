import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import QueryProvider from "@/app/providers/QueryProvider";
import ApolloProviderWrapper from "@/app/providers/ApolloProviderWrapper";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SocketProvider } from "@/context/SocketContext";
import { EmojiProvider } from "@/context/EmojiContext";
import { MusicProvider } from "@/context/MusicPlayerContext"; // <--- ИМПОРТ 1
import BottomPlayer from "@/components/music/BottomPlayer"; // <--- ИМПОРТ 2

const madeDillan = localFont({
  src: [
    {
      path: "../fonts/MadeDillan.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-dillan",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Echo | Social Network",
  description: "Платформа для общения.",
};

// Скрипт предотвращает FOUC (мигание темы)
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>

      <body
        className={`${madeDillan.variable} font-sans antialiased bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100 transition-colors duration-300 min-h-screen`}
      >
        <ApolloProviderWrapper>
          <QueryProvider>
            <ThemeProvider>
              <SocketProvider>
                <NotificationProvider>
                  <EmojiProvider>
                    {/* ОБЕРТКА МУЗЫКАЛЬНЫМ ПРОВАЙДЕРОМ */}
                    <MusicProvider> 
                      {children}
                      {/* ПЛЕЕР БУДЕТ ВИДЕН ВЕЗДЕ */}
                      <BottomPlayer />
                    </MusicProvider>
                  </EmojiProvider>
                </NotificationProvider>
              </SocketProvider>
            </ThemeProvider>
          </QueryProvider>
        </ApolloProviderWrapper>

        <div id="portals" />
      </body>
    </html>
  );
}