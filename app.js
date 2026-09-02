const main = document.querySelector("main");
const lightbox = document.querySelector("[data-lightbox]");

const demoPhotos = Array.from({ length: 17 }, (_, index) => ({
  id: `p${index + 1}`,
  src: `assets/photo-${String(index + 1).padStart(2, "0")}.jpg`,
  name: `HS_WANGJING_${String(index + 1).padStart(3, "0")}.jpg`,
}));

const state = {
  view: "setup",
  setupStage: "form",
  title: "赫石望京馆 · 2026 秋季陈设选片",
  photos: [...demoPhotos],
  reviewers: [
    { id: "keruo", name: "杨可若", ratings: {}, notes: {}, submitted: false },
    { id: "xuan", name: "玄总", ratings: {}, notes: {}, submitted: false },
    { id: "guest", name: "", ratings: {}, notes: {}, submitted: false },
  ],
  activeReviewerId: null,
  finalIds: new Set(),
  lightboxIndex: 0,
  lightboxZoomed: false,
  fullscreenActive: false,
  message: "",
};

let currentTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
document.documentElement.dataset.theme = currentTheme;

function setStep(step) {
  document.querySelectorAll("[data-step]").forEach((item) => {
    item.toggleAttribute("aria-current", item.dataset.step === step);
  });
}

function initials(name) {
  return name ? name.slice(0, 1) : "03";
}

function activeReviewer() {
  return state.reviewers.find((reviewer) => reviewer.id === state.activeReviewerId);
}

function participatingReviewers() {
  return state.reviewers.filter((reviewer) => reviewer.name.trim());
}

function button(label, className = "button", attrs = "") {
  return `<button type="button" class="${className}" ${attrs}>${label}</button>`;
}

function render() {
  lightbox.hidden = true;
  if (state.view === "setup") renderSetup();
  if (state.view === "rating") renderRating();
  if (state.view === "final") renderFinal();
  if (state.view === "done") renderDone();
}

function renderSetup() {
  setStep("setup");
  if (state.setupStage === "lobby") {
    renderLobby();
    return;
  }

  main.innerHTML = `
    <section class="page-intro page-intro-compact">
      <div><h1>创建选片</h1></div>
    </section>
    <section class="setup-single" aria-label="创建选片">
      <form data-form="setup">
        <div class="field">
          <label for="project-title">名称</label>
          <input id="project-title" name="title" value="${state.title}" autocomplete="off" />
        </div>
        <div data-reviewer-fields>
        ${state.reviewers
          .map(
            (reviewer, index) => `
              <div class="field reviewer-field">
                <label for="reviewer-${index}">选片人 ${index + 1}</label>
                <div class="reviewer-input-row">
                  <input id="reviewer-${index}" name="reviewer-${index}" value="${reviewer.name}" 
                    placeholder="${index >= 2 ? "输入姓名" : ""}" autocomplete="off" />
                  ${
                    index >= 2
                      ? `<button class="remove-reviewer" type="button" data-action="remove-reviewer" data-index="${index}" aria-label="移除选片人 ${index + 1}">移除</button>`
                      : ""
                  }
                </div>
              </div>`,
          )
          .join("")}
        </div>
        <button class="add-reviewer" type="button" data-action="add-reviewer">＋ 添加选片人</button>
        <label class="upload-zone" data-upload-zone for="photo-upload">
          <span>
            <strong>上传照片</strong>
            <span>JPG / PNG / WebP</span>
          </span>
          <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple data-input="photos" />
        </label>
        <p class="photo-count" data-photo-count>${state.photos.length} 张</p>
        <div class="actions">
          ${button("演示照片", "button", 'data-action="reset-demo"')}
          ${button("创建", "button button-primary", 'data-action="create-session"')}
        </div>
      </form>
    </section>
  `;
  bindSetup();
}

function bindSetup() {
  const form = document.querySelector("[data-form='setup']");
  const zone = document.querySelector("[data-upload-zone]");
  const input = document.querySelector("[data-input='photos']");

  form.addEventListener("input", () => {
    state.title = form.elements.title.value;
    state.reviewers.forEach((reviewer, index) => {
      reviewer.name = form.elements[`reviewer-${index}`].value;
    });
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.dataset.dragging = "true";
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.dataset.dragging = "false";
    });
  });
  zone.addEventListener("drop", (event) => loadFiles(event.dataTransfer.files));
  input.addEventListener("change", () => loadFiles(input.files));
}

function loadFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  state.photos = files.map((file, index) => ({
    id: `upload-${index}-${file.lastModified}`,
    src: URL.createObjectURL(file),
    name: file.name,
  }));
  document.querySelector("[data-photo-count]").textContent = `${state.photos.length} 张`;
}

function renderLobby() {
  setStep("rating");
  const reviewers = participatingReviewers();
  const allSubmitted = reviewers.every((reviewer) => reviewer.submitted);
  main.innerHTML = `
    <section class="lobby">
      <div class="page-intro">
        <div>
          <span class="eyebrow">${state.photos.length} 张</span>
          <h1>${state.title}</h1>
        </div>
      </div>
      <div class="reviewer-list">
        ${reviewers
          .map((reviewer) => {
            const count = Object.keys(reviewer.ratings).length;
            return `
              <article class="reviewer-row">
                <div class="reviewer-name"><span class="avatar">${initials(reviewer.name)}</span>${reviewer.name}</div>
                <span class="status ${reviewer.submitted ? "status-complete" : ""}">
                  ${reviewer.submitted ? "已提交" : count ? `已评 ${count} / ${state.photos.length}` : "等待评分"}
                </span>
                <button class="text-button" type="button" data-action="enter-rating" data-reviewer="${reviewer.id}">
                  ${reviewer.submitted ? "查看" : "进入评分"} →
                </button>
              </article>`;
          })
          .join("")}
      </div>
      <div class="actions">
        ${button("修改", "button", 'data-action="edit-setup"')}
        ${button(
          "终选",
          "button button-primary",
          `data-action="open-final" ${allSubmitted ? "" : "disabled"}`,
        )}
      </div>
      <button class="prototype-shortcut" type="button" data-action="preview-final">演示</button>
    </section>
  `;
}

function renderRating() {
  setStep("rating");
  const reviewer = activeReviewer();
  const count = Object.keys(reviewer.ratings).length;
  const percentage = Math.round((count / state.photos.length) * 100);
  main.innerHTML = `
    <section>
      <header class="rating-head">
        <div>
          <span class="eyebrow">${reviewer.name}</span>
          <h1>${state.title}</h1>
        </div>
        <div class="progress-block">
          <div class="progress-count">已评 ${count} / ${state.photos.length}</div>
          <div class="progress-track" aria-label="评分进度"><div class="progress-fill" style="width:${percentage}%"></div></div>
        </div>
      </header>
      <div class="photo-grid">
        ${state.photos
          .map((photo, index) => {
            const rating = reviewer.ratings[photo.id] || 0;
            return `
              <article class="photo-card" data-photo-card="${photo.id}">
                <button class="photo-frame" type="button" data-action="open-photo" data-index="${index}" aria-label="查看 ${photo.name} 大图">
                  <img src="${photo.src}" alt="${photo.name}" loading="lazy" decoding="async" />
                </button>
                <div class="photo-info">
                  <span class="filename">${photo.name}${reviewer.notes[photo.id] ? " · 有备注" : ""}</span>
                  ${renderStars(photo.id, rating)}
                </div>
              </article>`;
          })
          .join("")}
      </div>
      <footer class="rating-footer">
        ${button("返回", "button", 'data-action="back-lobby"')}
        ${button(
          reviewer.submitted ? "已提交" : "提交评分",
          "button button-primary",
          `data-action="submit-rating" ${count === state.photos.length && !reviewer.submitted ? "" : "disabled"}`,
        )}
      </footer>
    </section>
  `;
}

function renderStars(photoId, rating, large = false) {
  return `
    <div class="stars" role="group" aria-label="为照片评分">
      ${[1, 2, 3, 4, 5]
        .map(
          (value) => `
            <button class="star" type="button" data-action="rate" data-photo="${photoId}" data-rating="${value}"
              data-active="${value <= rating}" aria-label="${value} 星" aria-pressed="${rating === value}">★</button>`,
        )
        .join("")}
    </div>`;
}

function setRating(photoId, rating, shouldAdvance = false) {
  const reviewer = activeReviewer();
  if (!reviewer || reviewer.submitted) return;
  reviewer.ratings[photoId] = rating;
  if (lightbox.hidden) {
    renderRating();
  } else {
    updateLightbox();
    updateRatingProgress();
    if (shouldAdvance && state.lightboxIndex < state.photos.length - 1) {
      state.lightboxIndex += 1;
      updateLightbox();
    }
  }
}

