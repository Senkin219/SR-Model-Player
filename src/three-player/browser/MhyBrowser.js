import BrowserBase from "./BrowserBase.js";

export default class MhyBrowser extends BrowserBase {
  constructor(request) {
    if (request) {
      const { url, headers } = request;
      const userAgent = headers["user-agent"] || "";
      const languageMatch = /([a-z0-9_-]+)(\s|,|;|$)/i.exec(headers["accept-language"]);
      const language = ((languageMatch && languageMatch[1]) || "").toLowerCase();
      super({ url, userAgent, language });
    } else {
      if (typeof window === "undefined") {
        throw new TypeError('The "req" parameter is required on the server side');
      }
      super({
        window,
        url: window.location.href,
        userAgent: window.navigator.userAgent,
        language: (navigator.browserLanguage || window.navigator.language).toLowerCase(),
      });
    }
  }
}
