// import M from 'mockserver-node';
import { expect } from 'chai';
import { ShapeTreeContext } from '@models/ShapeTreeContext';
import { FetchShapeTreeClient } from '../src/client/fetch/FetchShapeTreeClient';

const superagent = require('superagent');
require('superagent-proxy')(superagent);
const mockServer = require('mockttp').getLocal();

describe('GitHubDeepTests', () => {
  const shapeTreeClient = new FetchShapeTreeClient();
  const data = '/ldp/data/';
  const TEXT_TURTLE = 'text/turtle';
  const context = new ShapeTreeContext();

  // Start your server
  beforeEach(() => mockServer.start(8080));
  afterEach(() => mockServer.stop());
  before(() => console.log(`    * tests run at ${new Date()}`));

  it('lets you proxy requests made to any other hosts', async () => {
    const u1 = 'http://example.com/some/path';
    const b1 = `document at ${u1}`;
    await mockServer.get(u1).thenReply(200, b1);
    let response = await superagent.get(u1).proxy(mockServer.url);
    expect(response.text).to.equal(b1);

    const u2 = '/some/path';
    const b2 = `document at ${u2}`;
    await mockServer.get(u2).thenReply(200, b2);
    response = await superagent.get(mockServer.urlFor(u2)).proxy(mockServer.url);
    expect(response.text).to.equal(b2);
  });

  describe('plant test', () => { // the tests container
    it('plantGitRootCreatesStatics', async () => { // the single test
      const u = mockServer.urlFor(data);
      await mockServer.get(u);
      shapeTreeClient.plantShapeTree(
        context,
        u,
        mockServer.urlFor('/static/shapetrees/github-deep/shapetree#root'),
        null, null, 'Git', null, TEXT_TURTLE,
      );
      // const str = new ShapeTreeResponse('foo');
      // expect(str.name).to.equal('foo');
      // expect(X).to.be.false
      // expect(X).to.be.empty;
      // expect(X).to.be.an('object').to.have.property('p1').to.equal('v1');
    });
  });
});
