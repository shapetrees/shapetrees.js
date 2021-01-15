import { URL } from 'url';
import log from 'loglevel';
import { Store } from 'n3';
import { ShapeTreeContext } from '@models/ShapeTreeContext';
import { ShapeTreeLocator } from '@models/ShapeTreeLocator';
import { IOException } from '@todo/exceptions';
import { GraphHelper } from '@helpers/GraphHelper';
import {
  FetchHttpClient, Request, RequestBody, RequestBuilder, Response, ResponseBody,
} from '@todo/FetchHttpClient';
import { HttpHeaders, LinkRelations } from '@core/enums';
import { ShapeTreeResponse } from '@core/ShapeTreeResponse';
import { RemoteResource } from './RemoteResource';
import { ShapeTreeClientConfiguration } from './ShapeTreeClientConfiguration';
import { ShapeTreeHttpClientHolder } from './ShapeTreeHttpClientHolder';
import { FetchHelper } from './FetchHelper';

export class FetchShapeTreeClient /* @@ implements ShapeTreeClient */ {
  private _skipValidation: boolean = false;
  private validatingClientConfig: ShapeTreeClientConfiguration;
  private nonValidatingClientConfig: ShapeTreeClientConfiguration;

  public constructor() {
    this.validatingClientConfig = new ShapeTreeClientConfiguration(true, false);
    this.nonValidatingClientConfig = new ShapeTreeClientConfiguration(false, false);
  }

  // @Override
  public isValidationSkipped(): boolean {
    return this._skipValidation;
  }

  // @Override
  public skipValidation(_skipValidation: boolean): void {
    this._skipValidation = _skipValidation;
  }

  // @Override
  // eslint-disable-next-line class-methods-use-this
  public discoverShapeTree(context: ShapeTreeContext, targetContainer: URL): ShapeTreeLocator[] /* throws IOException */ {
    log.debug('Discovering Shape Trees present at {}', targetContainer);
    const targetContainerResource: RemoteResource = new RemoteResource(targetContainer, context.getAuthorizationHeaderValue());
    const targetContainerMetadataResource: RemoteResource = targetContainerResource.getMetadataResource(context.getAuthorizationHeaderValue());
    // could getGraph() return null here (targetContainerMetadataResource.exists == mull)?
    return ShapeTreeLocator.getShapeTreeLocatorsFromGraph(targetContainerMetadataResource.getGraph(targetContainerResource.getUri())!!);
  }

  // @Eric In typescript if there are declaration of the name in a class member the las
  // declaration overwrites other declarations silently, causing unexpected behaviours

  // @Override
  // public plantShapeTree(
  //   context: ShapeTreeContext,
  //   parentContainer: URL,
  //   shapeTreeURIs: URL[],
  //   focusNode: string | null,
  //   shapeTreeHint: URL | null,
  //   proposedResourceName: string,
  //   bodyGraph: Store
  // ): URL;
  // public plantShapeTree(context: ShapeTreeContext, parentContainer: URL,
  // shapeTreeURIs: URL[], focusNode: string | null, shapeTreeHint: URL | null, proposedResourceName: string,
  // bodyString: string | null, contentType: string): URL;

  // eslint-disable-next-line consistent-return
  public plantShapeTree(
    context: ShapeTreeContext,
    parentContainer: URL,
    shapeTreeURIs: URL[],
    focusNode: string | null,
    shapeTreeHint: URL | null,
    proposedResourceName: string,
    bodyString: Store | string | null,
    contentType?: string,
    // @ts-ignore
  ): URL /* throws IOException, URISyntaxException */ {
    if (bodyString instanceof Store) {
      let shapeTreeCommaDelimited: string = '';
      if (shapeTreeURIs != null) {
        for (const shapeTreeURI of shapeTreeURIs) {
          shapeTreeCommaDelimited += `,${shapeTreeURI}`;
        }
      }

      log.debug('Planting shape tree [Parent container={}], [Shape Trees={}], [FocusNode={}], [ShapeTreeHint={}], [ProposedResourceName={}]', parentContainer, shapeTreeCommaDelimited, focusNode, shapeTreeHint, proposedResourceName);
      // eslint-disable-next-line no-param-reassign
      bodyString = <string>GraphHelper.writeGraphToTurtleString(bodyString);
      // eslint-disable-next-line no-param-reassign
      contentType = 'text/turtle';
    }

    const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(this.getConfiguration(this._skipValidation));

    const builder: RequestBuilder /* Request.Builder */ = new Request.Builder()
      .url(parentContainer.toString());

    for (const shapeTreeUri of shapeTreeURIs) {
      builder.addHeader(HttpHeaders.LINK, `<${shapeTreeUri.toString()}>; rel="${LinkRelations.SHAPETREE}"`);
    }

    this.applyCommonHeaders(context, builder, focusNode, shapeTreeHint, true, proposedResourceName, contentType || 'text/turtle');

    const plantPost: Request = builder
      .post(RequestBody.create(bodyString))
      .build();

    const response: Response = client.newCall(plantPost).execute();
    if (response.isSuccessful()) {
      const locationHeader: string | null = response.header(HttpHeaders.LOCATION);
      if (locationHeader !== null) {
        return new URL(locationHeader);
      }
      throw new IOException(`${response.code()} No Location Header provided`);
    } else {
      let responseBodyString: string | null = null;
      try {
        const body: ResponseBody | null = response.body();
        if (body != null) {
          responseBodyString = body.string();
        }
      } catch {
        throw new IOException(`${response.code()} ${responseBodyString}`);
      }
    }
  }

