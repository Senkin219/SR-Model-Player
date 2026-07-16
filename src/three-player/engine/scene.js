export function getSceneData(layoutData, sceneName) {
  return layoutData.sceneList.find((scene) => scene.id === sceneName);
}
