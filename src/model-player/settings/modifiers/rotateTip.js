import { gsap } from "gsap";
import { ThreePlayer } from "../../../three-player/index.js";
import uniformSettings from "../uniforms.js";

export default function initializeRotateTip() {
  const tip = this;
  const shownForRole = {};

  tip.onBeforeRender = () => {
    tip.rotation.z = 0.5 * Math.sin(uniformSettings.time.value);
  };

  tip.show = () => {
    tip.visible = true;
    gsap.fromTo(
      tip.material.uniforms.opacity,
      { value: 0 },
      {
        value: 1,
        duration: 0.5,
        overwrite: true,
        onComplete: () => {
          gsap.to(tip.material.uniforms.opacity, {
            value: 0,
            duration: 0.5,
            delay: 5,
            overwrite: true,
            onComplete: () => {
              tip.visible = false;
            },
          });
        },
      },
    );
  };

  ThreePlayer.getEventDispatcher().addEventListener("changeRole", ({ data }) => {
    if (!shownForRole[data]) {
      shownForRole[data] = true;
      tip.show();
    }
  });
  tip.show();
}
