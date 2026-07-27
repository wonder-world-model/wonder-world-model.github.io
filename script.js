const lightbox = document.querySelector(".lightbox");
const lightboxVideo = lightbox?.querySelector("video");
const lightboxClose = lightbox?.querySelector(".lightbox-close");

document.querySelectorAll(".demo-card video, .featured-demo video").forEach((video) => {
  const card = video.closest(".demo-card, .featured-demo");
  if (!card) return;

  card.addEventListener("mouseenter", () => {
    video.play().catch(() => {});
  });
  card.addEventListener("mouseleave", () => {
    video.pause();
  });
});

document.querySelectorAll("[data-demo-player]").forEach((player) => {
  let video = player.querySelector("[data-demo-video]");
  const stage = player.querySelector(".demo-stage");
  const section = player.closest(".demos");
  const options = section?.querySelectorAll(".demo-option") ?? [];
  let transitionId = 0;
  let loadingStartedAt = 0;

  const loading = document.createElement("div");
  loading.className = "demo-loading";
  loading.setAttribute("role", "status");
  loading.setAttribute("aria-live", "polite");
  loading.textContent = "Loading video";
  stage?.append(loading);

  function showLoading() {
    if (!stage) return;
    loadingStartedAt = performance.now();
    stage.classList.add("is-loading");
    stage.setAttribute("aria-busy", "true");
  }

  function hideLoading(currentTransition, callback) {
    if (!stage) return;
    const elapsed = performance.now() - loadingStartedAt;
    const delay = Math.max(0, 700 - elapsed);

    window.setTimeout(() => {
      if (currentTransition !== transitionId) return;
      stage.classList.remove("is-loading");
      stage.removeAttribute("aria-busy");
      callback?.();
    }, delay);
  }

  options.forEach((option) => {
    option.addEventListener("click", () => {
      options.forEach((item) => item.classList.remove("is-active"));
      option.classList.add("is-active");

      if (!video || !stage || !option.dataset.src) return;

      if (option.dataset.src === video.getAttribute("src")) {
        stage.classList.remove("is-loading");
        stage.removeAttribute("aria-busy");
        video.play().catch(() => {});
        return;
      }

      const currentTransition = ++transitionId;
      showLoading();
      const nextVideo = video.cloneNode(false);
      nextVideo.removeAttribute("data-demo-video");
      nextVideo.classList.add("demo-stage-video-next");
      nextVideo.src = option.dataset.src;
      nextVideo.preload = "auto";
      nextVideo.muted = true;
      nextVideo.loop = true;
      nextVideo.autoplay = true;
      nextVideo.playsInline = true;

      nextVideo.addEventListener(
        "loadeddata",
        () => {
          if (currentTransition !== transitionId) {
            nextVideo.remove();
            return;
          }

          nextVideo.play().catch(() => {});
          hideLoading(currentTransition, () => {
            nextVideo.classList.add("is-ready");
            video.classList.add("is-leaving");

            window.setTimeout(() => {
              if (currentTransition !== transitionId) {
                nextVideo.remove();
                return;
              }

              video.remove();
              nextVideo.setAttribute("data-demo-video", "");
              nextVideo.classList.remove("demo-stage-video-next", "is-ready");
              video = nextVideo;
            }, 220);
          });
        },
        { once: true }
      );

      nextVideo.addEventListener(
        "error",
        () => {
          if (currentTransition === transitionId) {
            hideLoading(currentTransition);
            nextVideo.remove();
          }
        },
        { once: true }
      );

      stage.append(nextVideo);
      nextVideo.load();
    });
  });
});

