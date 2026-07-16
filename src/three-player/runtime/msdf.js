import * as THREE from "three";
const WORD_SPLITTER = /(\s|[\u4e00-\u9fa5,\uac00-\ud7af,\u0e00-\u0e7f]+)/;

export class MSDFAtlas {
  constructor(font, json, texture) {
    this.font = font;
    this.width = json.atlas.width;
    this.height = json.atlas.height;
    this.chars = new Map();
    this.texture = texture;
    json.glyphs.forEach((glyph) => {
      if (glyph.atlasBounds) {
        this.chars.set(glyph.unicode, {
          advance: glyph.advance,
          uv: {
            xMin: glyph.atlasBounds.left / this.width,
            xMax: glyph.atlasBounds.right / this.width,
            yMin: glyph.atlasBounds.bottom / this.height,
            yMax: glyph.atlasBounds.top / this.height,
          },
          pos: {
            xMin: glyph.planeBounds.left,
            xMax: glyph.planeBounds.right,
            yMin: glyph.planeBounds.bottom,
            yMax: glyph.planeBounds.top,
            cX: (glyph.planeBounds.left + glyph.planeBounds.right) / 2,
            cY: (glyph.planeBounds.top + glyph.planeBounds.bottom) / 2,
          },
        });
      }
    });
    this.lineHeight = json.atlas.size;
  }
}

export class MSDFTextMesh extends THREE.Mesh {
  static measureText(text, atlas, options) {
    const { fontSize, letterSpacing = 0 } = options;
    let width = 0;
    for (let index = 0; index < text.length; index += 1) {
      const character = atlas.chars.get(text.charCodeAt(index));
      if (character) {
        if (character.advance) width += character.advance * fontSize + letterSpacing;
      } else if (index < text.length - 1 && index > 0) {
        width += fontSize / 2 + letterSpacing;
      }
    }
    return width;
  }

  constructor(text = "", material, options = {}) {
    const settings = options || {};
    const {
      dynamic = true,
      needsCenterAttribute = false,
      atlas = null,
      align = "left",
      letterSpacing = 0,
      letterItalic = 0,
      fontSize = 32,
      fontWeight = 1,
      lineWidth = Number.MAX_VALUE,
      lineHeight = 1.5,
      shadow = null,
    } = settings;
    if (!atlas) throw new Error("未指定字体atlas");

    const geometry = new THREE.BufferGeometry();
    geometry.dynamic = dynamic;
    const textMaterial = material || MSDFTextMesh.DEFAULT_MATERIAL;
    textMaterial.uniforms.diffuse = { value: atlas.texture };
    textMaterial.uniforms.fontWeight = { value: fontWeight };
    textMaterial.extensions.derivatives = true;
    textMaterial.defines.MSDF_SIZE = `${Math.ceil(atlas.lineHeight)}.`;
    super(geometry, textMaterial);

    this.atlas = atlas;
    this.option = {
      align,
      letterSpacing,
      letterItalic,
      fontSize,
      lineWidth,
      lineHeight,
    };
    this.charCount = 0;
    this.textWidth = 0;
    this.textHeight = 0;
    this.needsUpdate = false;
    this.needsCenterAttribute = needsCenterAttribute;
    this.textCore = text;
    this.buildText(text, this.atlas, this.option);

    if (shadow) {
      const shadowMaterial = textMaterial.clone();
      shadowMaterial.uniforms = {
        diffuse: textMaterial.uniforms.diffuse,
        color: { value: shadow.color || MSDFTextMesh.DEFAULT_COLOR },
        weight: { value: shadow.weight || 1 },
        opacity: { value: shadow.opacity || 1 },
      };
      shadowMaterial.defines = {
        IS_SHADOW: 1,
        MSDF_SIZE: textMaterial.defines.MSDF_SIZE,
      };
      shadowMaterial.depthWrite = false;
      this.shadowMesh = new THREE.Mesh(geometry, shadowMaterial);
      if (shadow.offset) {
        this.shadowMesh.position.x += shadow.offset.x;
        this.shadowMesh.position.y -= shadow.offset.y;
        this.shadowMesh.updateMatrix();
      }
      this.shadowMesh.matrixAutoUpdate = false;
      this.add(this.shadowMesh);
      setTimeout(() => {
        this.shadowMesh.renderOrder = this.renderOrder - 0.001;
      });
    }

    this.userDefinedAfterRender = null;
    this.onAfterRenderCore = (...args) => {
      if (this.needsUpdate) this.update();
      if (this.userDefinedAfterRender) this.userDefinedAfterRender.apply(this, args);
    };
  }

