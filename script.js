(() => {
  "use strict";
  const form = document.getElementById("thumbnail-form");
  const urlInput = document.getElementById("video-url");
  const getButton = document.getElementById("get-button");
  const status = document.getElementById("status");
  const results = document.getElementById("results");
  const grid = document.getElementById("thumbnail-grid");
  const summary = document.getElementById("video-summary");
  const clearButton = document.getElementById("clear-button");
  document.getElementById("year").textContent = new Date().getFullYear();

  const sizes = [
    { key: "maxresdefault", label: "Maximum / HD", dims: "1280 × 720" },
    { key: "sddefault", label: "Standard Definition", dims: "640 × 480 (often 640 × 360)" },
    { key: "hqdefault", label: "High Quality", dims: "480 × 360" },
    { key: "mqdefault", label: "Medium Quality", dims: "320 × 180" },
    { key: "default", label: "Default", dims: "120 × 90" }
  ];

  function extractVideoId(raw) {
    let url;
    try { url = new URL(raw.trim()); } catch { return null; }
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    let id = null;
    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0];
    } else if (["youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host) ||
               host.endsWith(".youtube.com") || host.endsWith(".youtube-nocookie.com")) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live", "v"].includes(parts[0])) id = parts[1];
      }
    } else {
      return null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = "status" + (kind ? " " + kind : "");
  }

  function checkImage(url) {
    return new Promise(resolve => {
      const img = new Image();
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        resolve(ok ? { url, width: img.naturalWidth, height: img.naturalHeight } : null);
      };
      img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0);
      img.onerror = () => finish(false);
      img.src = url;
      window.setTimeout(() => finish(false), 8000);
    });
  }

  function createCard(size, imageData) {
    const card = document.createElement("article");
    card.className = "thumb-card";
    const imageWrap = document.createElement("div");
    imageWrap.className = "thumb-image-wrap";
    const img = document.createElement("img");
    img.src = imageData.url;
    img.alt = size.label + " YouTube thumbnail";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    imageWrap.appendChild(img);

    const body = document.createElement("div");
    body.className = "thumb-card-body";
    const title = document.createElement("h3");
    title.textContent = size.label;
    const dimensions = document.createElement("p");
    dimensions.className = "thumb-dimensions";
    dimensions.textContent = imageData.width + " × " + imageData.height + " pixels";

    const download = document.createElement("a");
    download.className = "download-button";
    download.href = imageData.url;
    download.target = "_blank";
    download.rel = "noopener noreferrer";
    download.textContent = "Open / Save image ↗";
    download.setAttribute("aria-label", "Open or save " + size.label + " thumbnail");
    // Cross-origin image URLs often ignore the HTML download attribute. Opening the
    // image is a reliable fallback; users can right-click or long-press to save it.
    body.append(title, dimensions, download);
    card.append(imageWrap, body);
    return card;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const id = extractVideoId(urlInput.value);
    results.classList.add("hidden");
    grid.replaceChildren();
    if (!id) {
      setStatus("Please enter a valid YouTube video URL (including an 11-character video ID).");
      urlInput.focus();
      return;
    }

    getButton.disabled = true;
    getButton.textContent = "Checking images…";
    setStatus("Checking which thumbnail sizes are available. This can take a few seconds.");
    summary.textContent = "Video ID: " + id;
    const found = [];
    try {
      const checks = await Promise.all(sizes.map(async size => {
        const imageData = await checkImage("https://img.youtube.com/vi/" + id + "/" + size.key + ".jpg");
        return imageData ? { size, imageData } : null;
      }));
      checks.forEach(item => { if (item) found.push(item); });

      if (!found.length) {
        setStatus("No thumbnails could be loaded. Check the video link or try another public video.");
        return;
      }
      found.forEach(({ size, imageData }) => grid.appendChild(createCard(size, imageData)));
      summary.textContent = "Video ID: " + id + " · " + found.length + " image size" + (found.length === 1 ? "" : "s") + " found";
      results.classList.remove("hidden");
      setStatus("Done — choose an available image size below.", "success");
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setStatus("Something went wrong while checking images. Please try again.");
    } finally {
      getButton.disabled = false;
      getButton.innerHTML = 'Get Thumbnail <span aria-hidden="true">→</span>';
    }
  }

  form.addEventListener("submit", handleSubmit);
  clearButton.addEventListener("click", () => {
    urlInput.value = "";
    grid.replaceChildren();
    results.classList.add("hidden");
    setStatus("");
    urlInput.focus();
  });
})();