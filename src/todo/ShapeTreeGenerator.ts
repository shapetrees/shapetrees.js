import { URL } from 'url';

export enum ShapeTreeGeneratorControl {
  REPORT_CONTAINS = 0x1,
  REPORT_REERENCES = 0x2,
  RECURSE_CONTAINS = 0x4,
  RECURSE_REERENCES = 0x8,
  DEFAULT = 0xE,
}

export interface ShapeTreeGeneratorReference {
  type: string, // @@ 'contains' | 'reference',
  target: URL
}

export interface ShapeTreeGeneratorResult {
  result: ShapeTreeGeneratorReference,
  via: ShapeTreeGeneratorReference[]
}
