import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initRouter } from "../src/main";

const appShell = `
  <p id="status-announcements"></p>
  <header>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/" data-nav-link="true">Today's Slate</a></li>
        <li><a href="/teams" data-nav-link="true">Teams</a></li>
      </ul>
    </nav>
    <button id="theme-toggle" type="button">
      <span class="icon"></span>
      <span class="label"></span>
    </button>
  </header>
  <main id="main-content"><div id="app-view"></div></main>
`;

describe("app routing", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    document.body.innerHTML = appShell;
    window.history.pushState({}, "", "/teams");
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.innerHTML = "";
    document.title = "Catch";
  });

  it("renders the Yankees schedule when loading the team route directly", () => {
    window.history.pushState({}, "", "/team/147");

    cleanup = initRouter(document, window);

    expect(document.querySelector("h2")?.textContent).toBe(
      "New York Yankees schedule",
    );
    expect(document.title).toBe("Catch | New York Yankees");
    expect(
      document.querySelector('[aria-current="page"][data-team-link="true"]')
        ?.textContent,
    ).toContain("New York Yankees");
  });

  it("navigates between top-level views without a full page reload", () => {
    cleanup = initRouter(document, window);
    const pushStateSpy = vi.spyOn(window.history, "pushState");
    const teamsLink = document.querySelector<HTMLAnchorElement>(
      'a[href="/team/147"]',
    );
    expect(teamsLink).not.toBeNull();

    teamsLink?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );

    expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/team/147");
    expect(window.location.pathname).toBe("/team/147");
    expect(document.querySelector("h2")?.textContent).toBe(
      "New York Yankees schedule",
    );
    expect(document.activeElement).toBe(document.querySelector("h2"));
  });

  it("supports arrow-key navigation and Enter selection in the team selector", () => {
    cleanup = initRouter(document, window);

    const oriolesLink = document.querySelector<HTMLAnchorElement>(
      'a[href="/team/110"]',
    );
    expect(oriolesLink).not.toBeNull();

    oriolesLink?.focus();
    oriolesLink?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );

    const redSoxLink = document.querySelector<HTMLAnchorElement>(
      'a[href="/team/111"]',
    );
    expect(document.activeElement).toBe(redSoxLink);

    redSoxLink?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(window.location.pathname).toBe("/team/111");
    expect(document.querySelector("h2")?.textContent).toBe(
      "Boston Red Sox schedule",
    );
  });
});
