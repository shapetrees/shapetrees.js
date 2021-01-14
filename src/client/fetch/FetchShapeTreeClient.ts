import { URL } from 'url';
import ShapeTreeClientConfiguration from './ShapeTreeClientConfiguration';
import ShapeTreeContext from '../../core/models/ShapeTreeContext';
import ShapeTreeLocator from 'src/core/models/ShapeTreeLocator';
import { IOException } from '../../todo/exceptions';
import log from 'loglevel';
import RemoteResource from './RemoteResource';
import { Store } from 'n3';
import GraphHelper from 'src/core/helpers/GraphHelper';
import FetchHttpClient from 'src/todo/FetchHttpClient';
import ShapeTreeHttpClientHolder from './ShapeTreeHttpClientHolder';
import { HttpHeaders, LinkRelations } from 'src/core/enums';

export default class FetchShapeTreeClient /* @@ implements ShapeTreeClient */ {

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
    public discoverShapeTree(context: ShapeTreeContext, targetContainer: URL): ShapeTreeLocator[] /* throws IOException */ {
        log.debug("Discovering Shape Trees present at {}", targetContainer);
        const targetContainerResource: RemoteResource = new RemoteResource(targetContainer, context.getAuthorizationHeaderValue());
        const targetContainerMetadataResource: RemoteResource = targetContainerResource.getMetadataResource(context.getAuthorizationHeaderValue());
        return ShapeTreeLocator.getShapeTreeLocatorsFromGraph(targetContainerMetadataResource.getGraph(targetContainerResource.getUri()));
    }

    // @Override
    public plantShapeTree(context: ShapeTreeContext, parentContainer: URL, shapeTreeURIs: URL[], focusNode: string, shapeTreeHint: URL, proposedResourceName: string, bodyGraph: Store): URL;
    public plantShapeTree(context: ShapeTreeContext, parentContainer: URL, shapeTreeURIs: URL[], focusNode: string, shapeTreeHint: URL, proposedResourceName: string, bodyString: string, contentType: string): URL;
    public plantShapeTree(context: ShapeTreeContext, parentContainer: URL, shapeTreeURIs: URL[], focusNode: string, shapeTreeHint: URL, proposedResourceName: string, bodyString: string | Store, contentType?: string): URL /* throws IOException, URISyntaxException */ {
        if (bodyString instanceof Store) {
            let shapeTreeCommaDelimited: string = "";
            if (shapeTreeURIs != null) {
                for (let shapeTreeURI of shapeTreeURIs) {
                    shapeTreeCommaDelimited += "," + shapeTreeURI;
                }
            }

            log.debug("Planting shape tree [Parent container={}], [Shape Trees={}], [FocusNode={}], [ShapeTreeHint={}], [ProposedResourceName={}]", parentContainer, shapeTreeCommaDelimited, focusNode, shapeTreeHint, proposedResourceName);
            bodyString = <string>GraphHelper.writeGraphToTurtleString(bodyString);
            contentType = "text/turtle";
        }


        const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(this.getConfiguration(this._skipValidation));

        let bytes: number[];
        if (bodyString != null)
            bytes = bodyString.getBytes();
        else
            bytes = new Array();

        const builder: Request.Builder = new Request.Builder()
            .url(parentContainer.toString());

        for (let shapeTreeUri of shapeTreeURIs) {
            builder.addHeader(HttpHeaders.LINK, "<" + shapeTreeUri.toString() + ">; rel=\"" + LinkRelations.SHAPETREE + "\"");
        }

        applyCommonHeaders(context, builder, focusNode, shapeTreeHint, true, proposedResourceName, contentType);

        plantPost: Request = builder
            .post(RequestBody.create(bytes))
            .build();

        response: Response = client.newCall(plantPost).execute();
        if (response.isSuccessful()) {
            const locationHeader: string = response.header(HttpHeaders.LOCATION);
            if (locationHeader != null) {
                return new URL(locationHeader);
            } else {
                throw new IOException(response.code() + " No Location Header provided");
            }
        } else {
            responseBodyString: string = null;
            try {
                const body: ResponseBody = response.body();
                if (body != null) {
                    responseBodyString = body.string();
                }
            } finally {
                throw new IOException(response.code() + " " + responseBodyString);
            }
        }
    }

