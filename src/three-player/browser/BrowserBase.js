import globalObject from "./globalObject.js";

const DEVICE_TYPES = ["pc", "mobile", "ps4", "ps5"];

const stringUtils = {
  queryString(name, url) {
    const escapedName = name.replace(/[\[\]]/g, "\\$&");
    const match = new RegExp(`[?&]${escapedName}(=([^&#]*)|&|#|$)`).exec(url);
    if (!match) return null;
    return match[2] ? decodeURIComponent(match[2].replace(/\+/g, " ")) : "";
  },

  formatParams(parameters) {
    return Object.keys(parameters || {})
      .reduce((result, key) => {
        result.push(`${encodeURIComponent(key)}=${encodeURIComponent(parameters[key])}`);
        return result;
      }, [])
      .join("&");
  },

  getType(value) {
    return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
  },

  isEmpty(value) {
    let empty = true;
    if (value && typeof value === "string" && String(value).trim()) empty = false;
    return empty;
  },

  dealStr(value, mode) {
    const normalized = String(value).trim() || "";
    if (mode === "lower") return normalized.toLowerCase();
    if (mode === "upper") return normalized.toUpperCase();
    return normalized;
  },

  includes(source, search) {
    return source.indexOf(search) !== -1;
  },

  find(search, source) {
    return this.includes(source, search);
  },

  findIndex(values, predicate, thisArg) {
    for (let index = 0; index < values.length; index += 1) {
      if (predicate.call(thisArg, values[index], index, values)) return index;
    }
    return -1;
  },
};

export default class BrowserBase {
  constructor({ window: browserWindow, userAgent, url, language }) {
    this.userAgent = userAgent.toLowerCase();
    this.url = url;
    this.window = browserWindow;
    this.lang = language;
  }

  mobile() {
    return (
      this.platform() === "ios" ||
      this.platform() === "android" ||
      this.iphone() ||
      this.iwatch() ||
      this.ipod() ||
      this.androidPhone() ||
      this.blackberryPhone() ||
      this.windowsPhone() ||
      this.fxosPhone() ||
      this.meego() ||
      this.samsungPhone() ||
      this.othersMobile()
    );
  }

  tablet() {
    return this.ipad() || this.androidTablet() || this.blackberryTablet() || this.windowsTablet() || this.fxosTablet() || this.samsungTablet();
  }

  desktop() {
    return ["pc", "mac"].some((platform) => platform === this.platform()) || (!this.tablet() && !this.mobile());
  }

  portrait() {
    const browserWindow = this.window;
    if (!browserWindow) return this.getDeviceType() === "mobile";
    if (screen.orientation && Object.prototype.hasOwnProperty.call(browserWindow, "onorientationchange")) {
      return this.includes(screen.orientation.type, "portrait");
    }
    if (this.ios() && Object.prototype.hasOwnProperty.call(browserWindow, "orientation")) {
      return Math.abs(browserWindow.orientation) !== 90;
    }
    return browserWindow.innerHeight / browserWindow.innerWidth > 1;
  }

  landscape() {
    const browserWindow = this.window;
    if (!browserWindow) return !this.portrait();
    if (browserWindow.screen.orientation && Object.prototype.hasOwnProperty.call(browserWindow, "onorientationchange")) {
      return this.includes(browserWindow.screen.orientation.type, "landscape");
    }
    if (this.ios() && Object.prototype.hasOwnProperty.call(browserWindow, "orientation")) {
      return Math.abs(browserWindow.orientation) === 90;
    }
    return browserWindow.innerHeight / browserWindow.innerWidth < 1;
  }

  getOrient() {
    if (this.portrait()) return "portrait";
    if (this.landscape()) return "landscape";
    return "";
  }

  getDeviceEnd() {
    let deviceEnd;
    if (this.desktop()) deviceEnd = "desktop";
    else if (this.tablet()) deviceEnd = "tablet";
    else if (this.mobile()) deviceEnd = "mobile";
    return deviceEnd;
  }

