export default function initializeFace(_objectData, player, modifierData) {
  const { texture = "" } = modifierData;
  const depthMaterial = player.getMaterial([{ id: "DEPTH" }]);
  depthMaterial.defines.USE_FACEMAP = 1;
  depthMaterial.uniforms.diffuse = { value: player.getTexture(texture) };

  this.userData.depthMat = [
    depthMaterial,
    player.getMaterial([
      {
        id: "CHARACTER_OUTLINE",
        defines: { DISCARD: 1 },
      },
    ]),
  ];
}