    // @Override
    public createDataInstance(context: ShapeTreeContext, parentContainer: URL, focusNode: string, shapeTreeHint: URL, proposedResourceName: string, isContainer: Boolean, bodyString: string, contentType: string): ShapeTreeResponse /* throws IOException */ {
        log.debug("Creating data instance {} in {} with hint {}", parentContainer, proposedResourceName, shapeTreeHint);
        const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(getConfiguration(this._skipValidation));

        let bytes: number[];
        if (bodyString != null)
            bytes = bodyString.getBytes();
        else
            bytes = new Array();

        resourceURI: string = parentContainer.toString();
        if (!resourceURI.endsWith("/")) {
            resourceURI += "/";
        }
        resourceURI += proposedResourceName;
        log.debug("Build Resource URL {}", resourceURI);

        const putBuilder: Request.Builder = new Request.Builder()
            .url(resourceURI)
            .put(RequestBody.create(bytes));

        // proposed resource is name is nulled since a Slug will not be used
        applyCommonHeaders(context, putBuilder, focusNode, shapeTreeHint, isContainer, null, contentType);

        return FetchHelper.mapFetchResponseToShapeTreeResponse(client.newCall(putBuilder.build()).execute());
    }

    // @Override
    public updateDataInstance(context: ShapeTreeContext, resourceURI: URL, focusNode: string, shapeTreeHint: URL, bodyString: string, contentType: string): ShapeTreeResponse /* throws IOException */ {
        const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(getConfiguration(this._skipValidation));

        let bytes: number[];
        if (bodyString != null)
            bytes = bodyString.getBytes();
        else
            bytes = new Array();

        const putBuilder: Request.Builder = new Request.Builder()
            .url(resourceURI.toString())
            .put(RequestBody.create(bytes));

        applyCommonHeaders(context, putBuilder, focusNode, shapeTreeHint, null, null, contentType);

        return FetchHelper.mapFetchResponseToShapeTreeResponse(client.newCall(putBuilder.build()).execute());
    }

    // @Override
    public updateDataInstanceWithPatch(context: ShapeTreeContext, resourceURI: URL, focusNode: string, shapeTreeHint: URL, bodyString: string): ShapeTreeResponse /* throws IOException */ {
        const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(getConfiguration(this._skipValidation));
        const contentType: string = "application/sparql-update";
        const sparqlUpdateBytes: number[] = bodyString.getBytes();

        const patchBuilder: Request.Builder = new Request.Builder()
            .url(resourceURI.toString())
            .patch(RequestBody.create(sparqlUpdateBytes));

        applyCommonHeaders(context, patchBuilder, focusNode, shapeTreeHint, null, null, contentType);

        return FetchHelper.mapFetchResponseToShapeTreeResponse(client.newCall(patchBuilder.build()).execute());
    }

    // @Override
    public deleteDataInstance(context: ShapeTreeContext, resourceURI: URL, shapeTreeURI: URL): ShapeTreeResponse /* throws IOException */ {
        const client: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(getConfiguration(this._skipValidation));

        const deleteBuilder: Request.Builder = new Request.Builder()
            .url(resourceURI.toString())
            .delete();

        applyCommonHeaders(context, deleteBuilder, null, shapeTreeURI, null, null, null);

        return FetchHelper.mapFetchResponseToShapeTreeResponse(client.newCall(deleteBuilder.build()).execute());
    }

    // @Override
    public unplantShapeTree(context: ShapeTreeContext, containerURI: URL, shapeTreeURI: URL): void {

    }

    private getConfiguration(_skipValidation: boolean): ShapeTreeClientConfiguration {
        if (this._skipValidation) {
            return this.nonValidatingClientConfig;
        } else {
            return this.validatingClientConfig;
        }
    }

    private applyCommonHeaders(context: ShapeTreeContext, builder: Request.Builder, focusNode: string, shapeTreeHint: URL, isContainer: Boolean, proposedResourceName: string, contentType: string): void {

        if (context.getAuthorizationHeaderValue() != null) {
            builder.addHeader(HttpHeaders.AUTHORIZATION, context.getAuthorizationHeaderValue());
        }

        if (isContainer != null) {
            const resourceTypeUri: string = isContainer ? "http://www.w3.org/ns/ldp#Container" : "http://www.w3.org/ns/ldp#Resource";
            builder.addHeader(HttpHeaders.LINK, "<" + resourceTypeUri + ">; rel=\"type\"");
        }

        if (focusNode != null) {
            builder.addHeader(HttpHeaders.LINK, "<" + focusNode + ">; rel=\"" + LinkRelations.FOCUS_NODE + "\"");
        }

        if (shapeTreeHint != null) {
            builder.addHeader(HttpHeaders.LINK, "<" + shapeTreeHint + ">; rel=\"" + LinkRelations.TARGET_SHAPETREE + "\"");
        }

        if (proposedResourceName != null) {
            builder.addHeader(HttpHeaders.SLUG, proposedResourceName);
        }

        if (contentType != null) {
            builder.addHeader(HttpHeaders.CONTENT_TYPE, contentType);
        }
    }
}