  update() {
    if (this.geometry.dynamic || !this.geometry.indexs) {
      this.buildText(this.textCore.toString(), this.atlas, this.option);
    }
  }

  initGeometry() {
    const characterCapacity = this.geometry.dynamic ? MSDFTextMesh.MAX_TEXT : this.textCore.length;
    const usage = this.geometry.dynamic ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage;
    const positions = new Float32Array(4 * characterCapacity * 3);
    const uvs = new Float32Array(4 * characterCapacity * 2);
    const indices = new Uint16Array(6 * characterCapacity);
    for (let index = 0; index < characterCapacity; index += 1) {
      const indexOffset = 6 * index;
      const vertexOffset = 4 * index;
      indices[indexOffset] = vertexOffset + 2;
      indices[indexOffset + 1] = vertexOffset + 1;
      indices[indexOffset + 2] = vertexOffset;
      indices[indexOffset + 3] = vertexOffset + 2;
      indices[indexOffset + 4] = vertexOffset + 3;
      indices[indexOffset + 5] = vertexOffset + 1;
    }
    const positionAttribute = new THREE.BufferAttribute(positions, 3, false);
    positionAttribute.usage = usage;
    const uvAttribute = new THREE.BufferAttribute(uvs, 2, true);
    uvAttribute.usage = usage;
    const indexAttribute = new THREE.BufferAttribute(indices, 1, false);
    if (this.needsCenterAttribute) {
      const centers = new Float32Array(4 * characterCapacity * 2);
      const centerAttribute = new THREE.BufferAttribute(centers, 2, false);
      centerAttribute.usage = usage;
      this.geometry.setAttribute("center", centerAttribute);
    }
    this.geometry.setAttribute("position", positionAttribute);
    this.geometry.setAttribute("uv", uvAttribute);
    this.geometry.setIndex(indexAttribute);
  }

