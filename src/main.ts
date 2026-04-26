import {
  MLB_TEAMS,
  findTeamById,
  type Division,
  type League,
  type Team,
} from "./teams";
import { DataService, type DataServiceClient } from "./services/data-service";
import type {
  GoldGameSummary,
  GoldTeamInfo,
  GoldTeamSchedule,
  GoldUpcomingGames,
} from "./types/generated";

type AppRoute =
  | { view: "slate" }
  | { view: "teams" }
  | { view: "team"; team: Team }
  | { view: "boxscore"; gamePk: number }
  | { view: "team-not-found" }
  | { view: "not-found" };

interface RouterOptions {
  dataService?: DataServiceClient;
}

interface RouterContext {
  dataService: DataServiceClient;
  renderToken: number;
}

const LEAGUES: readonly League[] = ["AL", "NL"];
const DIVISIONS: readonly Division[] = ["East", "Central", "West"];
const TEAM_ROUTE_PATTERN = /^\/team\/(\d+)$/;
const BOXSCORE_ROUTE_PATTERN = /^\/boxscore\/(\d+)$/;
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const GAME_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const SLATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});
const LAST_UPDATED_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

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
  options: RouterOptions = {},
): () => void {
  const context: RouterContext = {
    dataService: options.dataService ?? DataService,
    renderToken: 0,
  };

  renderRoute(doc, win, false, context);

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
    navigateTo(
      url.pathname,
      doc,
      win,
      context,
      url.pathname.startsWith("/team/") || url.pathname.startsWith("/boxscore/"),
    );
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
          navigateTo(href, doc, win, context, true);
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
    renderRoute(doc, win, false, context);
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
  context: RouterContext,
  focusHeading: boolean,
): void {
  const nextPath = normalizePathname(pathname);
  if (win.location.pathname !== nextPath) {
    win.history.pushState({}, "", nextPath);
  }

  renderRoute(doc, win, focusHeading, context);
}

function renderRoute(
  doc: Document,
  win: Window,
  focusHeading: boolean,
  context: RouterContext,
): void {
  const appView = doc.getElementById("app-view");
  if (!(appView instanceof HTMLElement)) return;

  const pathname = normalizePathname(win.location.pathname);
  const route = parseRoute(pathname);
  const renderToken = ++context.renderToken;
  const view = createRouteView(doc, route);

  updateMainNavigation(doc, pathname);
  updateDocumentTitle(doc, route);
  appView.replaceChildren(view);

  if (focusHeading) {
    appView.querySelector<HTMLElement>("[data-view-heading='true']")?.focus();
  }

  if (route.view === "team") {
    void loadTeamScheduleView(
      view,
      route.team,
      context.dataService,
      () =>
        context.renderToken === renderToken &&
        normalizePathname(win.location.pathname) === pathname,
    );
  }

  if (route.view === "slate") {
    void loadSlateView(
      view,
      context.dataService,
      () =>
        context.renderToken === renderToken &&
        normalizePathname(win.location.pathname) === pathname,
    );
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
    case "boxscore":
      doc.title = "Catch | Boxscore";
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
    case "boxscore":
      return createBoxscoreView(doc, route.gamePk);
    case "team-not-found":
      return createMissingTeamView(doc);
    case "not-found":
      return createNotFoundView(doc);
  }
}

function createSlateView(doc: Document): HTMLElement {
  const section = createViewSection(doc, "Today's Slate");
  section.classList.add("slate-view");
  section.dataset.slateView = "true";
  renderSlateLoading(section, doc);
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
  const layout = doc.createElement("div");
  layout.className = "app-layout app-layout--teams";

  const content = createViewSection(doc, `${team.name} schedule`);
  content.classList.add("view-panel", "team-schedule-view");
  content.dataset.teamScheduleView = "true";
  renderScheduleLoading(content, doc);

  layout.append(createTeamSelector(doc, team.id), content);
  return layout;
}

