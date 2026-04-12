import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";

type SwListener = (event: SwInstallEvent | SwActivateEvent | SwFetchEvent) => void;
type FetchMockFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface SwInstallEvent {
  waitUntil(promise: Promise<unknown>): void;
}

interface SwActivateEvent {
  waitUntil(promise: Promise<unknown>): void;
}

interface SwFetchEvent {
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
  respondWith(response: Promise<Response> | Response): void;
}

interface MockWindowClient {
  postMessage(message: { type: string }): void;
}

interface MockCache {
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
}

interface MockCacheStorage {
  stores: Map<string, Map<string, Response>>;
  open(name: string): Promise<MockCache>;
  match(request: Request | string): Promise<Response | undefined>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}

const SW_PATH = pathToFileURL(path.join(process.cwd(), "public/sw.js")).href;
let moduleImportVersion = 0;

const cacheKey = (request: Request | string): string =>
  typeof request === "string" ? request : request.url;

function createCacheStorageMock(): MockCacheStorage {
  const stores = new Map<string, Map<string, Response>>();

  return {
    stores,
    async open(name: string): Promise<MockCache> {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);

      return {
        async match(request: Request | string): Promise<Response | undefined> {
          const cached = store.get(cacheKey(request));
          return cached ? cached.clone() : undefined;
        },
        async put(request: Request | string, response: Response): Promise<void> {
          store.set(cacheKey(request), response.clone());
        },
      };
    },
    async match(request: Request | string): Promise<Response | undefined> {
      for (const store of stores.values()) {
        const cached = store.get(cacheKey(request));
        if (cached) return cached.clone();
      }
      return undefined;
    },
    async keys(): Promise<string[]> {
      return [...stores.keys()];
    },
    async delete(name: string): Promise<boolean> {
      return stores.delete(name);
    },
  };
}

async function dispatchFetch(
  listeners: Map<string, SwListener>,
  request: Request,
): Promise<{ response: Response; waitUntilPromises: Promise<unknown>[] }> {
  const fetchHandler = listeners.get("fetch");
  expect(fetchHandler).toBeDefined();

  let responsePromise: Promise<Response> | undefined;
  const waitUntilPromises: Promise<unknown>[] = [];

  fetchHandler?.({
    request,
    waitUntil(promise: Promise<unknown>) {
      waitUntilPromises.push(promise);
    },
    respondWith(response: Promise<Response> | Response) {
      responsePromise = Promise.resolve(response);
    },
  });

  expect(responsePromise).toBeDefined();
  if (!responsePromise) {
    throw new Error("Expected service worker fetch handler to call respondWith.");
  }

  return { response: await responsePromise, waitUntilPromises };
}

describe("service worker caching", () => {
  let listeners: Map<string, SwListener>;
  let cacheStorage: MockCacheStorage;
  let postMessageSpy: ReturnType<typeof vi.fn>;
  let claimSpy: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn<FetchMockFunction>>;

  beforeEach(async () => {
    vi.resetModules();
    listeners = new Map<string, SwListener>();
    cacheStorage = createCacheStorageMock();
    postMessageSpy = vi.fn();
    claimSpy = vi.fn(async () => undefined);

    const globalScope = {
      addEventListener(type: string, listener: SwListener): void {
        listeners.set(type, listener);
      },
      skipWaiting: vi.fn(async () => undefined),
      clients: {
        claim: claimSpy,
        matchAll: vi.fn(async (): Promise<MockWindowClient[]> => [
          { postMessage: postMessageSpy },
        ]),
      },
      location: new URL("https://catch.test"),
    };

    fetchMock = vi.fn(
      async (input: RequestInfo | URL): Promise<Response> =>
        new Response(`network:${typeof input === "string" ? input : input.toString()}`, {
          status: 200,
        }),
    );

    Object.assign(globalThis, {
      self: globalScope,
      caches: cacheStorage,
      fetch: fetchMock,
    });

    moduleImportVersion += 1;
    await import(`${SW_PATH}?v=${moduleImportVersion}`);
  });

  it("precaches app shell resources during install", async () => {
    const installHandler = listeners.get("install");
    expect(installHandler).toBeDefined();

    const waitUntilPromises: Promise<unknown>[] = [];
    installHandler?.({
      waitUntil(promise: Promise<unknown>) {
        waitUntilPromises.push(promise);
      },
    });

    await Promise.all(waitUntilPromises);
    const shellCache = cacheStorage.stores.get("catch-app-shell-v1");
    expect(shellCache?.has("/index.html")).toBe(true);
    expect(shellCache?.has("/offline.html")).toBe(true);
  });

  it("serves cached Gold JSON first and refreshes in background", async () => {
    const request = new Request("https://cdn.catch.test/gold/schedule.json");
    const cache = await cacheStorage.open("catch-gold-data-v1");
    await cache.put(request, new Response('{"source":"cache"}', { status: 200 }));

    fetchMock.mockResolvedValueOnce(
      new Response('{"source":"network"}', { status: 200 }),
    );

    const { response, waitUntilPromises } = await dispatchFetch(listeners, request);
    expect(await response.json()).toEqual({ source: "cache" });

    await Promise.all(waitUntilPromises);
    const refreshed = await cache.match(request);
    expect(await refreshed?.json()).toEqual({ source: "network" });
    expect(postMessageSpy).toHaveBeenCalledWith({ type: "gold-data-updated" });
  });

  it("returns friendly offline JSON when Gold data is unavailable and uncached", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const request = new Request("https://cdn.catch.test/gold/upcoming.json");

    const { response } = await dispatchFetch(listeners, request);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      offline: true,
      message: "You're offline — check back when connected.",
    });
  });

  it("cleans stale managed caches during activation", async () => {
    cacheStorage.stores.set("catch-app-shell-v0", new Map());
    cacheStorage.stores.set("catch-gold-data-v0", new Map());
    cacheStorage.stores.set("external-cache", new Map());

    const activateHandler = listeners.get("activate");
    expect(activateHandler).toBeDefined();

    const waitUntilPromises: Promise<unknown>[] = [];
    activateHandler?.({
      waitUntil(promise: Promise<unknown>) {
        waitUntilPromises.push(promise);
      },
    });
    await Promise.all(waitUntilPromises);

    expect(cacheStorage.stores.has("catch-app-shell-v0")).toBe(false);
    expect(cacheStorage.stores.has("catch-gold-data-v0")).toBe(false);
    expect(cacheStorage.stores.has("external-cache")).toBe(true);
    expect(claimSpy).toHaveBeenCalled();
  });

  it("does not cache mp4 requests", async () => {
    const request = new Request("https://media.example.com/game.mp4");
    await dispatchFetch(listeners, request);

    expect(fetchMock).toHaveBeenCalledWith(request);
    expect(cacheStorage.stores.has("catch-gold-data-v1")).toBe(false);
    expect(cacheStorage.stores.has("catch-app-shell-v1")).toBe(false);
  });
});
