import type { ImageAsset } from "./types";

/*
 * DEMO ONLY — third-party artwork from Danbooru (general-rated posts) used to
 * judge the layout with real art. Every image belongs to its artist (see
 * `source`). Files are downloaded by `npm run demo:art` into the git-ignored
 * `public/demo-art/` folder and never committed. Never ship this to a public
 * deployment; replace with uploads from consenting artists before going live.
 */

type DemoImage = ImageAsset & { remote: string; source: string };

const cdn = (path: string) => `https://cdn.donmai.us/${path}`;

export const demoImages = {
  // Mira — anime illustration / backgrounds
  valleyBanner: {
    src: "/demo-art/valley-banner.jpg",
    remote: cdn("original/94/43/944364e77f56183e2ebd75de757488e2.jpg"),
    alt: "Painted mountain valley with a river under a wide cloudy sky",
    width: 3000,
    height: 1500,
    source: "https://danbooru.donmai.us/posts/4000000 (philipp_urlich)",
  },
  miraAvatar: {
    src: "/demo-art/mira-avatar.jpg",
    remote: cdn("original/1d/3d/1d3d2ed12428db25182626e7ef04ae2e.jpg"),
    alt: "Mira Solenne",
    width: 896,
    height: 1344,
    focus: "50% 22%",
    source: "https://danbooru.donmai.us/posts/6736427 (meola)",
  },
  sunsetReflection: {
    src: "/demo-art/sunset-reflection.jpg",
    remote: cdn("sample/ec/d8/sample-ecd8419214169e704b28678076386690.jpg"),
    alt: "A girl watching a blazing sunset mirrored on still water",
    width: 850,
    height: 992,
    source: "https://danbooru.donmai.us/posts/12348891 (kenzo_093)",
  },
  skyWhirl: {
    src: "/demo-art/sky-whirl.jpg",
    remote: cdn("original/62/90/629065d181de330185f160f37d092992.jpg"),
    alt: "A spiralling island of water and forest suspended in the sky",
    width: 1429,
    height: 2200,
    source: "https://danbooru.donmai.us/posts/769829 (mugon)",
  },
  snowVillage: {
    src: "/demo-art/snow-village.jpg",
    remote: cdn("original/c6/35/c635c2a750af06c64afb0ee2979a4fa5.jpg"),
    alt: "A snowy mountain village at night under a bright moon",
    width: 1400,
    height: 1980,
    source: "https://danbooru.donmai.us/posts/844355 (fo~do)",
  },
  rainyRoad: {
    src: "/demo-art/rainy-road.png",
    remote: cdn("original/36/85/3685e1c2334fdc18f543222444797ea8.png"),
    alt: "A girl standing by a rain-soaked road at dusk with car lights glowing",
    width: 2000,
    height: 1125,
    source: "https://danbooru.donmai.us/posts/2657504 (shion_(mirudakemann))",
  },
  cityRain: {
    src: "/demo-art/city-rain.jpg",
    remote: cdn("original/e1/41/e1418db3daeac6f5cad91d0dd7f91bec.jpg"),
    alt: "A figure on a rooftop above a flooded blue city",
    width: 848,
    height: 1200,
    source: "https://danbooru.donmai.us/posts/2339544 (yoshida_seiji)",
  },
  amberCity: {
    src: "/demo-art/amber-city.jpg",
    remote: cdn("sample/82/de/sample-82de5007f952623f5c85da828eeb5e62.jpg"),
    alt: "A dense amber-lit city stacked into the night",
    width: 850,
    height: 1234,
    source: "https://danbooru.donmai.us/posts/476954 (cii_(cii0000))",
  },

  // Kai — furry characters / adoptables
  heroBanner: {
    src: "/demo-art/hero-banner.jpg",
    remote: cdn("original/8e/2e/8e2e25501cbaf143fda1890f49ddf819.jpg"),
    alt: "A cheerful tiger character celebrating with a colorful banner",
    width: 1138,
    height: 640,
    source: "https://danbooru.donmai.us/posts/12287705 (musou_luf)",
  },
  kaiAvatar: {
    src: "/demo-art/kai-avatar.jpg",
    remote: cdn("original/2e/11/2e117ebcd180e3f7ef8e81dd0ff39a3f.jpg"),
    alt: "Kai Rivers",
    width: 2480,
    height: 3010,
    focus: "50% 18%",
    source: "https://danbooru.donmai.us/posts/12283062 (ao_gravity)",
  },
  bunnyAdopt: {
    src: "/demo-art/bunny-adopt.jpg",
    remote: cdn("original/00/cc/00cc2393e23e368533a085d4a9133778.jpg"),
    alt: "A pink-haired bunny character in a teal jacket",
    width: 836,
    height: 930,
    source: "https://danbooru.donmai.us/posts/12305387 (o-rindou5100)",
  },
  campfire: {
    src: "/demo-art/campfire.jpg",
    remote: cdn("original/27/0f/270fb1beadcb2cb12fc74429d056671a.jpg"),
    alt: "Two characters sharing stories by a campfire at night",
    width: 1200,
    height: 1500,
    source: "https://danbooru.donmai.us/posts/12276501 (amida_murasaki)",
  },
  pinkBunny: {
    src: "/demo-art/pink-bunny.jpg",
    remote: cdn("sample/a5/89/sample-a5890991b680d9a227b5f2aa39a2d786.jpg"),
    alt: "A bunny character with long pink braids on a cream background",
    width: 850,
    height: 1057,
    source: "https://danbooru.donmai.us/posts/12250442 (nattsu_(mimimi_me56))",
  },
  plushBunny: {
    src: "/demo-art/plush-bunny.jpg",
    remote: cdn("sample/f8/75/sample-f8752d404982fba7b839ce080372b53b.jpg"),
    alt: "A soft bunny character holding a plush toy",
    width: 850,
    height: 1063,
    source: "https://danbooru.donmai.us/posts/12298010 (sousucloud28)",
  },
} satisfies Record<string, DemoImage>;