function createBoxscoreView(doc: Document, gamePk: number): HTMLElement {
  const section = createViewSection(doc, "Boxscore");
  section.append(
    createParagraph(
      doc,
      `Boxscore details for game ${gamePk} will appear here in a future update.`,
    ),
  );
  return section;
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

async function loadTeamScheduleView(
  view: HTMLElement,
  team: Team,
  dataService: DataServiceClient,
  isCurrentView: () => boolean,
  showLoadingState = false,
): Promise<void> {
  const scheduleView = view.querySelector<HTMLElement>("[data-team-schedule-view='true']");
  if (!scheduleView) return;

  if (showLoadingState) {
    renderScheduleLoading(scheduleView, view.ownerDocument);
  }
  const result = await dataService.getTeamSchedule(team.id);

  if (!isCurrentView()) {
    return;
  }

  if (result.ok) {
    renderScheduleSuccess(scheduleView, view.ownerDocument, team, result.data, result.lastUpdated);
    return;
  }

  renderScheduleError(
    scheduleView,
    view.ownerDocument,
    result.error.message,
    () => {
      void loadTeamScheduleView(view, team, dataService, isCurrentView, true);
    },
  );
}

async function loadSlateView(
  view: HTMLElement,
  dataService: DataServiceClient,
  isCurrentView: () => boolean,
  showLoadingState = false,
): Promise<void> {
  const slateView = view.matches("[data-slate-view='true']")
    ? view
    : view.querySelector<HTMLElement>("[data-slate-view='true']");
  if (!slateView) return;

  if (showLoadingState) {
    renderSlateLoading(slateView, view.ownerDocument);
  }

  const result = await dataService.getUpcomingGames();
  if (!isCurrentView()) {
    return;
  }

  if (result.ok) {
    renderSlateSuccess(slateView, view.ownerDocument, result.data, result.lastUpdated);
    return;
  }

  renderScheduleError(slateView, view.ownerDocument, result.error.message, () => {
    void loadSlateView(view, dataService, isCurrentView, true);
  });
}

function renderScheduleLoading(section: HTMLElement, doc: Document): void {
  section.setAttribute("aria-busy", "true");

  const status = doc.createElement("p");
  status.className = "schedule-state";
  status.setAttribute("role", "status");
  status.textContent = "Loading schedule…";

  setSectionBody(section, status);
}

function renderSlateLoading(section: HTMLElement, doc: Document): void {
  section.setAttribute("aria-busy", "true");

  const status = doc.createElement("p");
  status.className = "schedule-state";
  status.setAttribute("role", "status");
  status.textContent = "Loading today's slate…";

  setSectionBody(section, status);
}

function renderScheduleError(
  section: HTMLElement,
  doc: Document,
  message: string,
  retry: () => void,
): void {
  section.removeAttribute("aria-busy");

  const alert = doc.createElement("div");
  alert.className = "schedule-error";
  alert.setAttribute("role", "alert");

  const copy = createParagraph(doc, message);
  copy.className = "schedule-error__message";

  const retryButton = doc.createElement("button");
  retryButton.type = "button";
  retryButton.className = "schedule-action schedule-action--button";
  retryButton.textContent = "Retry";
  retryButton.addEventListener("click", retry);

  alert.append(copy, retryButton);
  setSectionBody(section, alert);
}

function renderScheduleSuccess(
  section: HTMLElement,
  doc: Document,
  team: Team,
  schedule: GoldTeamSchedule,
  lastUpdated: string | null,
): void {
  section.removeAttribute("aria-busy");

  const meta = doc.createElement("p");
  meta.className = "schedule-meta";
  meta.textContent = `Season ${schedule.season_year} · Last updated ${formatLastUpdated(lastUpdated)}`;

  const games = sortGames(schedule.games ?? []);
  if (games.length === 0) {
    setSectionBody(
      section,
      meta,
      createParagraph(doc, "No regular-season games are available yet."),
    );
    return;
  }

  const groupedGames = groupGamesByMonth(games);
  const gamesPerDate = countGamesByDate(games);
  const scheduleGroups = doc.createElement("div");
  scheduleGroups.className = "schedule-groups";

  for (const group of groupedGames) {
    scheduleGroups.append(createScheduleMonthSection(doc, team, group, gamesPerDate));
  }

  setSectionBody(section, meta, scheduleGroups);
}

function renderSlateSuccess(
  section: HTMLElement,
  doc: Document,
  upcomingGames: GoldUpcomingGames,
  lastUpdated: string | null,
): void {
  section.removeAttribute("aria-busy");

  const meta = doc.createElement("p");
  meta.className = "schedule-meta";
  meta.textContent = `Last updated ${formatLastUpdated(lastUpdated)}`;

  const games = sortGames(upcomingGames.games ?? []);
  if (games.length === 0) {
    const emptyState = createParagraph(
      doc,
      "No games scheduled today. Check back soon for the next slate.",
    );
    emptyState.className = "slate-empty-state";
    setSectionBody(section, meta, emptyState);
    return;
  }

  const gamesPerDate = countGamesByDate(games);
  const groupedGames = groupGamesByDate(games);
  const slateGroups = doc.createElement("div");
  slateGroups.className = "slate-date-groups";

  for (const group of groupedGames) {
    slateGroups.append(createSlateDateSection(doc, group, gamesPerDate));
  }

  setSectionBody(section, meta, slateGroups);
}

function createScheduleMonthSection(
  doc: Document,
  team: Team,
  group: ScheduleMonthGroup,
  gamesPerDate: Map<string, number>,
): HTMLElement {
  const section = doc.createElement("section");
  section.className = "schedule-month";

  const heading = doc.createElement("h3");
  heading.className = "schedule-month__heading";
  heading.textContent = group.label;

  const cards = doc.createElement("div");
  cards.className = "schedule-cards";
  for (const game of group.games) {
    cards.append(createScheduleCard(doc, team, game, gamesPerDate));
  }

  const tableWrapper = doc.createElement("div");
  tableWrapper.className = "schedule-table-wrapper";
  tableWrapper.append(createScheduleTable(doc, team, group, gamesPerDate));

  section.append(heading, cards, tableWrapper);
  return section;
}

function createScheduleCard(
  doc: Document,
  team: Team,
  game: GoldGameSummary,
  gamesPerDate: Map<string, number>,
): HTMLElement {
  const details = getGameDetails(doc, team.id, game);
  const article = doc.createElement("article");
  article.className = "schedule-card";

  const title = doc.createElement("h4");
  title.className = "schedule-card__title";
  title.textContent = `${details.dateLabel} · ${details.matchupLabel}`;

  const meta = doc.createElement("p");
  meta.className = "schedule-card__meta";
  meta.append(
    createStatusBadge(doc, details.statusVariant, details.statusLabel),
    createInlineText(doc, details.resultLabel),
  );

  const subtitle = doc.createElement("p");
  subtitle.className = "schedule-card__subtitle";
  subtitle.textContent = `${details.homeAwayLabel} · ${details.opponent.name}`;

  const body = doc.createElement("div");
  body.className = "schedule-card__body";
  if (shouldShowGameLabel(game, gamesPerDate)) {
    body.append(createGameLabel(doc, game.game_number));
  }

  if (details.score) {
    const score = doc.createElement("p");
    score.className = "schedule-card__score";
    score.append(details.score);
    body.append(score);
  }

  if (details.note) {
    const note = createParagraph(doc, details.note);
    note.className = "schedule-note";
    body.append(note);
  }

  const actions = createScheduleActions(doc, details);
  if (actions.childElementCount > 0) {
    body.append(actions);
  }

  article.append(title, subtitle, meta, body);
  return article;
}

function createScheduleTable(
  doc: Document,
  team: Team,
  group: ScheduleMonthGroup,
  gamesPerDate: Map<string, number>,
): HTMLElement {
  const table = doc.createElement("table");
  table.className = "schedule-table";

  const caption = doc.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = `${group.label} schedule`;

  const thead = doc.createElement("thead");
  const headerRow = doc.createElement("tr");
  for (const headingText of ["Date", "Opponent", "Status", "Result", "Actions"]) {
    const heading = doc.createElement("th");
    heading.scope = "col";
    heading.textContent = headingText;
    headerRow.append(heading);
  }
  thead.append(headerRow);

  const tbody = doc.createElement("tbody");
  for (const game of group.games) {
    const details = getGameDetails(doc, team.id, game);
    const row = doc.createElement("tr");

    const dateCell = doc.createElement("th");
    dateCell.scope = "row";
    dateCell.className = "schedule-table__date";
    dateCell.append(createInlineText(doc, details.dateLabel));
    if (shouldShowGameLabel(game, gamesPerDate)) {
      dateCell.append(doc.createTextNode(" "), createGameLabel(doc, game.game_number));
    }

    const opponentCell = doc.createElement("td");
    opponentCell.textContent = `${details.homeAwayLabel} · ${details.opponent.name}`;

    const statusCell = doc.createElement("td");
    statusCell.append(createStatusBadge(doc, details.statusVariant, details.statusLabel));

    const resultCell = doc.createElement("td");
    resultCell.append(createInlineText(doc, details.resultLabel));
    if (details.score) {
      resultCell.append(doc.createTextNode(" "), details.score);
    }
    if (details.note) {
      const note = doc.createElement("span");
      note.className = "schedule-note schedule-note--inline";
      note.textContent = details.note;
      resultCell.append(doc.createTextNode(" "), note);
    }

    const actionsCell = doc.createElement("td");
    actionsCell.append(createScheduleActions(doc, details));

    row.append(dateCell, opponentCell, statusCell, resultCell, actionsCell);
    tbody.append(row);
  }

  table.append(caption, thead, tbody);
  return table;
}

function createScheduleActions(doc: Document, details: GameActionDetails): HTMLElement {
  const actions = doc.createElement("div");
  actions.className = "schedule-actions";

  if (details.boxscoreHref) {
    actions.append(createActionLink(doc, details.boxscoreHref, "Boxscore"));
  }

  if (details.watchHref) {
    actions.append(
      createActionLink(doc, details.watchHref, "Watch Condensed Game", {
        external: true,
      }),
    );
  }

  return actions;
}

function createActionLink(
  doc: Document,
  href: string,
  text: string,
  options: { external?: boolean } = {},
): HTMLAnchorElement {
  const link = doc.createElement("a");
  link.href = href;
  link.className = "schedule-action";
  link.textContent = text;
  if (options.external) {
    link.rel = "noopener noreferrer";
  }
  return link;
}

function createStatusBadge(
  doc: Document,
  variant: GameDetails["statusVariant"],
  text: string,
): HTMLElement {
  const badge = doc.createElement("span");
  badge.className = `schedule-status schedule-status--${variant}`;
  badge.textContent = text;
  return badge;
}

function createGameLabel(doc: Document, gameNumber: number | undefined): HTMLElement {
  const label = doc.createElement("span");
  label.className = "schedule-game-label";
  label.textContent =
    typeof gameNumber === "number" ? `Game ${gameNumber}` : "Doubleheader";
  return label;
}

function createInlineText(doc: Document, text: string): Text {
  return doc.createTextNode(text);
}

function setSectionBody(section: HTMLElement, ...nodes: Node[]): void {
  const heading = section.querySelector<HTMLElement>("[data-view-heading='true']");
  if (!heading) return;
  section.replaceChildren(heading, ...nodes);
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

interface ScheduleMonthGroup {
  label: string;
  games: GoldGameSummary[];
}

interface SlateDateGroup {
  games: GoldGameSummary[];
  isToday: boolean;
  label: string;
}

interface GameDetails {
  boxscoreHref: string | null;
  dateLabel: string;
  homeAwayLabel: "Home" | "Away";
  matchupLabel: string;
  note: string | null;
  opponent: GoldTeamInfo;
  resultLabel: string;
  score: HTMLElement | null;
  statusLabel: string;
  statusVariant: "final" | "in-progress" | "postponed" | "scheduled" | "default";
  watchHref: string | null;
}

interface SlateGameDetails {
  boxscoreHref: string | null;
  detailLabel: string;
  note: string | null;
  score: HTMLElement | null;
  statusLabel: string;
  statusVariant: GameDetails["statusVariant"];
  watchHref: string | null;
}

interface GameActionDetails {
  boxscoreHref: string | null;
  watchHref: string | null;
}

function sortGames(games: GoldGameSummary[]): GoldGameSummary[] {
  return [...games].sort((left, right) => {
    const dateDelta = Date.parse(left.date) - Date.parse(right.date);
    if (dateDelta !== 0) {
      return dateDelta;
    }

    return (left.game_number ?? 0) - (right.game_number ?? 0);
  });
}

function groupGamesByMonth(games: GoldGameSummary[]): ScheduleMonthGroup[] {
  const groups = new Map<string, ScheduleMonthGroup>();

  for (const game of games) {
    const date = new Date(game.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = groups.get(key);

    if (existing) {
      existing.games.push(game);
      continue;
    }

    groups.set(key, {
      label: MONTH_FORMATTER.format(date),
      games: [game],
    });
  }

  return [...groups.values()];
}

function groupGamesByDate(games: GoldGameSummary[]): SlateDateGroup[] {
  const groups = new Map<string, SlateDateGroup>();
  const todayKey = getCalendarDateKey(getCurrentDate().toISOString());

  for (const game of games) {
    const date = new Date(game.date);
    const dateKey = getCalendarDateKey(game.date);
    const existing = groups.get(dateKey);

    if (existing) {
      existing.games.push(game);
      continue;
    }

    groups.set(dateKey, {
      games: [game],
      isToday: dateKey === todayKey,
      label: FULL_DATE_FORMATTER.format(date),
    });
  }

  return [...groups.values()];
}

function countGamesByDate(games: GoldGameSummary[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const game of games) {
    const dateKey = getCalendarDateKey(game.date);
    counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
  }

  return counts;
}

function shouldShowGameLabel(
  game: GoldGameSummary,
  gamesPerDate: Map<string, number>,
): boolean {
  return (
    typeof game.game_number === "number" &&
    (gamesPerDate.get(getCalendarDateKey(game.date)) ?? 0) > 1
  );
}

function createSlateDateSection(
  doc: Document,
  group: SlateDateGroup,
  gamesPerDate: Map<string, number>,
): HTMLElement {
  const section = doc.createElement("section");
  section.className = "slate-date-group";
  if (group.isToday) {
    section.classList.add("slate-date-group--today");
  }

  const heading = doc.createElement("h3");
  heading.className = "slate-date-group__heading";
  heading.textContent = group.label;
  if (group.isToday) {
    heading.setAttribute("aria-current", "date");
    heading.append(doc.createTextNode(" "), createTodayBadge(doc));
  }

  const list = doc.createElement("div");
  list.className = "slate-game-list";
  for (const game of group.games) {
    list.append(createSlateGameCard(doc, game, gamesPerDate));
  }

  section.append(heading, list);
  return section;
}

function createTodayBadge(doc: Document): HTMLElement {
  const badge = doc.createElement("span");
  badge.className = "slate-today-badge";
  badge.textContent = "Today";
  return badge;
}

function createSlateGameCard(
  doc: Document,
  game: GoldGameSummary,
  gamesPerDate: Map<string, number>,
): HTMLElement {
  const details = getSlateGameDetails(doc, game);
  const article = doc.createElement("article");
  article.className = "slate-game";

  const header = doc.createElement("div");
  header.className = "slate-game__header";

  const titleRow = doc.createElement("div");
  titleRow.className = "slate-game__title-row";

  const title = doc.createElement("h4");
  title.className = "slate-game__title";
  title.textContent = `${game.away_team.name} @ ${game.home_team.name}`;
  titleRow.append(title);

  if (shouldShowGameLabel(game, gamesPerDate)) {
    titleRow.append(createGameLabel(doc, game.game_number));
  }

  const meta = doc.createElement("p");
  meta.className = "slate-game__meta";
  meta.append(
    createStatusBadge(doc, details.statusVariant, details.statusLabel),
    createInlineText(doc, details.detailLabel),
  );

  header.append(titleRow, meta);

  const body = doc.createElement("div");
  body.className = "slate-game__body";

  if (details.score) {
    const score = doc.createElement("p");
    score.className = "slate-game__score";
    score.append(details.score);
    body.append(score);
  }

  if (details.note) {
    const note = createParagraph(doc, details.note);
    note.className = "schedule-note";
    body.append(note);
  }

  const actions = createScheduleActions(doc, details);
  if (actions.childElementCount > 0) {
    body.append(actions);
  }

  article.append(header, body);
  return article;
}

function getSlateGameDetails(doc: Document, game: GoldGameSummary): SlateGameDetails {
  const boxscoreHref = game.status === "Final" ? `/boxscore/${game.game_pk}` : null;
  const watchHref = game.status === "Final" && game.condensed_game_url
    ? createWatchHref(game.condensed_game_url, game)
    : null;

  if (game.status === "Scheduled") {
    return {
      boxscoreHref: null,
      detailLabel: SLATE_TIME_FORMATTER.format(new Date(game.date)),
      note: null,
      score: null,
      statusLabel: "Scheduled",
      statusVariant: "scheduled",
      watchHref: null,
    };
  }

  if (game.status === "Postponed") {
    return {
      boxscoreHref: null,
      detailLabel: "No start time",
      note: null,
      score: null,
      statusLabel: "Postponed",
      statusVariant: "postponed",
      watchHref: null,
    };
  }

  if (game.status === "Final") {
    return {
      boxscoreHref,
      detailLabel: "Final",
      note: null,
      score: createAccessibleScore(doc, game),
      statusLabel: "Final",
      statusVariant: "final",
      watchHref,
    };
  }

  return {
    boxscoreHref: null,
    detailLabel: game.status,
    note: game.score ? "Score as of last update." : null,
    score: createAccessibleScore(doc, game),
    statusLabel: game.status,
    statusVariant: game.status === "In Progress" || game.status === "Delayed"
      ? "in-progress"
      : "default",
    watchHref: null,
  };
}

function getGameDetails(doc: Document, teamId: number, game: GoldGameSummary): GameDetails {
  const isHome = game.home_team.id === teamId;
  const opponent = isHome ? game.away_team : game.home_team;
  const compactDate = GAME_DATE_FORMATTER.format(new Date(game.date));
  const matchupPrefix = isHome ? "vs" : "at";
  const matchupLabel = `${matchupPrefix} ${opponent.name}`;
  const boxscoreHref = game.status === "Final" ? `/boxscore/${game.game_pk}` : null;
  const watchHref = game.status === "Final" && game.condensed_game_url
    ? createWatchHref(game.condensed_game_url, game)
    : null;

  if (game.status === "Scheduled") {
    return {
      boxscoreHref: null,
      dateLabel: compactDate,
      homeAwayLabel: isHome ? "Home" : "Away",
      matchupLabel,
      note: null,
      opponent,
      resultLabel: TIME_FORMATTER.format(new Date(game.date)),
      score: null,
      statusLabel: "Scheduled",
      statusVariant: "scheduled",
      watchHref: null,
    };
  }

  if (game.status === "Postponed") {
    return {
      boxscoreHref: null,
      dateLabel: compactDate,
      homeAwayLabel: isHome ? "Home" : "Away",
      matchupLabel,
      note: null,
      opponent,
      resultLabel: "No start time",
      score: null,
      statusLabel: "Postponed",
      statusVariant: "postponed",
      watchHref: null,
    };
  }

  if (game.status === "Final") {
    return {
      boxscoreHref,
      dateLabel: compactDate,
      homeAwayLabel: isHome ? "Home" : "Away",
      matchupLabel,
      note: null,
      opponent,
      resultLabel: "Final",
      score: createAccessibleScore(doc, game, teamId),
      statusLabel: "Final",
      statusVariant: "final",
      watchHref,
    };
  }

  return {
    boxscoreHref: null,
    dateLabel: compactDate,
    homeAwayLabel: isHome ? "Home" : "Away",
    matchupLabel,
    note: game.status === "In Progress" ? "Score as of last update." : null,
    opponent,
    resultLabel: game.status,
    score: createAccessibleScore(doc, game, teamId),
    statusLabel: game.status,
    statusVariant: game.status === "In Progress" ? "in-progress" : "default",
    watchHref: null,
  };
}

function createAccessibleScore(
  doc: Document,
  game: GoldGameSummary,
  teamId?: number,
): HTMLElement | null {
  if (!game.score) {
    return null;
  }

  const isHome = typeof teamId === "number" ? game.home_team.id === teamId : undefined;
  const teamName = isHome === undefined
    ? game.away_team.name
    : isHome
      ? game.home_team.name
      : game.away_team.name;
  const teamScore = isHome === undefined ? game.score.away : isHome ? game.score.home : game.score.away;
  const opponentName = isHome === undefined
    ? game.home_team.name
    : isHome
      ? game.away_team.name
      : game.home_team.name;
  const opponentScore = isHome === undefined
    ? game.score.home
    : isHome
      ? game.score.away
      : game.score.home;

  const wrapper = doc.createElement("span");
  wrapper.className = "schedule-score";

  const accessibleLabel = doc.createElement("span");
  accessibleLabel.className = "visually-hidden";
  accessibleLabel.textContent = `${teamName} ${teamScore}, ${opponentName} ${opponentScore}`;

  const compactScore = doc.createElement("span");
  compactScore.setAttribute("aria-hidden", "true");
  compactScore.textContent = `${teamScore}-${opponentScore}`;

  wrapper.append(accessibleLabel, compactScore);
  return wrapper;
}

function createWatchHref(condensedGameUrl: string, game: GoldGameSummary): string {
  const params = new URLSearchParams({
    src: condensedGameUrl,
    subtitle: "Condensed Game",
    title: `${game.away_team.name} at ${game.home_team.name}`,
  });
  return `/watch/?${params.toString()}`;
}

function formatLastUpdated(value: string | null): string {
  if (!value) {
    return "unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return LAST_UPDATED_FORMATTER.format(parsed);
}

function getCalendarDateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getCurrentDate(): Date {
  return new Date(Date.now());
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

  const boxscoreMatch = BOXSCORE_ROUTE_PATTERN.exec(pathname);
  if (boxscoreMatch) {
    return { view: "boxscore", gamePk: Number(boxscoreMatch[1]) };
  }

  return { view: "not-found" };
}

function isAppRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/teams" ||
    TEAM_ROUTE_PATTERN.test(pathname) ||
    BOXSCORE_ROUTE_PATTERN.test(pathname)
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
