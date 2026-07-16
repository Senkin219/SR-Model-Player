import BlurPass from "./BlurPass.js";
import CopyPass from "./CopyPass.js";

const passSettings = {
  blurPass: new BlurPass(),
  copyPass: new CopyPass(),
};

export { passSettings };
export default passSettings;
