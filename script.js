const RELEASE = "https://github.com/hdl/evolution/releases/download/evolution/";
const API = "https://api.github.com/repos/hdl/evolution/releases/tags/evolution";
const NAMES = [
  "CHIPSAlliance", "CoCoTb", "DBHI", "EDAA", "F4PGA", "HDL", "HDLC",
  "LibreCores", "LiteX", "NEORV32", "VTR", "VUnit", "YosysHQ", "ghdl",
  "iverilog", "nvc", "openFPGALoader", "osvb", "osvvm", "renode", "verilator"
];
const FALLBACK = NAMES.map((name) => ({
  name,
  image: RELEASE + name + ".jpg",
  video: RELEASE + name + ".mp4"
}));
const IMAGE = /^(.+)\.(jpe?g|png|gif|webp)$/i;
const VIDEO = /^(.+)\.(mp4|webm|ogg)$/i;
const gallery = document.getElementById("gallery");
const fmt = new Intl.NumberFormat();

function byName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function parseRelease(data) {
  const map = new Map();
  for (const asset of data.assets || []) {
    const image = asset.name.match(IMAGE);
    const video = asset.name.match(VIDEO);
    const match = image || video;
    if (!match) continue;
    const item = map.get(match[1]) || { name: match[1] };
    if (image) item.image = asset.browser_download_url;
    else item.video = asset.browser_download_url;
    map.set(match[1], item);
  }
  return [...map.values()].filter((item) => item.image && item.video);
}

async function discover() {
  let timer;
  try {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(API, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const items = parseRelease(await response.json());
    return items.length ? items : null;
  } catch (error) {
    console.info("Using the built-in asset list:", error.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadMeta(items) {
  try {
    const response = await fetch("metadata.json");
    if (!response.ok) return;
    const meta = await response.json();
    for (const item of items) if (meta[item.name]) item.meta = meta[item.name];
  } catch { /* no metadata: bare cards */ }
}

function loadVideo(video) {
  video.poster = video.dataset.poster;
  video.src = video.dataset.src;
  delete video.dataset.poster;
  delete video.dataset.src;
}

const observer = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const video = entry.target;
        loadVideo(video);
        observer.unobserve(video);
      }
    }, { rootMargin: "300px" })
  : null;

function observePosters() {
  for (const video of gallery.querySelectorAll("video[data-src]")) {
    if (observer) observer.observe(video);
    else loadVideo(video);
  }
}

function card(item) {
  const label = item.meta?.title || item.name;
  const figure = document.createElement("figure");
  figure.className = "card";

  const video = document.createElement("video");
  video.controls = true;
  video.preload = "none";
  video.setAttribute("playsinline", "");
  video.dataset.src = item.video;
  video.dataset.poster = item.image;
  video.setAttribute("aria-label", label + " gource video");

  const error = document.createElement("p");
  error.className = "error";
  error.hidden = true;
  const direct = document.createElement("a");
  direct.href = item.video;
  direct.target = "_blank";
  direct.rel = "noopener";
  direct.textContent = "Open the video directly";
  error.append("Inline playback unavailable. ", direct);
  video.addEventListener("error", () => { error.hidden = false; });

  const caption = document.createElement("figcaption");
  caption.className = "card-head";
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = label;
  const links = document.createElement("span");
  links.className = "links";

  const imageLink = document.createElement("a");
  imageLink.href = item.image;
  imageLink.target = "_blank";
  imageLink.rel = "noopener";
  imageLink.textContent = "🖼️";
  imageLink.title = "Open " + label + " image";
  imageLink.setAttribute("aria-label", "Open " + label + " image");

  const videoLink = document.createElement("a");
  videoLink.href = item.video;
  videoLink.target = "_blank";
  videoLink.rel = "noopener";
  videoLink.textContent = "🎬";
  videoLink.title = "Open or download " + label + " video";
  videoLink.setAttribute("aria-label", "Open or download " + label + " video");

  links.append(imageLink, videoLink);
  caption.append(name, links);

  const range = item.meta?.first
    ? item.meta.first === item.meta.last
      ? item.meta.first
      : item.meta.first + " – " + item.meta.last
    : "";
  const activity = ["changes", "contributors", "repositories"].every(
    (key) => Number.isFinite(item.meta?.[key])
  )
    ? fmt.format(item.meta.changes) + " changes by " +
      fmt.format(item.meta.contributors) + " contributors across " +
      fmt.format(item.meta.repositories) + " repositories"
    : "";

  const meta = document.createElement("div");
  meta.className = "card-meta";
  if (range) {
    const row = document.createElement("span");
    row.className = "meta-row";
    row.textContent = range;
    meta.append(row);
  }
  if (activity) {
    const row = document.createElement("span");
    row.className = "meta-row";
    row.textContent = activity;
    meta.append(row);
  }

  figure.append(caption, video, error);
  if (meta.childElementCount) figure.append(meta);
  return figure;
}

function render(items) {
  const sorted = [...items].sort(byName);
  const fragment = document.createDocumentFragment();
  for (const item of sorted) fragment.append(card(item));
  gallery.replaceChildren(fragment);
  observePosters();
}

async function init() {
  const items = await discover();
  const list = items ?? FALLBACK;
  await loadMeta(list);
  render(list);
}

render(FALLBACK);
init();