  // @Override
  public createDataInstance(
    context: ShapeTreeContext,
    parentContainer: URL,
    focusNode: string,
    shapeTreeHint: URL,
    proposedResourceName: string,
    isContainer: boolean,
    bodyString: string,
    contentType: string,
  ): ShapeTreeResponse /* throws IOException */ {
    log.debug('Creating data instance {} in {} with hint {}', parentContainer, proposedResourceName, shapeTreeHint);
    const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(this.getConfiguration(this._skipValidation));

    let resourceURI: string = parentContainer.toString();
    if (!resourceURI.endsWith('/')) {
      resourceURI += '/';
    }
    resourceURI += proposedResourceName;
    log.debug('Build Resource URL {}', resourceURI);

    const putBuilder: RequestBuilder /* Request.Builder */ = new Request.Builder()
      .url(resourceURI)
      .put(RequestBody.create(bodyString));

    // proposed resource is name is nulled since a Slug will not be used
    this.applyCommonHeaders(context, putBuilder, focusNode, shapeTreeHint, isContainer, null, contentType);

    return FetchHelper.mapFetchResponseToShapeTreeResponse(client.newCall(putBuilder.build()).execute());
  }

  // @Override
  public updateDataInstance(
    context: ShapeTreeContext,
    resourceURI: URL,
    focusNode: string,
    shapeTreeHint: URL,
    bodyString: string,
    contentType: string,
  ): ShapeTreeResponse /* throws IOException */ {
    const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(this.getConfiguration(this._skipValidation));

    const putBuilder: RequestBuilder /* Request.Builder */ = new Request.Builder()
      .url(resourceURI.toString())
      .put(RequestBody.create(bodyString));

    this.applyCommonHeaders(context, putBuilder, focusNode, shapeTreeHint, null, null, contentType);

    return FetchHelper.mapFetchResponseToShapeTreeResponse(client.newCall(putBuilder.build()).execute());
  }

  // @Override
  public updateDataInstanceWithPatch(
    context: ShapeTreeContext,
    resourceURI: URL,
    focusNode: string,
    shapeTreeHint: URL,
    bodyString: string,
  ): ShapeTreeResponse /* throws IOException */ {
    const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(this.getConfiguration(this._skipValidation));
    const contentType: string = 'application/sparql-update';

    const patchBuilder: RequestBuilder /* Request.Builder */ = new Request.Builder()
      .url(resourceURI.toString())
      .patch(RequestBody.create(bodyString));

    this.applyCommonHeaders(context, patchBuilder, focusNode, shapeTreeHint, null, null, contentType);

    return FetchHelper.mapFetchResponseToShapeTreeResponse(client.newCall(patchBuilder.build()).execute());
  }

  // @Override
  public deleteDataInstance(context: ShapeTreeContext, resourceURI: URL, shapeTreeURI: URL): ShapeTreeResponse /* throws IOException */ {
    const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(this.getConfiguration(this._skipValidation));

    const deleteBuilder: RequestBuilder /* Request.Builder */ = new Request.Builder()
      .url(resourceURI.toString())
      .delete();

    this.applyCommonHeaders(context, deleteBuilder, null, shapeTreeURI, null, null, null);

    return FetchHelper.mapFetchResponseToShapeTreeResponse(client.newCall(deleteBuilder.build()).execute());
  }

  // @Override
  // eslint-disable-next-line class-methods-use-this
  public unplantShapeTree(context: ShapeTreeContext, containerURI: URL, shapeTreeURI: URL): void {

  }

  private getConfiguration(_skipValidation: boolean): ShapeTreeClientConfiguration {
    if (this._skipValidation) {
      return this.nonValidatingClientConfig;
    }
    return this.validatingClientConfig;
  }

  // eslint-disable-next-line class-methods-use-this
  private applyCommonHeaders(
    context: ShapeTreeContext,
    builder: RequestBuilder,
    focusNode: string | null,
    shapeTreeHint: URL | null,
    isContainer: boolean | null,
    proposedResourceName: string | null,
    contentType: string | null,
  ): void {
    if (context.getAuthorizationHeaderValue() !== null) {
      builder.addHeader(HttpHeaders.AUTHORIZATION, context.getAuthorizationHeaderValue());
    }

    if (isContainer !== null) {
      const resourceTypeUri: string = isContainer ? 'http://www.w3.org/ns/ldp#Container' : 'http://www.w3.org/ns/ldp#Resource';
      builder.addHeader(HttpHeaders.LINK, `<${resourceTypeUri}>; rel="type"`);
    }

    if (focusNode !== null) {
      builder.addHeader(HttpHeaders.LINK, `<${focusNode}>; rel="${LinkRelations.FOCUS_NODE}"`);
    }

    if (shapeTreeHint !== null) {
      builder.addHeader(HttpHeaders.LINK, `<${shapeTreeHint}>; rel="${LinkRelations.TARGET_SHAPETREE}"`);
    }

    if (proposedResourceName !== null) {
      builder.addHeader(HttpHeaders.SLUG, proposedResourceName);
    }

    if (contentType !== null) {
      builder.addHeader(HttpHeaders.CONTENT_TYPE, contentType);
    }
  }
}
