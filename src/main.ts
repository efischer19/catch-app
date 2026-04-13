import {
  MLB_TEAMS,
  findTeamById,
  type Division,
  type League,
  type Team,
} from "./teams";

type AppRoute =
  | { view: "slate" }
  | { view: "teams" }
  | { view: "team"; team: Team }
  | { view: "team-not-found" }
  | { view: "not-found" };

const LEAGUES: readonly League[] = ["AL", "NL"];
const DIVISIONS: readonly Division[] = ["East", "Central", "West"];
const TEAM_ROUTE_PATTERN = /^\/team\/(\d+)$/;

const navRouteMatchesPath = (href: string, pathname: string): boolean =>
  href === "/"
    ? pathname === "/"
    : pathname === "/teams" || pathname.startsWith("/team/");

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initRouter();
  registerServiceWorker();
});

export function initRouter(
  doc: Document = document,
  win: Window = window,
): () => void {
  renderRoute(doc, win, false);

  const handleClick = (event: MouseEvent): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>("a[href]");
    if (!link) return;

    const url = new URL(link.href, win.location.origin);
    if (url.origin !== win.location.origin || !isAppRoute(url.pathname)) return;

    event.preventDefault();
    navigateTo(url.pathname, doc, win, url.pathname.startsWith("/team/"));
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (
      !(target instanceof HTMLAnchorElement) ||
      target.dataset.teamLink !== "true"
    ) {
      return;
    }

    const teamLinks = [
      ...doc.querySelectorAll<HTMLAnchorElement>('[data-team-link="true"]'),
    ];
    const currentIndex = teamLinks.indexOf(target);
    if (currentIndex === -1) return;

    const lastIndex = teamLinks.length - 1;
    let nextIndex: number | undefined;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const href = target.getAttribute("href");
        if (href) {
          navigateTo(href, doc, win, true);
        }
        return;
      }
      default:
        return;
    }

    if (nextIndex === undefined) return;

    event.preventDefault();
    teamLinks[nextIndex]?.focus();
  };

  const handlePopstate = (): void => {
    renderRoute(doc, win, false);
  };

  doc.addEventListener("click", handleClick);
  doc.addEventListener("keydown", handleKeydown);
  win.addEventListener("popstate", handlePopstate);

  return () => {
    doc.removeEventListener("click", handleClick);
    doc.removeEventListener("keydown", handleKeydown);
    win.removeEventListener("popstate", handlePopstate);
  };
}

function navigateTo(
  pathname: string,
  doc: Document,
  win: Window,
  focusHeading: boolean,
): void {
  const nextPath = normalizePathname(pathname);
  if (win.location.pathname !== nextPath) {
    win.history.pushState({}, "", nextPath);
  }

  renderRoute(doc, win, focusHeading);
}

function renderRoute(doc: Document, win: Window, focusHeading: boolean): void {
  const appView = doc.getElementById("app-view");
  if (!(appView instanceof HTMLElement)) return;

  const pathname = normalizePathname(win.location.pathname);
  const route = parseRoute(pathname);

  updateMainNavigation(doc, pathname);
  updateDocumentTitle(doc, route);
  appView.replaceChildren(createRouteView(doc, route));

  if (focusHeading) {
    appView.querySelector<HTMLElement>("[data-view-heading='true']")?.focus();
  }
}