function updateRatingProgress() {
  const reviewer = activeReviewer();
  const count = Object.keys(reviewer.ratings).length;
  const countElement = document.querySelector(".progress-count");
  const fill = document.querySelector(".progress-fill");
  const submit = document.querySelector("[data-action='submit-rating']");
  if (countElement) countElement.textContent = `已评 ${count} / ${state.photos.length}`;
  if (fill) fill.style.width = `${Math.round((count / state.photos.length) * 100)}%`;
  if (submit) submit.disabled = count !== state.photos.length;
  const current = state.photos[state.lightboxIndex];
  const card = document.querySelector(`[data-photo-card="${current.id}"] .stars`);
  if (card) card.outerHTML = renderStars(current.id, reviewer.ratings[current.id] || 0);
}

function openLightbox(index) {
  state.lightboxIndex = index;
  state.lightboxZoomed = false;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  updateLightbox();
  enterFullscreen();
  document.querySelector("[data-action='close-lightbox']").focus();
}

function enterFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const request = lightbox.requestFullscreen || lightbox.webkitRequestFullscreen;
  if (!request) return;
  state.fullscreenActive = true;
  const result = request.call(lightbox, { navigationUI: "hide" });
  if (result?.catch) {
    result.catch(() => {
      state.fullscreenActive = false;
    });
  }
}

function updateLightbox() {
  const photo = state.photos[state.lightboxIndex];
  const image = document.querySelector("[data-lightbox-image]");
  image.src = photo.src;
  image.alt = photo.name;
  lightbox.dataset.mode = state.view;
  updateLightboxZoom();
  document.querySelector("[data-lightbox-caption]").textContent =
    `${String(state.lightboxIndex + 1).padStart(2, "0")} / ${state.photos.length} · ${photo.name}`;
  const ratingZone = document.querySelector("[data-lightbox-rating]");
  if (state.view === "rating") {
    const reviewer = activeReviewer();
    ratingZone.innerHTML = `
      ${renderStars(photo.id, reviewer.ratings[photo.id] || 0, true)}
      <label class="lightbox-note">
        <span>个人备注</span>
        <input type="text" data-note="${photo.id}" value="${escapeAttribute(reviewer.notes[photo.id] || "")}"
          placeholder="写一句判断或感受（可选）" ${reviewer.submitted ? "disabled" : ""} />
      </label>`;
    ratingZone.hidden = false;
  } else {
    ratingZone.hidden = true;
  }
}

function updateLightboxZoom() {
  const stage = document.querySelector(".lightbox-stage");
  const imageButton = document.querySelector(".lightbox-image");
  const zoomButton = document.querySelector(".lightbox-zoom");
  stage.dataset.zoomed = String(state.lightboxZoomed);
  imageButton.setAttribute("aria-label", state.lightboxZoomed ? "适应屏幕" : "放大至原图尺寸");
  zoomButton.textContent = state.lightboxZoomed ? "适应" : "1:1";
  zoomButton.setAttribute("aria-label", state.lightboxZoomed ? "适应屏幕" : "查看原图尺寸");
  if (state.lightboxZoomed) {
    requestAnimationFrame(() => {
      imageButton.scrollLeft = (imageButton.scrollWidth - imageButton.clientWidth) / 2;
      imageButton.scrollTop = (imageButton.scrollHeight - imageButton.clientHeight) / 2;
    });
  }
}

function toggleLightboxZoom() {
  state.lightboxZoomed = !state.lightboxZoomed;
  updateLightboxZoom();
}

function moveLightbox(step) {
  state.lightboxIndex = Math.max(0, Math.min(state.photos.length - 1, state.lightboxIndex + step));
  state.lightboxZoomed = false;
  updateLightbox();
}

function closeLightbox() {
  lightbox.hidden = true;
  state.lightboxZoomed = false;
  document.body.style.overflow = "";
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
    exit.call(document);
  }
  state.fullscreenActive = false;
}

function handleFullscreenExit() {
  if (
    state.fullscreenActive &&
    !document.fullscreenElement &&
    !document.webkitFullscreenElement
  ) {
    lightbox.hidden = true;
    state.lightboxZoomed = false;
    state.fullscreenActive = false;
    document.body.style.overflow = "";
  }
}

