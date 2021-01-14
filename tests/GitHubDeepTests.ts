// import M from 'mockserver-node';
import ShapeTreeResponse from '../src/core/ShapeTreeResponse';
import { expect } from 'chai';
import FetchShapeTreeClient from '../src/client/fetch/FetchShapeTreeClient';

const superagent = require("superagent");
require('superagent-proxy')(superagent);
const mockServer = require("mockttp").getLocal();

describe("GitHubDeepTests", () => {
    const shapeTreeClient = new FetchShapeTreeClient();

    // Start your server
    beforeEach(() => mockServer.start(8080));
    afterEach(() => mockServer.stop());
    before(() => console.log(`    * tests run at ${new Date()}`));

    it("lets you mock without specifying a port, allowing parallel testing", async () => {
        await mockServer.get("/mocked-endpoint").thenReply(200, "Tip top testing")
        let response = await superagent.get(mockServer.urlFor("/mocked-endpoint"));
        expect(response.text).to.equal("Tip top testing");
    });

    it("lets you verify the request details the mockttp server receives", async () => {
        const endpointMock = await mockServer.get("/mocked-endpoint").thenReply(200, "hmm?");
        await superagent.get(mockServer.urlFor("/mocked-endpoint"));
        const requests = await endpointMock.getSeenRequests();
        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.equal(`http://localhost:${mockServer.port}/mocked-endpoint`);
    });

    it("lets you proxy requests made to any other hosts", async () => {
        await mockServer.get("http://google.com").thenReply(200, "I can't believe it's not google!");
        let response = await superagent.get("http://google.com").proxy(mockServer.url);
        expect(response.text).to.equal("I can't believe it's not google!");
    });

    describe('plant test', () => { // the tests container
        it('plantGitRootCreatesStatics', () => { // the single test
            // const str = new ShapeTreeResponse("foo");
            // expect(str.name).to.equal("foo");
            // expect(X).to.be.false
            // expect(X).to.be.empty;
            // expect(X).to.be.an("object").to.have.property("p1").to.equal("v1");
        });
    });

});

