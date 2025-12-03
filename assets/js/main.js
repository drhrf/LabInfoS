(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    site: null,
    publications: null,
    team: null,
    nec: null,
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

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("labinfos_theme", theme);
  }

  function initTheme() {
    const stored = localStorage.getItem("labinfos_theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      return;
    }
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    setTheme(prefersLight ? "light" : "dark");
  }

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
  }

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Falha ao carregar ${path}: ${res.status}`);
    return res.json();
  }

  function initYear() {
    const el = $("#year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

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

  function initThemeToggle() {
    const btn = $("[data-theme-toggle]");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") || "dark";
      const next = (cur === "dark") ? "light" : "dark";
      setTheme(next);
    });
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

  function normalizeStr(s) {
    return safeText(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  }

  function uniq(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
  }

  function optionize(select, values) {
    const cur = select.value;
    select.innerHTML = `<option value="">Todos</option>`;
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    select.value = cur;
  }

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
        title.textContent = safeText(p.title) || "[TÍTULO DA PUBLICAÇÃO]";

        const authors = document.createElement("p");
        authors.className = "pub-authors";
        authors.textContent = safeText(p.authors) || "[AUTORES]";

        const meta = document.createElement("div");
        meta.className = "pub-meta";

        const tagYear = document.createElement("span");
        tagYear.className = "tag";
        tagYear.textContent = safeText(p.year) || "Sem ano";

        const tagType = document.createElement("span");
        tagType.className = "tag";
        tagType.textContent = safeText(p.type) || "Sem tipo";

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
        const l4 = makeLink("Código/Dados", p.code_or_data);

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

    const roles = uniq(team.map(t => safeText(t.role)).filter(Boolean)).sort((a,b) => a.localeCompare(b,"pt-BR"));
    optionize(roleSel, roles);

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
        const card = document.createElement("article");
        card.className = "person";

        const top = document.createElement("div");
        top.className = "person-top";

        const img = document.createElement("img");
        img.className = "avatar";
        img.alt = `Foto de ${safeText(t.name) || "pesquisador(a)"}`;
        img.src = t.photo || "assets/img/team/p1.svg";
        img.loading = "lazy";

        const head = document.createElement("div");

        const name = document.createElement("h3");
        name.className = "person-name";
        name.textContent = safeText(t.name) || "[NOME]";

        const role = document.createElement("p");
        role.className = "person-role";
        role.textContent = safeText(t.role) || "[FUNÇÃO]";

        head.appendChild(name);
        head.appendChild(role);

        top.appendChild(img);
        top.appendChild(head);

        const body = document.createElement("div");
        body.className = "person-body";

        const bio = document.createElement("p");
        bio.className = "person-bio";
        bio.textContent = safeText(t.bio) || "[PREENCHA: mini-bio (2–4 linhas).]";

        const tags = document.createElement("div");
        tags.className = "person-tags";
        (t.keywords || []).slice(0, 6).forEach((k) => {
          const span = document.createElement("span");
          span.className = "tag";
          span.textContent = k;
          tags.appendChild(span);
        });

        const links = document.createElement("div");
        links.className = "person-links";

        const lattes = link("Lattes", t.lattes);
        const orcid = link("ORCID", t.orcid);
        const scholar = link("Scholar", t.scholar);
        const github = link("GitHub", t.github);
        const email = t.email ? link("E-mail", `mailto:${t.email}`) : null;

        [lattes, orcid, scholar, github, email].filter(Boolean).forEach(a => links.appendChild(a));

        body.appendChild(bio);
        if (tags.childNodes.length) body.appendChild(tags);
        if (links.childNodes.length) body.appendChild(links);

        card.appendChild(top);
        card.appendChild(body);

        grid.appendChild(card);
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
        el.textContent = url || "[link do formulário]";
        el.href = url || "#";
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
      (nec.services || []).forEach((s) => {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <h3>${safeText(s.title) || "[SERVIÇO]"}</h3>
          <p>${safeText(s.description) || "[PREENCHA: descrição do serviço.]"}</p>
          <p class="card-meta">${safeText(s.note) || ""}</p>
        `;
        services.appendChild(card);
      });
    }

    const how = $("#necHowWeWork");
    if (how) {
      how.innerHTML = "";
      (nec.howWeWork || []).forEach((p) => {
        const para = document.createElement("p");
        para.textContent = safeText(p);
        how.appendChild(para);
      });
    }
  }

  async function boot() {
    initYear();
    initTheme();
    initThemeToggle();
    initNav();

    try {
      state.site = await loadJSON("data/site.json");
      applySiteData(state.site);
      renderHeroMetrics(state.site);
    } catch (e) {
      // silencioso por design: site continua utilizável sem JSON
    }

    const path = (window.location.pathname || "").toLowerCase();

    if (path.endsWith("publicacoes.html")) {
      try {
        state.publications = await loadJSON("data/publications.json");
        renderPublications(state.publications);
      } catch (e) {
        const list = $("#pubList");
        const count = $("#pubCount");
        if (list) list.innerHTML = `<div class="hint"><p class="muted">Não consegui carregar <code>data/publications.json</code>. Verifique o caminho/JSON.</p></div>`;
        if (count) count.textContent = "0";
      }
    }

    if (path.endsWith("equipe.html")) {
      try {
        state.team = await loadJSON("data/team.json");
        renderTeam(state.team);
      } catch (e) {
        const grid = $("#teamGrid");
        const count = $("#teamCount");
        if (grid) grid.innerHTML = `<div class="hint"><p class="muted">Não consegui carregar <code>data/team.json</code>. Verifique o caminho/JSON.</p></div>`;
        if (count) count.textContent = "0";
      }
    }

    if (path.endsWith("nec.html")) {
      try {
        state.nec = await loadJSON("data/nec.json");
        applyNECData(state.nec);
      } catch (e) {
        // ok
      }
    }
  }

  boot();
})();