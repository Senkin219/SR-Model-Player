function parseResponse(request, options) {
  let response = request.response ? request.response : request.responseText;
  if (typeof response === "string" && options.responseType === "json") {
    response = JSON.parse(response);
  }
  return response;
}

function createRequest() {
  let request = false;
  try {
    request = new XMLHttpRequest();
  } catch (_error) {
    try {
      request = new ActiveXObject("Microsoft.XMLHTTP");
    } catch (_activeXError) {
      try {
        request = new ActiveXobject("Microsoft.XMLHTTP");
      } catch (_legacyActiveXError) {
        request = false;
      }
    }
  }
  return request;
}

export default function request(options) {
  const { method = "get", url = "", responseType = "text", data = {}, onDownloadProgress = () => {} } = options;
  const xhr = createRequest();
  return new Promise(
    xhr
      ? (resolve, reject) => {
          let lengthComputable = false;
          let previousLoaded = 0;
          xhr.onprogress = (event) => {
            lengthComputable = event.lengthComputable;
            onDownloadProgress(event, lengthComputable, (event.loaded - previousLoaded) / event.total);
            previousLoaded = event.loaded;
          };
          xhr.open(method, url);
          xhr.responseType = responseType;
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                resolve({
                  lengthComputable,
                  data: parseResponse(xhr, { responseType }),
                });
              } else {
                reject(xhr.statusText);
              }
            }
          };
          xhr.send(data);
        }
      : (_resolve, reject) => reject(new Error("您的浏览器不支持XHR")),
  );
}
