import * as THREE from "three";
import { gsap } from "gsap";
import { ThreePlayer } from "../../three-player/index.js";

export default function createAnimationSettings(modelPlayer) {
  return {
    speakStart: function speakStart() {
      ThreePlayer.getEventDispatcher().dispatchEvent({ type: "speakStart" });
    },

    fadeWeapon: function fadeWeapon() {
      gsap.to(modelPlayer.uniformSettings.weaponOpacity, {
        value: 0,
        overwrite: true,
        duration: 0.3,
      });
    },

    idleStart: function idleStart() {
      gsap.to(modelPlayer.uniformSettings.weaponOpacity, {
        value: 1,
        overwrite: true,
        duration: 0,
      });
      this.getObjectByName("Weapon").userData.disabled = false;
    },

    standbyStart: function standbyStart() {
      this.getObjectByName("Weapon").userData.disabled = true;
    },

    onManInit: function onManInit() {
      this.show = () => {
        modelPlayer.orbit.setTarget(new THREE.Vector3(0, 95, 0));
        modelPlayer.orbit.update();
      };
    },

    onWomanInit: function onWomanInit() {
      this.show = () => {
        modelPlayer.orbit.setTarget(new THREE.Vector3(0, 85, 0));
        modelPlayer.orbit.update();
      };
    },

    onGirlInit: function onGirlInit() {
      this.show = () => {
        modelPlayer.orbit.setTarget(new THREE.Vector3(0, 73, 0));
        modelPlayer.orbit.update();
      };
    },

    onBoyInit: function onBoyInit() {
      this.show = () => {
        modelPlayer.orbit.setTarget(new THREE.Vector3(0, 80, 0));
        modelPlayer.orbit.update();
      };
    },

    onChildInit: function onChildInit() {
      this.show = () => {
        modelPlayer.orbit.setTarget(new THREE.Vector3(0, 60, 0));
        modelPlayer.orbit.update();
      };
    },
  };
}
