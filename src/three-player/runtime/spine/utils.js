export function throttle(callback, delay) {
  let waiting = false;
  let pendingArguments;
  let pendingContext;

  return function throttled(...args) {
    if (waiting) {
      pendingArguments = args;
      pendingContext = this;
      return;
    }

    waiting = true;
    callback.apply(this, args);
    setTimeout(() => {
      waiting = false;
      if (pendingArguments) {
        throttled.apply(pendingContext, pendingArguments);
        pendingArguments = null;
        pendingContext = null;
      }
    }, delay);
  };
}

export function isAvailable(value) {
  const valueType = typeof value;
  return (
    valueType !== "undefined" &&
    (valueType === "number" || valueType === "bigint"
      ? !Number.isNaN(value)
      : valueType === "string"
        ? value.length !== 0
        : valueType === "boolean" ||
          valueType === "function" ||
          valueType === "symbol" ||
          (valueType === "object"
            ? value !== null &&
              (value instanceof Array
                ? value.length !== 0
                : value instanceof Map || value instanceof Set
                  ? value.size !== 0
                  : value instanceof HTMLElement || Object.keys(value).length !== 0)
            : undefined))
  );
}

export function fromEntries(entries) {
  return [].concat(Array.isArray(entries) ? [...entries] : Array.from(entries)).reduce((result, entry) => {
    const [key, value] = entry;
    result[key] = value;
    return result;
  }, {});
}
