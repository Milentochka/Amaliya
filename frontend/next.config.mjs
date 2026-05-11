/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "foni.papik.pro" },
      { protocol: "https", hostname: "png.klev.club" },
      { protocol: "https", hostname: "papik.pro" },
      { protocol: "https", hostname: "kartinki.pibig.info" },
      { protocol: "https", hostname: "kartinkof.club" },
      { protocol: "https", hostname: "slovnet.ru" },
      { protocol: "https", hostname: "kartinki.pics" },
      { protocol: "https", hostname: "memax.club" },
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "licensingrussia.ru" },
      { protocol: "https", hostname: "kulturologia.ru" },
      { protocol: "https", hostname: "static.kinoafisha.info" },
      { protocol: "https", hostname: "avatars.mds.yandex.net" },
      { protocol: "https", hostname: "cafehinkalnaya.ru" },
    ],
  },
};

export default nextConfig;
