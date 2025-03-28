// Global device width for media queries (canvas sizing now comes from the parent element)
const viewportWidth = document.documentElement.clientWidth;
const mm = gsap.matchMedia();

// Global counters for overall image loading progress (if needed for a loading indicator)
let globalImagesRemaining = 0;
let totalImagesCount = 0;

// Initialize sections by finding all elements with [scrub-wrapper]
function initSections() {
  const sections = gsap.utils.toArray("[scrub-wrapper]");
  sections.forEach((section) => {
    const prefix = section.dataset.prefix;
    const suffix = section.dataset.suffix;
    const frames = Number(section.dataset.framecount);
    const canvas = section.querySelector("canvas");
    if (!canvas || !prefix || !suffix || !frames) return;

    const device = viewportWidth >= 768 ? "desktop" : "mobile";

    totalImagesCount += frames;
    globalImagesRemaining += frames;
    initCanvas(section, canvas, prefix, suffix, frames, device);
  });
}

// Update the global loading counter and call lenis.resize when all images have loaded.
function updateGlobalImageCount() {
  globalImagesRemaining--;
  const updatedPercent =
    100 - Math.round((globalImagesRemaining * 100) / totalImagesCount);
  // Optionally, use updatedPercent to update a loading bar.
  if (globalImagesRemaining === 0) {
    setTimeout(() => {
      lenis.resize();
    }, 500);
  }
}

// Initialize the canvas for a given section.
// Canvas dimensions are derived from its parent element.
function initCanvas(section, canvas, prefix, suffix, frames, device) {
  const context = canvas.getContext("2d");
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;

  const frameCount = frames;
  const currentFrame = (index) =>
    `${prefix}${device}/${(index + 1).toString().padStart(3, "0")}${suffix}`;
  const images = [];
  let imagesLoaded = 0;

  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    const imgSrc = currentFrame(i);
    img.onload = () => {
      imagesLoaded++;
      updateGlobalImageCount();
      // Immediately render the first frame as soon as it loads.
      if (i === 0) {
        render(images, { frame: 0 }, context, canvas);
      }
      if (imagesLoaded === frameCount) {
        initCanvasAnimations(section, images, context, canvas);
      }
    };
    img.onerror = () => {
      imagesLoaded++;
      updateGlobalImageCount();
      if (imagesLoaded === frameCount) {
        initCanvasAnimations(section, images, context, canvas);
      }
    };
    img.src = imgSrc;
    images.push(img);
  }
}

// Initialize animations for each [frames-play] block in the section.
function initCanvasAnimations(section, images, context, canvas) {
  // A default sequence used for an initial render.
  const defaultSequence = { frame: 0 };

  const blocks = section.querySelectorAll("[frames-play]");
  blocks.forEach((block) => {
    const start = Number(block.dataset.start);
    const end = Number(block.dataset.end);
    // Total frames to animate in this block:
    const blockFrameCount = end - start;
    // Compute duration for 30fps playback (duration in seconds)
    const duration = blockFrameCount / 30;
    const blockSequence = { frame: 0 };

    // If the data-autoplay-sequence attribute is present…
    if ("autoplaySequence" in block.dataset) {
      const delay = block.dataset.autoplayDelay
        ? Number(block.dataset.autoplayDelay)
        : 0;
      
      if (window.scrollY <= 1) {
        // If a delay is specified, wait before starting the autoplay tween.
        gsap.to(blockSequence, {
          frame: end - 1,
          duration: duration,
          ease: "none",
          snap: "frame",
          delay,
          onUpdate: () => render(images, blockSequence, context, canvas),
        });
      } else {
        // If not at the top, immediately show the final frame.
        blockSequence.frame = end - 1;
        render(images, blockSequence, context, canvas);
      }
    } else {
      // For blocks without autoplay, use the standard scroll-triggered timeline.
      gsap
        .timeline({
          onUpdate: () => render(images, blockSequence, context, canvas),
          scrollTrigger: {
            trigger: block,
            pin: false,
            scrub: 1,
            start: block.dataset.startPos || "top top",
            end: block.dataset.endPos || "bottom bottom",
            markers: false,
          },
        })
        .fromTo(
          blockSequence,
          { frame: start - 1 },
          { frame: end - 1, snap: "frame", ease: "none", duration: 1 },
          0
        );
    }
  });

  // Render the default sequence initially.
  render(images, defaultSequence, context, canvas);

  // On window resize, update canvas dimensions using the parent's size.
  window.addEventListener("resize", () => {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    render(images, defaultSequence, context, canvas);
  });
}

// Render the current frame to the canvas.
function render(images, sequence, context, canvas) {
  const img = images[sequence.frame];
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Compute scale factor so the image covers the canvas while preserving aspect ratio.
  const scaleFactor = Math.max(
    canvas.width / img.width,
    canvas.height / img.height
  );
  const newWidth = img.width * scaleFactor;
  const newHeight = img.height * scaleFactor;
  const x = canvas.width / 2 - newWidth / 2;
  const y = canvas.height / 2 - newHeight / 2;

  context.drawImage(img, x, y, newWidth, newHeight);
}

// Initialize sections based on media queries.
mm.add("(min-width: 768px)", () => {
  initSections();
});
mm.add("(max-width: 767px)", () => {
  initSections();
});
