import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { createPartialResponse } from "workbox-range-requests";

const MODEL_CACHE_NAME = "sr-model-player-cache";
const resourceRevalidations = new Map();

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), { denylist: [/^\/models\//] }));

function createFullResourceRequest(request) {
  if (!request.headers.has("Range") && !request.headers.has("If-Range")) return request;
  const headers = new Headers(request.headers);
  headers.delete("Range");
  headers.delete("If-Range");
  return new Request(request, { headers });
}

function createConditionalRequest(request, cachedResponse) {
  if (request.mode === "no-cors") return request;
  const etag = cachedResponse.headers.get("ETag");
  const lastModified = cachedResponse.headers.get("Last-Modified");
  if (!etag && !lastModified) return request;
  const headers = new Headers(request.headers);
  if (etag) headers.set("If-None-Match", etag);
  if (lastModified) headers.set("If-Modified-Since", lastModified);
  return new Request(request, { headers });
}

async function updateCachedResource(cache, request, cachedResponse) {
  const response = await fetch(createConditionalRequest(request, cachedResponse));
  if (response.status === 200) {
    await cache.put(request, response).catch(() => {});
  } else {
    await response.body?.cancel().catch(() => {});
  }
}

function revalidateCachedResource(cache, request, cachedResponse) {
  const fullRequest = createFullResourceRequest(request);
  const key = fullRequest.url;
  const existingRevalidation = resourceRevalidations.get(key);
  if (existingRevalidation) return existingRevalidation;
  let revalidation;
  revalidation = updateCachedResource(cache, fullRequest, cachedResponse).finally(() => {
    if (resourceRevalidations.get(key) === revalidation) resourceRevalidations.delete(key);
  });
  resourceRevalidations.set(key, revalidation);
  return revalidation;
}

async function handleResourceRequest(request) {
  const cache = await caches.open(MODEL_CACHE_NAME);
  const fullRequest = createFullResourceRequest(request);
  const cachedResponse = await cache.match(fullRequest);
  if (cachedResponse) {
    const cacheUpdate = revalidateCachedResource(cache, request, cachedResponse).catch(() => {});
    const response = request.headers.has("Range") ? await createPartialResponse(request, cachedResponse) : cachedResponse;
    return { response, cacheUpdate };
  }
  const response = await fetch(request);
  const cacheUpdate = response.status === 200 ? cache.put(fullRequest, response.clone()).catch(() => {}) : Promise.resolve();
  return { response, cacheUpdate };
}

registerRoute(/\/models\/.*\.(png|jpg|bin|json)$/, ({ request, event }) => {
  const result = handleResourceRequest(request);
  event.waitUntil(result.then(({ cacheUpdate }) => cacheUpdate).catch(() => {}));
  return result.then(({ response }) => response);
});