function updateMainNavigation(doc: Document, pathname: string): void {
  for (const link of doc.querySelectorAll<HTMLAnchorElement>(
    "[data-nav-link='true']",
  )) {
    const href = link.getAttribute("href") ?? "/";
    const isCurrent = navRouteMatchesPath(href, pathname);

    link.classList.toggle("is-active", isCurrent);
    if (isCurrent) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function updateDocumentTitle(doc: Document, route: AppRoute): void {
  switch (route.view) {
    case "slate":
      doc.title = "Catch | Today's Slate";
      break;
    case "teams":
      doc.title = "Catch | Teams";
      break;
    case "team":
      doc.title = `Catch | ${route.team.name}`;
      break;
    case "team-not-found":
      doc.title = "Catch | Team not found";
      break;
    case "not-found":
      doc.title = "Catch | Not found";
      break;
  }
}

function createRouteView(doc: Document, route: AppRoute): HTMLElement {
  switch (route.view) {
    case "slate":
      return createSlateView(doc);
    case "teams":
      return createTeamsView(doc);
    case "team":
      return createTeamScheduleView(doc, route.team);
    case "team-not-found":
      return createMissingTeamView(doc);
    case "not-found":
      return createNotFoundView(doc);
  }
}

function createSlateView(doc: Document): HTMLElement {
  const section = createViewSection(doc, "Today's Slate");
  section.append(
    createParagraph(
      doc,
      "Today's MLB slate will appear here. Use the Teams view to jump directly to a club schedule.",
    ),
  );
  return section;
}

function createTeamsView(doc: Document): HTMLElement {
  return createTeamLayout(
    doc,
    "Teams",
    "Choose a team to open its schedule. Use the arrow keys to move between teams and press Enter to select one.",
  );
}

function createTeamScheduleView(doc: Document, team: Team): HTMLElement {
  return createTeamLayout(
    doc,
    `${team.name} schedule`,
    `Viewing the ${team.name} (${team.abbreviation}) schedule. Team schedule data will appear here in a future update.`,
    team.id,
  );
}

function createMissingTeamView(doc: Document): HTMLElement {
  return createTeamLayout(
    doc,
    "Team not found",
    "That MLB team could not be found. Choose a team from the selector to continue.",
  );
}

function createNotFoundView(doc: Document): HTMLElement {
  const section = createViewSection(doc, "Page not found");
  section.append(
    createParagraph(doc, "The page you requested does not exist."),
    createParagraph(
      doc,
      "Use the main navigation to return to Today's Slate or browse Teams.",
    ),
  );
  return section;
}

function createTeamLayout(
  doc: Document,
  headingText: string,
  description: string,
  selectedTeamId?: number,
): HTMLElement {
  const layout = doc.createElement("div");
  layout.className = "app-layout app-layout--teams";

  const content = createViewSection(doc, headingText);
  content.classList.add("view-panel");
  content.append(createParagraph(doc, description));

  layout.append(createTeamSelector(doc, selectedTeamId), content);
  return layout;
}

function createViewSection(doc: Document, headingText: string): HTMLElement {
  const section = doc.createElement("section");
  section.className = "view-panel";
  section.setAttribute("aria-labelledby", "view-heading");

  const heading = doc.createElement("h2");
  heading.id = "view-heading";
  heading.tabIndex = -1;
  heading.dataset.viewHeading = "true";
  heading.textContent = headingText;

  section.append(heading);
  return section;
}

function createParagraph(doc: Document, text: string): HTMLParagraphElement {
  const paragraph = doc.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}

function createTeamSelector(
  doc: Document,
  selectedTeamId?: number,
): HTMLElement {
  const nav = doc.createElement("nav");
  nav.className = "team-selector";
  nav.setAttribute("aria-label", "MLB teams");

  const title = doc.createElement("h3");
  title.className = "team-selector__title";
  title.textContent = "Select a team";
  nav.append(title);

  for (const league of LEAGUES) {
    const leagueSection = doc.createElement("section");
    leagueSection.className = "team-selector__league";

    const leagueHeading = doc.createElement("h4");
    leagueHeading.className = "team-selector__league-heading";
    leagueHeading.textContent = league;
    leagueSection.append(leagueHeading);

    const divisionGrid = doc.createElement("div");
    divisionGrid.className = "team-selector__divisions";

    for (const division of DIVISIONS) {
      const divisionSection = doc.createElement("section");
      divisionSection.className = "team-selector__division";

      const divisionHeading = doc.createElement("h5");
      divisionHeading.className = "team-selector__division-heading";
      divisionHeading.textContent = division;
      divisionSection.append(divisionHeading);

      const list = doc.createElement("ul");
      list.className = "team-list";

      for (const team of MLB_TEAMS.filter(
        (candidate) =>
          candidate.league === league && candidate.division === division,
      )) {
        const item = doc.createElement("li");

        const link = doc.createElement("a");
        link.href = `/team/${team.id}`;
        link.className = "team-link";
        link.dataset.teamLink = "true";
        link.setAttribute("aria-label", team.name);

        if (team.id === selectedTeamId) {
          link.classList.add("team-link--active");
          link.setAttribute("aria-current", "page");
        }

        const name = doc.createElement("span");
        name.className = "team-link__name";
        name.textContent = team.name;

        const abbreviation = doc.createElement("span");
        abbreviation.className = "team-link__abbr";
        abbreviation.textContent = team.abbreviation;

        link.append(name, abbreviation);
        item.append(link);
        list.append(item);
      }

      divisionSection.append(list);
      divisionGrid.append(divisionSection);
    }

    leagueSection.append(divisionGrid);
    nav.append(leagueSection);
  }

  return nav;
}

function parseRoute(pathname: string): AppRoute {
  if (pathname === "/") return { view: "slate" };
  if (pathname === "/teams") return { view: "teams" };

  const match = TEAM_ROUTE_PATTERN.exec(pathname);
  if (match) {
    const teamId = Number(match[1]);
    const team = findTeamById(teamId);
    return team ? { view: "team", team } : { view: "team-not-found" };
  }

  return { view: "not-found" };
}

function isAppRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/teams" ||
    TEAM_ROUTE_PATTERN.test(pathname)
  );
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }

  return pathname;
}

function initThemeToggle(): void {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const saved = localStorage.getItem("theme");
  const initial = saved ?? (prefersDark.matches ? "dark" : "light");
  applyTheme(initial, toggle);

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next, toggle);
    localStorage.setItem("theme", next);
  });

  prefersDark.addEventListener("change", (event: MediaQueryListEvent) => {
    if (!localStorage.getItem("theme")) {
      applyTheme(event.matches ? "dark" : "light", toggle);
    }
  });
}

function applyTheme(theme: string, toggle: HTMLElement): void {
  document.documentElement.setAttribute("data-theme", theme);
  const isDark = theme === "dark";
  toggle.setAttribute("aria-pressed", String(isDark));

  const icon = toggle.querySelector(".icon");
  if (icon) icon.textContent = isDark ? "☀️" : "🌙";

  const label = toggle.querySelector(".label");
  if (label) label.textContent = isDark ? "Light mode" : "Dark mode";
}

function registerServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "gold-data-updated") {
            announceStatus("Schedule updated.");
          }
        });
      })
      .catch(() => {
        // Service worker registration failed — not critical for app function
      });
  }
}

function announceStatus(message: string): void {
  const status = document.getElementById("status-announcements");
  if (!status) return;

  status.textContent = "";
  requestAnimationFrame(() => {
    status.textContent = message;
  });
}
