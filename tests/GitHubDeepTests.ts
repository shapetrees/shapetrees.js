// import M from 'mockserver-node';
import ShapeTreeResponse from '../src/core/ShapeTreeResponse';
import { expect } from 'chai';

const superagent = require("superagent");
const mockServer = require("mockttp").getLocal();

describe("GitHubDeepTests", () => {
    // Start your server
    /*
    beforeEach(() => mockServer.start(8080));
    afterEach(() => mockServer.stop());
 
    it("plantGitRootCreatesStatics", () =>
        // Mock your endpoints
        mockServer.get("/mocked-path").thenReply(200, "A mocked response")
            .then(() => {
                // Make a request
                return superagent.get("http://localhost:8080/mocked-path");
            }).then((response: any) => {
                // Assert on the results
                expect(response.text).to.equal("A mocked response");
            })
    );
    */
    describe('plant test', () => { // the tests container
        it('plants', () => { // the single test
            const str = new ShapeTreeResponse("foo");
            expect(str.name).to.equal("foo");
            // expect(X).to.be.false
            // expect(X).to.be.empty;
            // expect(X).to.be.an("object").to.have.property("p1").to.equal("v1");
        });
    });

});

