import * as THREE from "three";

export function getCamera(cameraData, sceneConfig) {
  const { position, rotation, camera } = cameraData;
  const { uiWidth, uiHeight } = sceneConfig;
  let result;

  switch (camera.type) {
    case 1:
      result = new THREE.PerspectiveCamera(camera.fov || 32, uiWidth / uiHeight, camera.near || 0.01, camera.far || 10000);
      break;
    case 2:
      result = new THREE.OrthographicCamera(
        camera.left || -100,
        camera.right || 100,
        camera.top || 100,
        camera.bottom || -100,
        camera.near || 0.01,
        camera.far || 10000,
      );
      break;
    default:
      throw new Error(`unknown camera type:${camera.type}`);
  }

  result.position.fromArray(position);
  result.rotation.fromArray(rotation);
  return result;
}

export function layoutToPosition(x, y, camera) {
  const { far, near } = camera;
  const depth = -camera.position.z;
  const projectedDepth = ((-(far + near) / (far - near)) * depth + (-2 * far * near) / (far - near)) / -depth;
  return new THREE.Vector3(x, y, projectedDepth).applyMatrix4(camera.projectionMatrixInverse);
}

export function cameraAdaptScreen(camera, setting, width, height) {
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.left = -width / 2;
  camera.right = width / 2;

  const designRatio = setting.width / setting.height;
  const ratioFactor = width / height / designRatio;
  let zoom;

  switch (setting.type) {
    case "width":
      zoom = width / setting.width;
      break;
    case "height":
      zoom = height / setting.height;
      break;
    case "cover":
      zoom = ratioFactor > 1 ? width / setting.width : height / setting.height;
      break;
    case "contain":
      zoom = ratioFactor > 1 ? height / setting.height : width / setting.width;
      break;
    default:
      zoom = 1;
  }

  camera.zoom = zoom;
  camera.updateProjectionMatrix();
}