function scoredPhotos() {
  return state.photos
    .map((photo) => {
      const reviewers = participatingReviewers();
      const scores = reviewers.map((reviewer) => reviewer.ratings[photo.id] || 0);
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return { ...photo, scores, average };
    })
    .sort((a, b) => b.average - a.average || a.name.localeCompare(b.name));
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderNotes(photoId) {
  const notes = participatingReviewers()
    .filter((reviewer) => reviewer.notes[photoId]?.trim())
    .map(
      (reviewer) =>
        `<p><span>${initials(reviewer.name)}</span>${reviewer.notes[photoId].trim()}</p>`,
    )
    .join("");
  return notes ? `<div class="shared-notes">${notes}</div>` : "";
}

function renderFinal() {
  setStep("final");
  const photos = scoredPhotos();
  main.innerHTML = `
    <section>
      <header class="final-head">
        <div>
          <span class="eyebrow">终选</span>
          <h1>${state.title}</h1>
        </div>
        <div>
          <div class="final-counter">已终选 <strong>${state.finalIds.size}</strong> / 10</div>
          <p class="inline-message" aria-live="polite">${state.message}</p>
        </div>
      </header>
      <div class="result-grid">
        ${photos
          .map(
            (photo, index) => `
              <article class="result-card" data-final="${state.finalIds.has(photo.id)}">
                <button class="result-image" type="button" data-action="open-result-photo" data-photo-id="${photo.id}" aria-label="查看 ${photo.name} 大图">
                  <img src="${photo.src}" alt="${photo.name}" loading="lazy" decoding="async" />
                </button>
                <span class="rank">${String(index + 1).padStart(2, "0")}</span>
                <button class="final-toggle" type="button" data-action="toggle-final" data-photo="${photo.id}" aria-pressed="${state.finalIds.has(photo.id)}">
                  ${state.finalIds.has(photo.id) ? "已终选" : "终选"}
                </button>
                <div class="score-line">
                  <span class="average"><strong>${photo.average.toFixed(1)}</strong> / 5 · ${photo.name}</span>
                  <span class="individual-scores">
                    ${participatingReviewers()
                      .map((reviewer, scoreIndex) => `<span>${initials(reviewer.name)} ${photo.scores[scoreIndex]}★</span>`)
                      .join("")}
                  </span>
                </div>
                ${renderNotes(photo.id)}
              </article>`,
          )
          .join("")}
      </div>
      <footer class="final-footer">
        ${button("返回", "button", 'data-action="back-lobby"')}
        ${button(
          "确认 10 张",
          "button button-primary",
          `data-action="confirm-final" ${state.finalIds.size === 10 ? "" : "disabled"}`,
        )}
      </footer>
    </section>
  `;
}

function renderDone() {
  setStep("final");
  const selected = scoredPhotos().filter((photo) => state.finalIds.has(photo.id));
  main.innerHTML = `
    <section>
      <div class="page-intro">
        <div>
          <span class="eyebrow">${state.title}</span>
          <h1>已选 10 张</h1>
        </div>
        <div>
          <div class="actions">
            ${button("复制文件名", "button", 'data-action="copy-filenames"')}
            ${button("调整", "button", 'data-action="return-final"')}
          </div>
          <p class="inline-message" aria-live="polite">${state.message}</p>
        </div>
      </div>
      <div class="done-grid">
        ${selected
          .map(
            (photo) => `
              <figure>
                <img src="${photo.src}" alt="${photo.name}" />
                <figcaption>${photo.name}</figcaption>
              </figure>`,
          )
          .join("")}
      </div>
    </section>
  `;
}

function seedDemoRatings() {
  participatingReviewers().forEach((reviewer, reviewerIndex) => {
    state.photos.forEach((photo, photoIndex) => {
      reviewer.ratings[photo.id] = ((photoIndex * 2 + reviewerIndex * 3) % 5) + 1;
    });
    reviewer.notes = {};
    reviewer.submitted = true;
  });
  const reviewers = participatingReviewers();
  if (reviewers[0]) reviewers[0].notes[state.photos[0].id] = "眼神很直接，适合放在入口。";
  if (reviewers[1]) reviewers[1].notes[state.photos[1].id] = "有运动之外的亲密关系。";
  state.finalIds.clear();
  state.message = "";
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "theme") {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = currentTheme;
  }
  if (action === "home") {
    state.view = "setup";
    state.setupStage = "form";
    render();
  }
  if (action === "reset-demo") {
    state.photos = [...demoPhotos];
    renderSetup();
  }
  if (action === "add-reviewer") {
    const id = `reviewer-${Date.now()}-${state.reviewers.length}`;
    state.reviewers.push({ id, name: "", ratings: {}, notes: {}, submitted: false });
    renderSetup();
    const inputs = document.querySelectorAll("[data-reviewer-fields] input");
    inputs[inputs.length - 1]?.focus();
  }
  if (action === "remove-reviewer") {
    const index = Number(target.dataset.index);
    if (index >= 2) {
      state.reviewers.splice(index, 1);
      renderSetup();
    }
  }
  if (action === "create-session") {
    if (!state.title.trim() || state.photos.length < 10) return;
    state.setupStage = "lobby";
    renderSetup();
  }
  if (action === "edit-setup") {
    state.setupStage = "form";
    renderSetup();
  }
  if (action === "enter-rating") {
    state.activeReviewerId = target.dataset.reviewer;
    state.view = "rating";
    render();
  }
  if (action === "back-lobby") {
    state.view = "setup";
    state.setupStage = "lobby";
    render();
  }
  if (action === "rate") {
    setRating(target.dataset.photo, Number(target.dataset.rating));
  }
  if (action === "open-photo") openLightbox(Number(target.dataset.index));
  if (action === "close-lightbox") closeLightbox();
  if (action === "toggle-zoom") toggleLightboxZoom();
  if (action === "previous-photo") moveLightbox(-1);
  if (action === "next-photo") moveLightbox(1);
  if (action === "submit-rating") {
    const reviewer = activeReviewer();
    if (Object.keys(reviewer.ratings).length === state.photos.length) {
      reviewer.submitted = true;
      state.view = "setup";
      state.setupStage = "lobby";
      render();
    }
  }
  if (action === "preview-final") {
    seedDemoRatings();
    state.view = "final";
    render();
  }
  if (action === "open-final") {
    if (participatingReviewers().every((reviewer) => reviewer.submitted)) {
      state.view = "final";
      render();
    }
  }
  if (action === "open-result-photo") {
    const id = target.dataset.photoId;
    state.lightboxIndex = state.photos.findIndex((photo) => photo.id === id);
    openLightbox(state.lightboxIndex);
  }
  if (action === "toggle-final") {
    const id = target.dataset.photo;
    state.message = "";
    if (state.finalIds.has(id)) {
      state.finalIds.delete(id);
    } else if (state.finalIds.size < 10) {
      state.finalIds.add(id);
    } else {
      state.message = "已经选满 10 张。请先取消一张，再做替换。";
    }
    renderFinal();
  }
  if (action === "confirm-final" && state.finalIds.size === 10) {
    state.view = "done";
    state.message = "";
    render();
  }
  if (action === "return-final") {
    state.view = "final";
    state.message = "";
    render();
  }
  if (action === "copy-filenames") {
    const text = scoredPhotos()
      .filter((photo) => state.finalIds.has(photo.id))
      .map((photo) => photo.name)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      state.message = "十个文件名已复制。";
    } catch {
      state.message = "当前预览环境不允许复制，请手动记录文件名。";
    }
    renderDone();
  }
});

document.addEventListener("input", (event) => {
  const input = event.target.closest("[data-note]");
  const reviewer = activeReviewer();
  if (!input || !reviewer || reviewer.submitted) return;
  reviewer.notes[input.dataset.note] = input.value;
});

document.addEventListener("fullscreenchange", handleFullscreenExit);
document.addEventListener("webkitfullscreenchange", handleFullscreenExit);

document.addEventListener("keydown", (event) => {
  if (!lightbox.hidden) {
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") moveLightbox(-1);
    if (event.key === "ArrowRight") moveLightbox(1);
    if (event.key.toLowerCase() === "z") toggleLightboxZoom();
    if (state.view === "rating" && ["1", "2", "3", "4", "5"].includes(event.key)) {
      const photo = state.photos[state.lightboxIndex];
      setRating(photo.id, Number(event.key), true);
    }
  }
});

render();
