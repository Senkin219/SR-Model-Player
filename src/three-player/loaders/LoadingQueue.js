import request from "./request.js";

function loadLocal(url, responseType, onProgress, onLoad, onGlobalError, onResourceError) {
  request({
    method: "get",
    baseURL: window.location.origin,
    url,
    responseType,
    onDownloadProgress(_event, lengthComputable, progress) {
      if (lengthComputable) onProgress(true, progress);
    },
  })
    .then((response) => {
      if (!response.lengthComputable) onProgress(response.lengthComputable);
      onLoad(response.data);
    })
    .catch((reason) => {
      onResourceError(url, reason);
      onGlobalError({ url, reason });
      onProgress();
    });
}

function loadCrossDomain(url, _responseType, onProgress, onLoad, onGlobalError, onResourceError) {
  const container = document.createElement("div");
  container.style.visibility = "hidden";
  const frame = document.createElement("iframe");
  frame.src = url;
  frame.width = 0;
  frame.height = 0;
  frame.onload = () => {
    onProgress();
    onLoad();
    document.body.removeChild(container);
  };
  frame.error = (reason) => {
    onProgress();
    onResourceError(url, reason);
    onGlobalError({ url, reason });
    document.body.removeChild(container);
  };
  document.body.appendChild(container);
  container.appendChild(frame);
}

function loadByDomain(resource, ...parameters) {
  if (resource.crossDomain) loadCrossDomain(...parameters);
  else loadLocal(...parameters);
}

const resourceTypes = {
  IMAGE: { method: loadByDomain },
  VIDEO: { method: loadByDomain },
  SOUND: { method: loadByDomain },
  CSS: { method: loadByDomain },
  JS: { method: loadByDomain },
  JSON: { method: loadByDomain },
  TXT: { method: loadByDomain },
  XML: { method: loadByDomain },
};

function getResourceType(url) {
  switch (url.substring(url.lastIndexOf(".") + 1).toLowerCase()) {
    case "jpeg":
    case "jpg":
    case "gif":
    case "png":
    case "webp":
    case "bmp":
      return resourceTypes.IMAGE;
    case "ogg":
    case "mp3":
    case "wav":
    case "aac":
      return resourceTypes.SOUND;
    case "mp4":
    case "webm":
    case "ts":
      return resourceTypes.VIDEO;
    case "json":
      return resourceTypes.JSON;
    case "xml":
      return resourceTypes.XML;
    case "css":
      return resourceTypes.CSS;
    case "js":
      return resourceTypes.JS;
    default:
      return resourceTypes.TXT;
  }
}

function flattenJsonResources(json) {
  const flatten = (items) => items.reduce((result, item) => (Array.isArray(item) ? result.concat(flatten(item)) : result.concat(item)), []);
  return flatten(Object.keys(json).map((group) => Object.keys(json[group]).map((key) => json[group][key]))).map((url) => ({ url }));
}

export class LoadingQueue {
  constructor(options) {
    const { list = [], minTime = 0, maxTime = false, defineTime = false, onprogress = () => {}, onload = () => {}, json = {}, onerror = () => {} } = options;
    this.list = [...list, ...flattenJsonResources(json)];
    this.minTime = minTime;
    this.onprogress = onprogress;
    this.onload = onload;
    this.count = 0;
    this.progress = 0;
    this.canLoad = false;
    this.max = this.list.length;
    this.hasLoad = false;
    this.defineTime = defineTime;
    this.maxTime = maxTime;
    this.onerror = onerror;
    this.globalErrList = [];
    this.timeslice = Number(Math.ceil(100 / this.list.length).toFixed(0));
    this.loadCb = this.loadCb.bind(this);
    this.init = this.init.bind(this);
    this.final = this.final.bind(this);
  }

  init() {
    this.onprogress(0);
    if (this.defineTime) {
      const advance = () => {
        if (this.progress < 100) {
          setTimeout(() => {
            if (!this.hasLoad) {
              this.onprogress(this.progress, Math.round(this.defineTime / 100) * this.progress);
              this.progress += 1;
              advance();
            }
          }, this.defineTime / 100);
        } else if (this.progress === 100) {
          this.onprogress(this.progress, this.defineTime);
          this.onload();
          if (this.globalErrList.length > 0) this.onerror(this.globalErrList);
        }
      };
      advance();
    } else {
      setTimeout(() => {
        this.canLoad = true;
        this.final();
      }, this.minTime);
      this.list.forEach((resource, index) => {
        getResourceType(resource.url).method(
          { crossDomain: resource.crossDomain || false },
          resource.url,
          resource.responseType,
          this.loadCb,
          (response) => {
            if (resource.load) resource.load(response, index);
          },
          (error) => {
            this.globalErrList.push(error);
          },
          (url, reason) => {
            if (resource.error) resource.error(url, index, reason);
          },
        );
      });
    }
    if (this.maxTime) {
      setTimeout(() => {
        if (this.progress < 100 && !this.hasLoad) {
          this.onprogress(100, 15000);
          this.onload();
          if (this.globalErrList.length > 0) this.onerror(this.globalErrList);
          this.hasLoad = true;
        }
      }, this.maxTime);
    }
  }

  loadCb(lengthComputable = false, progress) {
    if (!this.hasLoad) {
      this.progress += lengthComputable ? progress * this.timeslice : this.timeslice;
      this.progress = this.progress > 100 ? 100 : this.progress;
      if (this.onprogress && this.progress <= 99) {
        this.onprogress(Number(this.progress.toFixed(0)));
      }
    }
    this.final();
  }

  final() {
    if (this.progress > 99 && this.canLoad && !this.hasLoad) {
      this.progress = 100;
      if (this.onprogress) this.onprogress(this.progress);
      if (this.onload) {
        this.onload();
        if (this.globalErrList.length > 0) this.onerror(this.globalErrList);
        this.hasLoad = true;
      }
    }
  }
}

export default LoadingQueue;
