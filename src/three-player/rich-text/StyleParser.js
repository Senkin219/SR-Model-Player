import {
  AllowedLineHeights,
  AllowedNewLines,
  AllowedStretches,
  AllowedStyles,
  AllowedTextAligns,
  AllowedVariants,
  AllowedVerticalAlign,
  AllowedWeights,
  AllowedWhiteSpace,
} from "./RichTextConstants.js";

const POSITIVE_NUMBER = /^[+]?[0-9]+(?:[.][0-9]+)?(?:px)?$/;
const SIGNED_NUMBER = /^[+-]?[0-9]+(?:[.][0-9]+)?(?:px)?$/;
const NON_NUMERIC = /[^0-9.]/g;
const NON_SIGNED_NUMERIC = /[^0-9.-]/g;
const COLOR_NAMES = new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgrey",
  "darkgreen",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "grey",
  "green",
  "greenyellow",
  "honeydew",
  "hotpink",
  "indianred ",
  "indigo ",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgrey",
  "lightgreen",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
]);

function isValidCssColor(value) {
  if (typeof Option === "undefined") return false;
  const style = new Option().style;
  style.color = value;
  return style.color !== "";
}

export default function parseStyleValue(property, value) {
  switch (property) {
    case "color":
    case "strokeColor":
      if (COLOR_NAMES.has(value.toLowerCase())) return value;
      if (value.charAt(0) === "#") return isValidCssColor(value) ? value : undefined;
      switch (value.substr(0, 4).toLowerCase()) {
        case "rgb(":
        case "hsl(":
        case "rgba":
        case "hsla":
          return isValidCssColor(value) ? value : undefined;
        default:
          return undefined;
      }

    case "fontSize":
    case "strokeWidth": {
      if (!POSITIVE_NUMBER.test(value)) return undefined;
      const number = Number.parseFloat(value.replace(NON_NUMERIC, ""));
      return number > 0 ? number : undefined;
    }

    case "fontFamily":
      return value.length === 0 ? undefined : value;
    case "fontStyle":
      return AllowedStyles.has(value.toLowerCase()) ? value : undefined;
    case "fontWeight":
      return AllowedWeights.has(value.toLowerCase()) ? value : undefined;
    case "fontVariant":
      return AllowedVariants.has(value.toLowerCase()) ? value : undefined;
    case "fontStretch":
      return AllowedStretches.has(value.toLowerCase()) ? value : undefined;
    case "textAlign":
      return AllowedTextAligns.has(value.toLowerCase()) ? value : undefined;
    case "verticalAlign":
      return AllowedVerticalAlign.has(value.toLowerCase()) ? value : undefined;
    case "whiteSpace":
      return AllowedWhiteSpace.has(value.toLowerCase()) ? value : undefined;
    case "newLine":
      return AllowedNewLines.has(value.toLowerCase()) ? value : undefined;
    case "spaceWidth":
    case "lineSpacing":
      return SIGNED_NUMBER.test(value) ? Number.parseFloat(value.replace(NON_SIGNED_NUMERIC, "")) : undefined;
    case "lineHeight":
      return AllowedLineHeights.has(value.toLowerCase()) ? value : undefined;
    default:
      return value;
  }
}
