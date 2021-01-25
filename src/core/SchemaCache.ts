/**
 * Optional, static cache for pre-compiled ShEx schemas
 */

import { URL } from 'url';
import log from 'loglevel';
import { ShExSchema } from '../todo/ShExSchema';
import { ShapeTreeException } from './exceptions';

// @Slf4j
export class SchemaCache {
  private constructor() {
  }

  public static CACHE_IS_NOT_INITIALIZED = 'Cache is not initialized';
  private static cache: Map<URL, ShExSchema> | null = null;

  public static initializeCache(existingCache: Map<URL, ShExSchema> | null): void {
    SchemaCache.cache = existingCache || new Map();
  }

  public static isInitialized(): boolean {
    const initialized: boolean = SchemaCache.cache !== null;
    log.debug('Cache initialized set to {}', initialized);
    return initialized;
  }

  public static containsSchema(schemaURI: URL): boolean /* throws ShapeTreeException */ {
    log.debug('Determining if cache contains schema {}', schemaURI);
    if (SchemaCache.cache == null) {
      throw new ShapeTreeException(500, SchemaCache.CACHE_IS_NOT_INITIALIZED);
    }
    return SchemaCache.cache.has(schemaURI);
  }

  public static getSchema(schemaURI: URL): ShExSchema | null /* throws ShapeTreeException */ {
    log.debug('Getting schema {}', schemaURI);
    if (SchemaCache.cache == null) {
      throw new ShapeTreeException(500, SchemaCache.CACHE_IS_NOT_INITIALIZED);
    }
    return SchemaCache.cache.get(schemaURI) || null;
  }

  public static putSchema(schemaURI: URL, schema: ShExSchema): void /* throws ShapeTreeException */ {
    log.debug('Caching schema {}', schemaURI.toString());
    if (SchemaCache.cache == null) {
      throw new ShapeTreeException(500, SchemaCache.CACHE_IS_NOT_INITIALIZED);
    }
    SchemaCache.cache.set(schemaURI, schema);
  }

  public static clearCache(): void /* throws ShapeTreeException */ {
    if (SchemaCache.cache == null) {
      throw new ShapeTreeException(500, SchemaCache.CACHE_IS_NOT_INITIALIZED);
    }
    SchemaCache.cache.clear();
  }
}
