(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    site: null,
    publications: null,
    team: null,
    nec: null,
    i18n: null,
    currentLang: "pt",
  };

  function safeText(v) {
    return (v === null || v === undefined) ? "" : String(v);
  }

  function isExternalUrl(url) {
    try {
      const u = new URL(url, window.location.href);
      return u.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  /* ── I18n Engine ────────────────────────────────────────────────── */
  function applyTranslations(lang) {
    if (!state.i18n || !state.i18n[lang]) return;

    const t = state.i18n[lang];

    // Elements with data-i18n
    $$("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (t[key] !== undefined) {
        el.textContent = t[key];
      }
    });

    // Elements with data-i18n-html (for elements containing markup)
    $$("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (t[key] !== undefined) {
        el.innerHTML = t[key];
      }
    });

    // Placeholders
    $$("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (t[key] !== undefined) {
        el.setAttribute("placeholder", t[key]);
      }
    });

    // Aria labels on carousel
    $$("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      if (t[key] !== undefined) {
        el.setAttribute("aria-label", t[key]);
      }
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang === "en" ? "en" : "pt-BR";

    // Update OG tags
    if (lang === "en") {
      updateMeta("description", "Official website of the Health Informatics Laboratory (LabInfoS): research, teaching, and innovation in data, computing, and health.");
      updateMeta("og:description", "Research, teaching, and innovation in data, computing, and health.");
    } else {
      updateMeta("description", "Site oficial do Laboratório de Informática em Saúde (LabInfoS): pesquisa, ensino e inovação em dados, computação e saúde.");
      updateMeta("og:description", "Pesquisa, ensino e inovação em dados, computação e saúde.");
    }

    localStorage.setItem("labinfos_lang", lang);
    state.currentLang = lang;

    // Re-render dynamic content that depends on language
    if (state.team) renderTeam(state.team);
    if (state.publications) renderPublications(state.publications);
    if (state.nec) applyNECData(state.nec);
  }

  function updateMeta(name, content) {
    let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    if (meta) meta.setAttribute("content", content);
  }

  function initLangSwitcher() {
    const links = document.querySelectorAll(".lang-link");
    if (!links.length) return;

    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const lang = link.getAttribute("data-lang");
        if (!lang || lang === state.currentLang) return;

        links.forEach((l) => l.classList.remove("is-active"));
        link.classList.add("is-active");

        applyTranslations(lang);
      });
    });
  }

  /* ── Navigation (mobile toggle) ─────────────────────────────────── */
  function initNav() {
    const toggle = $("[data-nav-toggle]");
    const nav = $("[data-nav]");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const willOpen = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", willOpen);
      toggle.setAttribute("aria-expanded", String(willOpen));
      toggle.setAttribute("aria-label", willOpen ? "Fechar menu" : "Abrir menu");
    });

    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("is-open")) return;
      const isClickInside = nav.contains(e.target) || toggle.contains(e.target);
      if (!isClickInside) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menu");
      }
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menu");
      });
    });
  }

  /* ── Smooth scroll for anchor links ─────────────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const targetId = this.getAttribute("href");
        if (targetId === "#") return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }

  /* ── Scroll spy ─────────────────────────────────────────────────── */
  function initScrollSpy() {
    const sections = $$("section[id]");
    const navLinks = $$(".nav-link");

    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("id");
            navLinks.forEach((link) => {
              const href = link.getAttribute("href");
              if (href === "#" + id) {
                link.classList.add("is-active");
              } else {
                link.classList.remove("is-active");
              }
            });
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  /* ── Carousel with controls ─────────────────────────────────────── */
  let carouselTimer = null;
  let carouselPaused = false;

  function initCarousel() {
    const slides = document.querySelectorAll(".hero-carousel .carousel-slide");
    const dots = document.querySelectorAll("[data-carousel-dots] .carousel-dot");
    const prevBtn = document.querySelector("[data-carousel-prev]");
    const pauseBtn = document.querySelector("[data-carousel-pause]");

    if (slides.length < 2) return;

    let current = 0;
    const total = slides.length;

    function goTo(index) {
      slides[current].classList.remove("is-active");
      if (dots[current]) dots[current].classList.remove("is-active");

      current = ((index % total) + total) % total;

      slides[current].classList.add("is-active");
      if (dots[current]) dots[current].classList.add("is-active");
    }

    function next() {
      goTo(current + 1);
    }

    function prev() {
      goTo(current - 1);
    }

    function startTimer() {
      stopTimer();
      if (!carouselPaused) {
        carouselTimer = setInterval(next, 3000);
      }
    }

    function stopTimer() {
      if (carouselTimer) {
        clearInterval(carouselTimer);
        carouselTimer = null;
      }
    }

    function togglePause() {
      carouselPaused = !carouselPaused;
      if (carouselPaused) {
        stopTimer();
        if (pauseBtn) {
          pauseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
          pauseBtn.setAttribute("aria-label", "Retomar carrossel");
        }
      } else {
        if (pauseBtn) {
          pauseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
          pauseBtn.setAttribute("aria-label", "Pausar carrossel");
        }
        startTimer();
      }
    }

    // Button handlers
    if (prevBtn) prevBtn.addEventListener("click", () => { prev(); startTimer(); });
    if (pauseBtn) pauseBtn.addEventListener("click", togglePause);

    // Dot handlers
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const idx = parseInt(dot.getAttribute("data-slide"), 10);
        if (!isNaN(idx)) { goTo(idx); startTimer(); }
      });
    });

    startTimer();
  }

  /* ── JSON loader ────────────────────────────────────────────────── */
  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Falha ao carregar ${path}: ${res.status}`);
    return res.json();
  }

  /* ── Year in footer ─────────────────────────────────────────────── */
  function initYear() {
    const el = $("#year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ── Social links ───────────────────────────────────────────────── */
  function renderSocialLinks(site) {
    const el = $("#socialLinks");
    if (!el) return;

    el.innerHTML = "";
    (site.social || []).forEach((s) => {
      const a = document.createElement("a");
      a.href = s.url || "#";
      a.textContent = s.label || "Link";
      if (isExternalUrl(a.href)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      el.appendChild(a);
    });
  }

  function applySiteData(site) {
    $$("[data-site]").forEach((el) => {
      const key = el.getAttribute("data-site");
      const value = site[key];

      if (el.tagName === "A" && key === "email") {
        const email = safeText(value);
        el.textContent = email || "[email@exemplo.org]";
        el.href = email ? `mailto:${email}` : "#";
        return;
      }

      if (key === "email" && el.tagName !== "A") {
        el.textContent = safeText(value) || "[email@exemplo.org]";
        return;
      }

      el.textContent = safeText(value) || el.textContent;
    });

    renderSocialLinks(site);
  }

  function renderHeroMetrics(site) {
    const root = $("#heroMetrics");
    if (!root) return;

    const pubs = Number(site.metrics?.publications ?? 0);
    const people = Number(site.metrics?.people ?? 0);
    const projects = Number(site.metrics?.projects ?? 0);

    $$("[data-metric]", root).forEach((el) => {
      const k = el.getAttribute("data-metric");
      if (k === "publications") el.textContent = pubs ? String(pubs) : "—";
      if (k === "people") el.textContent = people ? String(people) : "—";
      if (k === "projects") el.textContent = projects ? String(projects) : "—";
    });
  }

  /* ── Helpers for filters ────────────────────────────────────────── */
  function normalizeStr(s) {
    return safeText(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  }

  function uniq(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
  }

  function optionize(select, values) {
    const cur = select.value;
    // Keep the first <option> which has data-i18n, rebuild the rest
    const firstOpt = select.querySelector("option");
    select.innerHTML = "";
    if (firstOpt) select.appendChild(firstOpt.cloneNode(true));
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    select.value = cur;
  }

  /* ── Publications ───────────────────────────────────────────────── */
  function pubToSearchBlob(p) {
    return normalizeStr([
      p.title, p.authors, p.journal, p.year, p.type,
      (p.keywords || []).join(" "),
      p.abstract
    ].join(" "));
  }

  function renderPublications(publications) {
    const list = $("#pubList");
    const count = $("#pubCount");
    const q = $("#pubQuery");
    const yearSel = $("#pubYear");
    const typeSel = $("#pubType");
    const reset = $("#pubReset");

    if (!list || !count || !q || !yearSel || !typeSel || !reset) return;

    const years = uniq(publications.map(p => String(p.year || "")).filter(Boolean)).sort((a,b) => Number(b) - Number(a));
    const types = uniq(publications.map(p => safeText(p.type)).filter(Boolean)).sort((a,b) => a.localeCompare(b, "pt-BR"));

    optionize(yearSel, years);
    optionize(typeSel, types);

    const indexed = publications.map(p => ({ p, blob: pubToSearchBlob(p) }));

    function makeLink(label, url) {
      if (!url) return null;
      const a = document.createElement("a");
      a.href = url;
      a.textContent = label;
      if (isExternalUrl(url)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      return a;
    }

    function render(items) {
      list.innerHTML = "";

      items.forEach(({ p }) => {
        const item = document.createElement("article");
        item.className = "pub-item";

        const title = document.createElement("h3");
        title.className = "pub-title";
        title.textContent = safeText(p.title) || "[TITLE]";

        const authors = document.createElement("p");
        authors.className = "pub-authors";
        authors.textContent = safeText(p.authors) || "[AUTHORS]";

        const meta = document.createElement("div");
        meta.className = "pub-meta";

        const tagYear = document.createElement("span");
        tagYear.className = "tag";
        tagYear.textContent = safeText(p.year) || "—";

        const tagType = document.createElement("span");
        tagType.className = "tag";
        tagType.textContent = safeText(p.type) || "—";

        meta.appendChild(tagYear);
        meta.appendChild(tagType);

        if (p.journal) {
          const tagJ = document.createElement("span");
          tagJ.className = "tag";
          tagJ.textContent = safeText(p.journal);
          meta.appendChild(tagJ);
        }

        const links = document.createElement("div");
        links.className = "pub-links";

        const doiRaw = p.doi ? String(p.doi).trim() : "";
        const doiUrl = doiRaw
          ? (/^https?:\/\//i.test(doiRaw) ? doiRaw : `https://doi.org/${doiRaw.replace(/^doi:\s*/i, "")}`)
          : null;

        const l1 = makeLink("DOI", doiUrl);
        const l2 = makeLink("PDF", p.pdf);
        const l3 = makeLink("Preprint", p.preprint);
        const l4 = makeLink("Code/Data", p.code_or_data);

        [l1,l2,l3,l4].filter(Boolean).forEach(a => links.appendChild(a));

        const extra = document.createElement("p");
        extra.className = "muted";
        extra.style.marginTop = "10px";
        extra.textContent = safeText(p.note) || "";

        item.appendChild(title);
        item.appendChild(authors);
        item.appendChild(meta);
        if (links.childNodes.length) item.appendChild(links);
        if (extra.textContent) item.appendChild(extra);

        list.appendChild(item);
      });

      count.textContent = String(items.length);
    }

    function apply() {
      const query = normalizeStr(q.value);
      const year = yearSel.value;
      const type = typeSel.value;

      const filtered = indexed.filter(({ p, blob }) => {
        if (year && String(p.year) !== year) return false;
        if (type && safeText(p.type) !== type) return false;
        if (query && !blob.includes(query)) return false;
        return true;
      });

      filtered.sort((a, b) => {
        const ya = Number(a.p.year || 0);
        const yb = Number(b.p.year || 0);
        if (yb !== ya) return yb - ya;
        return safeText(a.p.title).localeCompare(safeText(b.p.title), "pt-BR");
      });

      render(filtered);
    }

    [q, yearSel, typeSel].forEach(el => el.addEventListener("input", apply));
    reset.addEventListener("click", () => {
      q.value = "";
      yearSel.value = "";
      typeSel.value = "";
      apply();
    });

    apply();
  }

  /* ── Team ───────────────────────────────────────────────────────── */
  function teamToSearchBlob(t) {
    return normalizeStr([
      t.name, t.role, t.bio, (t.keywords || []).join(" "),
      t.affiliation, t.area
    ].join(" "));
  }

  function renderTeam(team) {
    const grid = $("#teamGrid");
    const count = $("#teamCount");
    const q = $("#teamQuery");
    const roleSel = $("#teamRole");
    const reset = $("#teamReset");

    if (!grid || !count || !q || !roleSel || !reset) return;

    const tI18nTeam = (state.i18n && state.i18n[state.currentLang]) ? state.i18n[state.currentLang] : null;
    const roles = uniq(team.map(t => safeText(t.role)).filter(Boolean)).sort((a,b) => a.localeCompare(b,"pt-BR"));
    // Build role options with translated labels but original values for filtering
    const curRole = roleSel.value;
    const firstOpt = roleSel.querySelector("option");
    roleSel.innerHTML = "";
    if (firstOpt) roleSel.appendChild(firstOpt.cloneNode(true));
    roles.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r; // keep original PT value for filter matching
      const rk = `team.role.${r}`;
      opt.textContent = (tI18nTeam && tI18nTeam[rk]) ? tI18nTeam[rk] : r;
      roleSel.appendChild(opt);
    });
    roleSel.value = curRole;

    const indexed = team.map(t => ({ t, blob: teamToSearchBlob(t) }));

    function link(label, url) {
      if (!url) return null;
      const a = document.createElement("a");
      a.href = url;
      a.textContent = label;
      if (isExternalUrl(url)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      return a;
    }

    function render(items) {
      grid.innerHTML = "";

      items.forEach(({ t }) => {
        const row = document.createElement("div");
        row.className = "person-row";

        const img = document.createElement("img");
        img.className = "person-avatar";
        img.alt = `Foto de ${safeText(t.name) || "pesquisador(a)"}`;
        img.src = t.photo || "assets/img/team/p1.svg";
        img.loading = "lazy";

        const info = document.createElement("div");
        info.className = "person-info";

        const name = document.createElement("h3");
        name.textContent = safeText(t.name) || "[NOME]";

        const role = document.createElement("p");
        role.className = "person-role";
        const roleRaw = safeText(t.role) || "[FUNÇÃO]";
        const roleKey = `team.role.${roleRaw}`;
        const tI18n = (state.i18n && state.i18n[state.currentLang]) ? state.i18n[state.currentLang] : null;
        role.textContent = (tI18n && tI18n[roleKey]) ? tI18n[roleKey] : roleRaw;

        const bio = document.createElement("p");
        bio.className = "person-bio";
        bio.textContent = safeText(t.bio) || "";

        info.appendChild(name);
        info.appendChild(role);
        if (bio.textContent) info.appendChild(bio);

        if ((t.keywords || []).length) {
          const tags = document.createElement("div");
          tags.className = "person-tags";
          (t.keywords || []).slice(0, 6).forEach((k) => {
            const span = document.createElement("span");
            span.className = "tag";
            span.textContent = k;
            tags.appendChild(span);
          });
          info.appendChild(tags);
        }

        const links = document.createElement("div");
        links.className = "person-links";

        const lattes = link("Lattes", t.lattes);
        const orcid = link("ORCID", t.orcid);
        const scholar = link("Scholar", t.scholar);
        const github = link("GitHub", t.github);
        const email = t.email ? link("E-mail", `mailto:${t.email}`) : null;

        [lattes, orcid, scholar, github, email].filter(Boolean).forEach(a => links.appendChild(a));

        if (links.childNodes.length) info.appendChild(links);

        row.appendChild(img);
        row.appendChild(info);

        grid.appendChild(row);
      });

      count.textContent = String(items.length);
    }

    function apply() {
      const query = normalizeStr(q.value);
      const role = roleSel.value;

      const filtered = indexed.filter(({ t, blob }) => {
        if (role && safeText(t.role) !== role) return false;
        if (query && !blob.includes(query)) return false;
        return true;
      });

      filtered.sort((a, b) => safeText(a.t.name).localeCompare(safeText(b.t.name), "pt-BR"));
      render(filtered);
    }

    [q, roleSel].forEach(el => el.addEventListener("input", apply));
    reset.addEventListener("click", () => {
      q.value = "";
      roleSel.value = "";
      apply();
    });

    apply();
  }

  /* ── NEC data ───────────────────────────────────────────────────── */
  function applyNECData(nec) {
    $$("[data-nec]").forEach((el) => {
      const key = el.getAttribute("data-nec");
      const value = nec[key];

      if (el.tagName === "A" && key === "email") {
        const email = safeText(value);
        el.textContent = email || "[nec@exemplo.org]";
        el.href = email ? `mailto:${email}` : "#";
        return;
      }

      if (el.tagName === "A" && key === "formUrl") {
        const url = safeText(value);
        el.href = url || "#";
        const currentText = (el.textContent || "").trim();
        const isPlaceholder = !currentText || /link do formulário|\[link|https?:\/\//i.test(currentText);
        if (isPlaceholder) {
          el.textContent = url ? "Solicite aqui!" : "[link do formulário]";
        }
        if (url && isExternalUrl(url)) {
          el.target = "_blank";
          el.rel = "noopener noreferrer";
        }
        return;
      }

      el.textContent = safeText(value) || el.textContent;
    });

    const services = $("#necServices");
    if (services) {
      services.innerHTML = "";
      (nec.services || []).forEach((s, idx) => {
        const t = (state.i18n && state.i18n[state.currentLang]) ? state.i18n[state.currentLang] : null;
        const serviceKey = `nec.service${idx + 1}`;
        const title = (t && t[`${serviceKey}.title`]) ? t[`${serviceKey}.title`] : safeText(s.title);
        const desc  = (t && t[`${serviceKey}.desc`])  ? t[`${serviceKey}.desc`]  : safeText(s.description);
        const note  = (t && t[`${serviceKey}.note`])  ? t[`${serviceKey}.note`]  : safeText(s.note);
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <h3>${title || "[SERVICE]"}</h3>
          <p class="justifyed">${desc || "[DESCRIPTION]"}</p>
          <p class="card-meta">${note || ""}</p>
        `;
        services.appendChild(card);
      });
    }

    const how = $("#necHowWeWork");
    if (how) {
      how.innerHTML = "";
      const tHow = (state.i18n && state.i18n[state.currentLang]) ? state.i18n[state.currentLang] : null;
      (nec.howWeWork || []).forEach((p, idx) => {
        const text = (tHow && tHow[`nec.how${idx + 1}`]) ? tHow[`nec.how${idx + 1}`] : safeText(p);
        const para = document.createElement("p");
        para.className = "justifyed";
        para.textContent = text;
        how.appendChild(para);
      });
    }
  }

  /* ── Boot ───────────────────────────────────────────────────────── */
  async function boot() {
    initYear();
    initNav();
    initSmoothScroll();
    initScrollSpy();
    initLangSwitcher();

    // Load i18n
    try {
      state.i18n = await loadJSON("data/i18n.json");
      // Restore saved language preference
      const savedLang = localStorage.getItem("labinfos_lang") || "pt";
      if (savedLang !== "pt" && state.i18n[savedLang]) {
        state.currentLang = "pt"; // start at pt, then switch
        applyTranslations(savedLang);
        // Update active lang link
        document.querySelectorAll(".lang-link").forEach((l) => {
          l.classList.toggle("is-active", l.getAttribute("data-lang") === savedLang);
        });
      }
    } catch (e) {
      // site works without i18n
    }

    // Load site data
    try {
      state.site = await loadJSON("data/site.json");
      applySiteData(state.site);
      renderHeroMetrics(state.site);
    } catch (e) {
      // graceful fallback
    }

    // Load publications
    try {
      state.publications = await loadJSON("data/publications.json");
      renderPublications(state.publications);
    } catch (e) {
      const list = $("#pubList");
      const count = $("#pubCount");
      if (list) list.innerHTML = `<div class="hint"><p class="muted">Não foi possível carregar as publicações.</p></div>`;
      if (count) count.textContent = "0";
    }

    // Load team
    try {
      state.team = await loadJSON("data/team.json");
      renderTeam(state.team);
    } catch (e) {
      const grid = $("#teamGrid");
      const count = $("#teamCount");
      if (grid) grid.innerHTML = `<div class="hint"><p class="muted">Não foi possível carregar a equipe.</p></div>`;
      if (count) count.textContent = "0";
    }

    // Load NEC
    try {
      state.nec = await loadJSON("data/nec.json");
      applyNECData(state.nec);
    } catch (e) {
      // silent
    }

    // Init carousel (after DOM is ready)
    initCarousel();
  }

  boot();
})();