  fillText(text, x, y, atlas, options) {
    const { lineWidth, fontSize, align, letterSpacing, letterItalic } = options;
    const uvs = this.geometry.attributes.uv.array;
    const positions = this.geometry.attributes.position.array;
    let centers;
    if (this.needsCenterAttribute) centers = this.geometry.attributes.center.array;
    const measuredWidth = MSDFTextMesh.measureText(text, atlas, { fontSize, letterSpacing });
    let cursorX = x;
    let spacing = letterSpacing;
    if (align === "center" && lineWidth) cursorX += (lineWidth - measuredWidth) / 2;
    else if (align === "right" && lineWidth) cursorX += lineWidth - measuredWidth;
    else if (align === "justify" && lineWidth) spacing += (lineWidth - measuredWidth) / (text.length - 1);
    this.textWidth = Math.max(this.textWidth, measuredWidth);
    this.textHeight = Math.max(this.textHeight, -y + fontSize);

    for (let index = 0; index < text.length; index += 1) {
      const character = atlas.chars.get(text.charCodeAt(index));
      if (character) {
        let offset = 8 * this.charCount;
        const { xMin, xMax, yMin, yMax } = character.uv;
        uvs[offset] = xMin;
        uvs[offset + 1] = yMax;
        uvs[offset + 2] = xMax;
        uvs[offset + 3] = yMax;
        uvs[offset + 4] = xMin;
        uvs[offset + 5] = yMin;
        uvs[offset + 6] = xMax;
        uvs[offset + 7] = yMin;
        const centerX = cursorX + character.pos.cX * fontSize;
        const centerY = y + character.pos.cY * fontSize;
        if (this.needsCenterAttribute) {
          centers[offset] = centerX;
          centers[offset + 1] = centerY;
          centers[offset + 2] = centerX;
          centers[offset + 3] = centerY;
          centers[offset + 4] = centerX;
          centers[offset + 5] = centerY;
          centers[offset + 6] = centerX;
          centers[offset + 7] = centerY;
        }
        offset = 12 * this.charCount;
        const right = cursorX + character.pos.xMax * fontSize;
        const left = cursorX + character.pos.xMin * fontSize;
        const bottom = y + character.pos.yMin * fontSize;
        const top = y + character.pos.yMax * fontSize;
        const depth = 0.01 * this.charCount;
        positions[offset] = left + letterItalic;
        positions[offset + 1] = top;
        positions[offset + 2] = depth;
        positions[offset + 3] = right + letterItalic;
        positions[offset + 4] = top;
        positions[offset + 5] = depth;
        positions[offset + 6] = left;
        positions[offset + 7] = bottom;
        positions[offset + 8] = depth;
        positions[offset + 9] = right;
        positions[offset + 10] = bottom;
        positions[offset + 11] = depth;
        if (character.advance) cursorX += character.advance * fontSize + spacing;
        this.charCount += 1;
      } else {
        cursorX += fontSize / 2 + spacing;
      }
    }
  }

  buildText(text, atlas, options) {
    const { fontSize = 32, lineWidth = Number.MAX_VALUE, lineHeight = 1.5, x = 0, y = 0 } = options || {};
    if (text.trim() !== "") {
      if (!this.geometry.indexs) this.initGeometry();
      this.textWidth = 0;
      this.textHeight = 0;
      const sourceLines = text.split(/(?:\r\n|\r|\n)/);
      let lineIndex = 0;
      this.charCount = 0;
      const lineAdvance = lineHeight * fontSize;
      for (let sourceIndex = 0; sourceIndex < sourceLines.length; sourceIndex += 1) {
        let line = sourceLines[sourceIndex];
        let measuredWidth = MSDFTextMesh.measureText(line, atlas, options);
        if (measuredWidth > lineWidth) {
          const chunks = [];
          line.split(WORD_SPLITTER).forEach((chunk) => {
            if (chunk !== "") {
              if (WORD_SPLITTER.test(chunk)) chunks.push(...chunk.split(""));
              else chunks.push(chunk);
            }
          });
          [line] = chunks;
          measuredWidth = MSDFTextMesh.measureText(line, atlas, options);
          for (let index = 1; index < chunks.length; index += 1) {
            const chunkWidth = MSDFTextMesh.measureText(chunks[index], atlas, options);
            if (measuredWidth + chunkWidth >= lineWidth) {
              this.fillText(line, x, y - lineIndex * lineAdvance, atlas, options);
              if (chunks[index] !== " ") {
                line = chunks[index];
                measuredWidth = chunkWidth;
              } else {
                line = "";
                measuredWidth = 0;
              }
              lineIndex += 1;
            } else {
              line += chunks[index];
              measuredWidth += chunkWidth;
            }
          }
        }
        this.fillText(line, x, y - lineIndex * lineAdvance, atlas, options);
        lineIndex += 1;
      }
      if (this.geometry.dynamic) {
        const updateCount = 4 * this.charCount;
        const uvAttribute = this.geometry.attributes.uv;
        uvAttribute.needsUpdate = true;
        uvAttribute.updateRange = { offset: 0, count: updateCount };
        if (this.needsCenterAttribute) {
          const centerAttribute = this.geometry.attributes.center;
          centerAttribute.needsUpdate = true;
          centerAttribute.updateRange = { offset: 0, count: updateCount };
        }
        const positionAttribute = this.geometry.attributes.position;
        positionAttribute.needsUpdate = true;
        positionAttribute.updateRange = { offset: 0, count: updateCount };
        this.geometry.setDrawRange(0, 6 * this.charCount);
      }
      if (this.frustumCulled) this.geometry.computeBoundingSphere();
      this.needsUpdate = false;
    }
  }

