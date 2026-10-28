// League of Legends backgrounds, with source links for each collection.
const artbookSource = "https://artbook.na.leagueoflegends.com/en_US/volume-one";
//const kdaSource = "https://www.leagueoflegends.com/en-us/event/kda-official-fan-club/";
const riftCdn =
  "https://lolstatic-a.akamaihd.net/frontpage/apps/prod/artbook/en_US/f31d8b829b603b4b65fdff2475bd0803ced0179d/assets/content/summoners_rift/";
//const cdn = "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/";

const riftWallpapers = [
  {
    title: "Summoner's Rift · Ancient ruins",
    url: `${riftCdn}00_intro/sr_01.jpg`,
  },
  {
    title: "Summoner's Rift · Mid lane",
    url: `${riftCdn}01_environments/intro_13.jpg`,
  },
  {
    title: "Summoner's Rift · Blue base",
    url: `${riftCdn}01_environments/intro_14.jpg`,
  },
  {
    title: "Summoner's Rift · Valley panorama",
    url: `${riftCdn}16_tenets/tenets_01.jpg`,
  },
  {
    title: "Summoner's Rift · Mountain vista",
    url: `${riftCdn}16_tenets/tenets_03.jpg`,
  },
  {
    title: "Summoner's Rift · Classic map",
    url: `${riftCdn}17_map/map_02.jpg`,
  },
].map((wallpaper) => ({ ...wallpaper, source: artbookSource }));

const additionalWallpapers = [
  {
    title: "League of Legends Classic · Hero artwork",
    url: `${import.meta.env.BASE_URL}wallpapers/league-classic.webp`,
    source: "https://www.leagueoflegends.com/de-de/classic/",
  },
  {
    title: "League of Legends · Classic champions",
    url: `${import.meta.env.BASE_URL}wallpapers/classic-champions.jpg`,
    source: "https://wallpaper-house.com/data/out/8/wallpaper2you_258238.jpg",
  },
  {
    title: "League of Legends · Yasuo, Senna and champions",
    url: `${import.meta.env.BASE_URL}wallpapers/yasuo-senna.jpg`,
    source:
      "https://wallpapercrafter.com/desktop3/978236-Yasuo-Yasuo-League-of-Legends-Senna-League-of.jpg",
  },
];

export const wallpapers = [...riftWallpapers, ...additionalWallpapers];
