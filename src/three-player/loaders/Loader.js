import * as THREE from "three";
import LoadingQueue from "./LoadingQueue.js";

export class Resource {
  constructor(source, owner) {
    const { src = "", type = "", id = Math.random(), config = null } = source || {};
    this.url = src;
    this.id = id;
    this.mediaType = this.isBase64 ? "base64" : type;
    this.config = config;
    switch (type) {
      case "video":
      case "image":
        this.responseType = "blob";
        break;
      case "audio":
        this.responseType = "arraybuffer";
        break;
      default:
        this.responseType = type;
    }
    this.result = null;
    this.loader = owner;
    if (this.mediaType === "base64") this.load(this.url);
  }

  checkComplete() {
    this.loader.onFileComplete(this);
    this.loader.counter += 1;
    if (this.loader.counter === Object.keys(this.loader.list).length) {
      this.loader.onLoadComplete();
    }
  }

  load(response) {
    switch (this.mediaType) {
      case "base64":
        this.result = new Image();
        this.result.onload = this.checkComplete.bind(this);
        this.result.src = response;
        break;
      case "video":
        this.result = window.URL.createObjectURL(response);
        this.checkComplete();
        break;
      case "image":
      case "blob":
        this.result = new Image();
        this.result.onload = this.checkComplete.bind(this);
        this.result.src = window.URL.createObjectURL(response);
        break;
      default:
        this.result = response;
        this.checkComplete();
    }
  }

  get isBase64() {
    return this.url.indexOf("data:image") === 0;
  }
}

export class Loader extends THREE.EventDispatcher {
  constructor() {
    super();
    this.loaded = true;
    this.list = {};
    this.counter = 0;
  }

  removeAll() {
    this.counter = 0;
    this.list = {};
  }

  getItems() {
    return Object.keys(this.list).map((key) => this.list[key]);
  }

  getResult(id) {
    return this.list[id] ? this.list[id].result : null;
  }

  onLoadProgress(progress) {
    this.dispatchEvent({ type: "progress", progress });
  }

  onLoadComplete() {
    this.loaded = true;
    this.dispatchEvent({ type: "complete" });
  }

  onLoadError(error) {
    this.dispatchEvent({ type: "error", data: error });
  }

  onFileComplete(resource) {
    this.dispatchEvent({ type: "fileComplete", data: resource });
  }

  loadManifest(manifest) {
    if (manifest.length > 0) {
      const pending = [];
      manifest.forEach((source) => {
        if (!source.src) throw new Error(`图片不存在，请仔细核对${source.id}`);
        if (!this.list[source.id]) {
          const resource = new Resource(source, this);
          this.list[source.id] = resource;
          if (!resource.isBase64) pending.push(resource);
          this.loaded = false;
        }
      });
      if (pending.length > 0) {
        new LoadingQueue({
          minTime: 10,
          onprogress: this.onLoadProgress.bind(this),
          onerror: this.onLoadError.bind(this),
          list: pending,
        }).init();
      } else if (this.loaded) {
        this.onLoadComplete();
      }
    } else if (this.loaded) {
      this.onLoadComplete();
    }
  }
}

export const loader = new Loader();
export function createLoader() {
  return new Loader();
}

export default Loader;