  getDeviceType() {
    let deviceType = this.desktop() ? "pc" : this.tablet() || this.mobile() ? "mobile" : undefined;
    if (!deviceType) {
      const queryDeviceType = stringUtils.dealStr(this.queryString("device_type"));
      if (!stringUtils.isEmpty(queryDeviceType)) {
        const index = stringUtils.findIndex(DEVICE_TYPES, (type) => queryDeviceType.search(type) !== -1);
        deviceType = index !== -1 ? DEVICE_TYPES[index] : undefined;
      }
    }
    return deviceType;
  }

  platform() {
    return stringUtils.dealStr(this.queryString("plat_type"), "lower");
  }
  trident() {
    return this.find("trident");
  }
  presto() {
    return this.find("presto");
  }
  webkit() {
    return this.find("applewebKit");
  }
  gecko() {
    return this.find("gecko") && this.find("khtml");
  }
  language() {
    return this.lang;
  }
  isWindows() {
    return this.find("windows");
  }
  windowsPhone() {
    return this.isWindows() && this.find("phone");
  }
  windowsTablet() {
    return this.isWindows() && this.find("touch") && !this.windowsPhone();
  }
  isNode() {
    return typeof window === "undefined" && globalObject !== undefined;
  }
  iphone() {
    return !this.isWindows() && this.find("iphone");
  }
  iwatch() {
    return this.find("iwatch");
  }
  ipod() {
    return this.find("ipod");
  }

  ipad() {
    return this.find("ipad") || (this.window && this.window.navigator.platform === "MacIntel" && this.window.navigator.maxTouchPoints > 1);
  }

  macos() {
    return this.platform() === "mac" || this.find("mac");
  }
  ios() {
    return this.platform() === "ios" || this.iphone() || this.iwatch() || this.ipod() || this.ipad();
  }
  android() {
    return !this.isWindows() && (this.platform() === "android" || this.find("android"));
  }
  androidPhone() {
    return this.android() && this.find("mobile");
  }
  androidTablet() {
    return this.android() && !this.find("mobile");
  }
  blackberry() {
    return this.find("blackberry") || this.find("bb10");
  }
  blackberryPhone() {
    return this.blackberry() && !this.find("tablet");
  }
  blackberryTablet() {
    return this.blackberry() && this.find("tablet");
  }
  meego() {
    return this.find("meego");
  }
  fxos() {
    return (this.find("(mobile") || this.find("(tablet")) && this.find(" rv:");
  }
  fxosPhone() {
    return this.fxos() && this.find("mobile");
  }
  fxosTablet() {
    return this.fxos() && this.find("tablet");
  }
  mumu() {
    return this.find("mumu") || this.find("build/v417ir;wv");
  }
  u3d() {
    return Boolean(this.userAgent.match(/unity 3d/));
  }
  ps() {
    return this.includes(this.platform(), "ps") || this.find("playstation");
  }
  wxwork() {
    return this.find("wxwork");
  }
  harmony() {
    return this.find("harmonyos");
  }
  harmonyPhone() {
    return this.harmony() && this.find("mobile");
  }
  bbs() {
    return this.find("mihoyobbs");
  }
  game() {
    return this.find("mihoyo") && !this.bbs();
  }
  wx() {
    return this.find("micromessenger");
  }
  weibo() {
    return this.find("weibo");
  }
  safari() {
    return this.find("safari") && !this.find("chrome");
  }
  edge() {
    return this.find("edge");
  }
  qqb() {
    return this.find("mqqbrowser");
  }
  samsungbrowser() {
    return this.find("samsungbrowser");
  }
  samsungPhone() {
    return this.android() && this.find("sm-");
  }
  samsungTablet() {
    return this.samsungbrowser() && !this.samsungPhone();
  }

  othersMobile() {
    return Boolean(this.userAgent.match(/mobile|iemobile|mqqbrowser|juc|fennec|wosbrowser|browserng|webos|symbian|huaweibrowser/i));
  }

  includes(source, search) {
    return stringUtils.includes(source, search);
  }
  find(search, source = null) {
    return source ? stringUtils.includes(source, search) : stringUtils.find(search, this.userAgent);
  }
  queryString(name) {
    return stringUtils.queryString(name, this.url);
  }
}
