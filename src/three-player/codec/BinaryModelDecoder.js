import * as THREE from "three";
import DATA_TYPE from "./BinaryDataTypes.js";

export class BinaryModelDecoder {
  static parseObject(view, offset) {
    const propertyCount = view.getUint16(offset, true);
    const result = {};
    let length = 2;

    for (let index = 0; index < propertyCount; index += 1) {
      const keyBlock = BinaryModelDecoder.parseBlock(view, offset + length);
      length += keyBlock.length;
      const valueBlock = BinaryModelDecoder.parseBlock(view, offset + length);
      length += valueBlock.length;
      result[keyBlock.data] = valueBlock.data;
    }

    return { length, data: result };
  }

  static parseString(view, offset) {
    const byteLength = view.getUint32(offset, true);
    return {
      data: THREE.LoaderUtils.decodeText(new Uint8Array(view.buffer, offset + 4, byteLength)),
      length: byteLength + 4,
    };
  }

  static parseUint16Array(view, offset) {
    const elementCount = view.getUint32(offset, true);
    const start = offset + 4;
    const end = start + 2 * elementCount;
    return {
      data: new Uint16Array(view.buffer.slice(start, end)),
      length: 2 * elementCount + 4,
    };
  }

  static parseUint32Array(view, offset) {
    const elementCount = view.getUint32(offset, true);
    const start = offset + 4;
    const end = start + 4 * elementCount;
    return {
      data: new Uint32Array(view.buffer.slice(start, end)),
      length: 4 * elementCount + 4,
    };
  }

  static parseFloat32Array(view, offset) {
    const elementCount = view.getUint32(offset, true);
    const start = offset + 4;
    const end = start + 4 * elementCount;
    return {
      data: new Float32Array(view.buffer.slice(start, end)),
      length: 4 * elementCount + 4,
    };
  }

  static parseArray(view, offset) {
    const itemCount = view.getUint16(offset, true);
    const result = [];
    let length = 2;

    for (let index = 0; index < itemCount; index += 1) {
      const itemBlock = BinaryModelDecoder.parseBlock(view, offset + length);
      length += itemBlock.length;
      result.push(itemBlock.data);
    }

    return { length, data: result };
  }

  static parseBlock(view, offset = 0) {
    const type = view.getUint8(offset, true);
    let length = 1;
    let data;

    switch (type) {
      case DATA_TYPE.DATA_TYPE_FALSE:
        data = false;
        break;
      case DATA_TYPE.DATA_TYPE_TRUE:
        data = true;
        break;
      case DATA_TYPE.DATA_TYPE_UINT8:
        data = view.getUint8(offset + 1, true);
        length += 1;
        break;
      case DATA_TYPE.DATA_TYPE_UINT16:
        data = view.getUint16(offset + 1, true);
        length += 2;
        break;
      case DATA_TYPE.DATA_TYPE_UINT32:
        data = view.getUint32(offset + 1, true);
        length += 4;
        break;
      case DATA_TYPE.DATA_TYPE_NUINT8:
        data = -view.getUint8(offset + 1, true);
        length += 1;
        break;
      case DATA_TYPE.DATA_TYPE_NUINT16:
        data = -view.getUint16(offset + 1, true);
        length += 2;
        break;
      case DATA_TYPE.DATA_TYPE_NUINT32:
        data = -view.getUint32(offset + 1, true);
        length += 4;
        break;
      case DATA_TYPE.DATA_TYPE_FLOAT32:
        data = view.getFloat32(offset + 1, true);
        length += 4;
        break;
      case DATA_TYPE.DATA_TYPE_STRING: {
        const block = BinaryModelDecoder.parseString(view, offset + 1);
        data = block.data;
        length += block.length;
        break;
      }
      case DATA_TYPE.DATA_TYPE_UINT16_ARRAY: {
        const block = BinaryModelDecoder.parseUint16Array(view, offset + 1);
        data = block.data;
        length += block.length;
        break;
      }
      case DATA_TYPE.DATA_TYPE_UINT32_ARRAY: {
        const block = BinaryModelDecoder.parseUint32Array(view, offset + 1);
        data = block.data;
        length += block.length;
        break;
      }
      case DATA_TYPE.DATA_TYPE_FLOAT32_ARRAY: {
        const block = BinaryModelDecoder.parseFloat32Array(view, offset + 1);
        data = block.data;
        length += block.length;
        break;
      }
      case DATA_TYPE.DATA_TYPE_OBJECT: {
        const block = BinaryModelDecoder.parseObject(view, offset + 1);
        data = block.data;
        length += block.length;
        break;
      }
      case DATA_TYPE.DATA_TYPE_ARRAY: {
        const block = BinaryModelDecoder.parseArray(view, offset + 1);
        data = block.data;
        length += block.length;
        break;
      }
      default:
        break;
    }

    return { length, type, data };
  }

  static parse(source) {
    return BinaryModelDecoder.parseBlock(new DataView(source)).data;
  }
}

export const BinaryDecoderModule = { Decoder: BinaryModelDecoder };
export { DATA_TYPE };
export default BinaryDecoderModule;