document.querySelectorAll(".demos:not(.comparison) > .demo-picker").forEach((picker) => {
  const section = picker.closest(".demos");
  const title = section?.querySelector("h2")?.textContent.trim() || "demo";
  const carousel = document.createElement("div");
  const previous = document.createElement("button");
  const next = document.createElement("button");
  let dragging = false;
  let dragged = false;
  let startX = 0;
  let startScrollLeft = 0;

  carousel.className = "demo-carousel";
  previous.className = "demo-carousel-button is-prev";
  next.className = "demo-carousel-button is-next";
  previous.type = "button";
  next.type = "button";
  previous.textContent = "←";
  next.textContent = "→";
  previous.setAttribute("aria-label", `Show previous examples for ${title}`);
  next.setAttribute("aria-label", `Show more examples for ${title}`);

  picker.before(carousel);
  carousel.append(previous, picker, next);

  function updateButtons() {
    const maxScrollLeft = picker.scrollWidth - picker.clientWidth;
    previous.disabled = picker.scrollLeft <= 2;
    next.disabled = picker.scrollLeft >= maxScrollLeft - 2;
  }

  function scrollExamples(direction) {
    const option = picker.querySelector(".demo-option");
    if (!option) return;

    const gap = Number.parseFloat(getComputedStyle(picker).columnGap) || 0;
    const step = option.getBoundingClientRect().width + gap;
    const visibleCount = Math.max(1, Math.floor(picker.clientWidth / step) - 1);
    picker.scrollBy({ left: direction * step * visibleCount, behavior: "smooth" });
  }

  previous.addEventListener("click", () => scrollExamples(-1));
  next.addEventListener("click", () => scrollExamples(1));
  picker.addEventListener("scroll", updateButtons, { passive: true });

  picker.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    dragged = false;
    startX = event.clientX;
    startScrollLeft = picker.scrollLeft;
  });

  picker.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const distance = event.clientX - startX;
    if (!dragged && Math.abs(distance) > 5) {
      dragged = true;
      picker.classList.add("is-dragging");
      picker.setPointerCapture(event.pointerId);
    }
    if (!dragged) return;
    picker.scrollLeft = startScrollLeft - distance;
  });

  function stopDragging(event) {
    if (!dragging) return;
    dragging = false;
    picker.classList.remove("is-dragging");
    if (picker.hasPointerCapture(event.pointerId)) {
      picker.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      dragged = false;
    }, 0);
  }

  picker.addEventListener("pointerup", stopDragging);
  picker.addEventListener("pointercancel", stopDragging);
  picker.addEventListener("pointerleave", (event) => {
    if (dragging && !dragged) stopDragging(event);
  });
  picker.addEventListener(
    "click",
    (event) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  new ResizeObserver(updateButtons).observe(picker);
  updateButtons();
});

document.querySelectorAll(".expand").forEach((button) => {
  button.addEventListener("click", () => {
    const video = button.closest(".demo-card, .featured-demo, .demo-stage")?.querySelector("video");
    if (!video || !lightbox || !lightboxVideo) return;

    lightboxVideo.src = video.currentSrc || video.src;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxVideo.play().catch(() => {});
  });
});

function closeLightbox() {
  if (!lightbox || !lightboxVideo) return;
  lightbox.hidden = true;
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  document.body.style.overflow = "";
}

lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.querySelector(button.dataset.copy);
    if (!target) return;

    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      const original = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = original;
      }, 1600);
    } catch {
      button.textContent = "Select text";
    }
  });
});

document.querySelectorAll("[data-compare]").forEach((compare) => {
  const topVideo = compare.querySelector(".compare-top");
  const handle = compare.querySelector(".compare-handle");
  const videos = compare.querySelectorAll("video");
  let dragging = false;

  function setPosition(clientX) {
    const bounds = compare.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    const percent = ratio * 100;
    topVideo.style.clipPath = `inset(0 0 0 ${percent}%)`;
    handle.style.left = `${percent}%`;
  }

  compare.addEventListener("pointerdown", (event) => {
    dragging = true;
    compare.setPointerCapture(event.pointerId);
    setPosition(event.clientX);
    videos.forEach((video) => video.play().catch(() => {}));
  });

  compare.addEventListener("pointermove", (event) => {
    if (dragging) setPosition(event.clientX);
  });

  compare.addEventListener("pointerup", (event) => {
    dragging = false;
    if (compare.hasPointerCapture(event.pointerId)) {
      compare.releasePointerCapture(event.pointerId);
    }
  });

  compare.addEventListener("mouseenter", () => {
    videos.forEach((video) => video.play().catch(() => {}));
  });

  compare.addEventListener("mouseleave", () => {
    if (!dragging) videos.forEach((video) => video.pause());
  });
});