  set onAfterRender(callback) {
    this.userDefinedAfterRender = callback;
  }
  get onAfterRender() {
    return this.onAfterRenderCore;
  }
  get shadow() {
    return this.shadowMesh;
  }
  set text(value) {
    if (this.textCore !== value) {
      this.textCore = value;
      this.needsUpdate = true;
    }
  }
  get text() {
    return this.textCore;
  }
  set align(value) {
    if (this.option.align !== value) {
      this.option.align = value;
      this.needsUpdate = true;
    }
  }
  get align() {
    return this.option.align;
  }
  set letterSpacing(value) {
    if (this.option.letterSpacing !== value) {
      this.option.letterSpacing = value;
      this.needsUpdate = true;
    }
  }
  get letterSpacing() {
    return this.option.letterSpacing;
  }
  set letterItalic(value) {
    if (this.option.letterItalic !== value) {
      this.option.letterItalic = value;
      this.needsUpdate = true;
    }
  }
  get letterItalic() {
    return this.option.letterItalic;
  }
  set fontSize(value) {
    if (this.option.fontSize !== value) {
      this.option.fontSize = value;
      this.needsUpdate = true;
    }
  }
  get fontSize() {
    return this.option.fontSize;
  }
  set lineWidth(value) {
    if (this.option.lineWidth !== value) {
      this.option.lineWidth = value;
      this.needsUpdate = true;
    }
  }
  get lineWidth() {
    return this.option.lineWidth;
  }
}

MSDFTextMesh.DEFAULT_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: `varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
}`,
  fragmentShader: `varying vec2 vUv;
uniform sampler2D diffuse;
uniform float fontWeight;
uniform vec3 color;
#ifdef USE_STROKE
uniform vec3 strokeColor;
uniform float strokeWeight;
#endif
uniform float opacity;
float median(vec3 color){ return max(min(color.r, color.g), min(max(color.r, color.g), color.b)); }
const vec2 unitRange = vec2(1./MSDF_SIZE);
float screenPxSize(){ vec2 screenTexSize = 1./fwidth(vUv); return max(0.5*dot(unitRange, screenTexSize), 1.0); }
void main(){
  vec3 msdfColor = texture2D(diffuse, vUv).rgb;
  float textMedian = median(msdfColor);
  float pxSize = screenPxSize();
  float textPercent = clamp((textMedian-.5/fontWeight)*pxSize + .5,0.,1.);
  #ifdef IS_SHADOW
    float shadowPercent = smoothstep(0.0,.6,textMedian)*opacity;
    gl_FragColor = vec4(color, shadowPercent);
  #else
    #ifdef USE_STROKE
      float strokePercent = clamp((textMedian-.5/fontWeight/strokeWeight)*pxSize+.5,0.,1.);
      gl_FragColor = vec4(mix(strokeColor,color,textPercent), strokePercent);
    #else
      gl_FragColor = vec4(color, textPercent);
    #endif
    if(gl_FragColor.a<.1){ discard; }
    gl_FragColor.a *= opacity;
  #endif
}`,
  transparent: true,
  uniforms: {
    opacity: { value: 1 },
    color: { value: new THREE.Color(0) },
    fontWeight: { value: 1 },
    diffuse: { value: null },
  },
  extensions: { derivatives: true },
});
MSDFTextMesh.MAX_TEXT = 1000;
MSDFTextMesh.prototype.isMSDFText = true;

export const MSDFRuntime = { MSDFTextMesh, MSDFAtlas };
export default MSDFRuntime;
