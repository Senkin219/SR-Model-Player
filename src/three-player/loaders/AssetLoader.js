function isDataImage(source) {
  return typeof source === "string" && source.indexOf("data:image") === 0;
}

function requestSource({ method = "get", url = "", responseType = "text", need404Resolve, placeholder404 }) {
  const request = new XMLHttpRequest();
  return new Promise(
    request
      ? (resolve, reject) => {
          if (isDataImage(url)) {
            resolve(url);
          } else {
            request.onprogress = () => {};
            request.open(method, url);
            request.responseType = responseType;
            request.onreadystatechange = () => {
              if (request.readyState === 4) {
                if (request.status === 200) resolve(request);
                else if ((request.status === 404 || request.status === 403) && need404Resolve) {
                  resolve({ type: 404, result: placeholder404 });
                } else reject(request.statusText);
              }
            };
            request.send();
          }
        }
      : (_resolve, reject) => reject(new Error("您的浏览器不支持XHR")),
  );
}

export class SourceLoad {
  constructor(options = {}) {
    const { manifestList = [], loadProgressCallBack = () => {}, loadErrorCallBack = () => {}, loadCompleteCallBack = () => {}, sourcePool = {} } = options;
    this.manifestList = manifestList;
    this.loadProgressCallBack = loadProgressCallBack;
    this.loadErrorCallBack = loadErrorCallBack;
    this.loadCompleteCallBack = loadCompleteCallBack;
    this.sourcePool = sourcePool;
    this.result = {};
    this.count = 0;
  }

  load(manifestList, options = {}) {
    if (manifestList) {
      this.manifestList = manifestList;
      this.count = 0;
    }
    return new Promise(async (resolve, reject) => {
      const failedResources = await this.batch(this.manifestList, options);
      const retryFailures = [];
      if (failedResources.length) {
        for (let index = failedResources.length - 1; index > -1; index -= 1) {
          const retryResult = await this.batch([failedResources.pop()], options);
          if (retryResult.length) retryFailures.push(retryResult[0]);
        }
      }
      if (retryFailures.length) {
        this.loadErrorCallBack(retryFailures);
        reject(retryFailures);
      } else {
        resolve();
      }
    });
  }

  batch(manifestList, options = {}) {
    return new Promise(async (resolve) => {
      const {
        need404Resolve = false,
        placeholder404 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjuHxk7X8AB/YDRBwwtOgAAAAASUVORK5CYII=",
      } = options;
      const failedResources = [];
      await Promise.all(
        manifestList.map(
          (resource) =>
            new Promise((resolveResource) => {
              const { type = "image", src = "", id } = resource;
              requestSource({
                url: src,
                responseType: this.getSourceResponseType(type),
                need404Resolve,
                placeholder404,
              })
                .then((response) => {
                  this.resourceCompile(response, resource).then((result) => {
                    this.result[id] = { ...resource, result };
                    this.sourcePool[id] = this.result[id];
                    this.checkComplete();
                    resolveResource();
                  });
                })
                .catch(() => {
                  failedResources.push(resource);
                  resolveResource();
                });
            }),
        ),
      );
      resolve(failedResources);
    });
  }

  checkComplete() {
    this.count += 1;
    const progress = this.count / this.manifestList.length;
    this.loadProgressCallBack(progress);
    if (this.count === this.manifestList.length) this.loadCompleteCallBack();
  }

  getResult(id) {
    return this.result[id] ? this.result[id].result : null;
  }

  getSourceResponseType(type) {
    switch (type) {
      case "video":
      case "image":
        return "blob";
      case "audio":
        return "arraybuffer";
      default:
        return type;
    }
  }

  resourceCompile(response, resource) {
    const { type, src, id } = resource;
    return new Promise((resolve, reject) => {
      if (response.type === 404) {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = response.result;
        return;
      }
      try {
        if (type === "image") {
          const image = new Image();
          image.onload = () => resolve(image);
          image.src = isDataImage(src) ? src : window.URL.createObjectURL(response.response);
        } else {
          resolve(response.response);
        }
      } catch (error) {
        this.loadErrorCallBack(new Error(`source ${id} ${error.message}`));
        reject(error);
      }
    });
  }

  setEventListener(type, listener) {
    switch (type) {
      case "error":
        this.loadErrorCallBack = listener;
        break;
      case "progress":
        this.loadProgressCallBack = listener;
        break;
      case "complete":
        this.loadCompleteCallBack = listener;
        break;
      default:
        break;
    }
  }

  removeEventListener(type) {
    switch (type) {
      case "error":
        this.loadErrorCallBack = () => {};
        break;
      case "progress":
        this.loadProgressCallBack = () => {};
        break;
      case "complete":
        this.loadCompleteCallBack = () => {};
        break;
      default:
        break;
    }
  }

  clearAllListener() {
    this.loadErrorCallBack = () => {};
    this.loadProgressCallBack = () => {};
    this.loadCompleteCallBack = () => {};
  }
}

export const AssetLoader = SourceLoad;
export const sourceLoader = new SourceLoad();
export function createSourceLoader() {
  return new SourceLoad();
}

export default SourceLoad;
