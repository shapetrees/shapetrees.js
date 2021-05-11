// import M from 'mockserver-node';
import { expect } from 'chai';
import { ShapeTreeContext } from '@models/ShapeTreeContext';
import { FetchShapeTreeClient } from '../src/client/fetch/FetchShapeTreeClient';
import fetch from 'node-fetch';
import { URL } from 'url';
import { HttpHeaders } from '@core/enums';
import MockRuleBuilder from 'mockttp/dist/rules/mock-rule-builder';
// import {
//   Method,
// } from "mockttp/src/types";
import { load as parseYaml } from 'js-yaml';
import { readFileSync } from 'fs';
import * as Path from 'path';

export enum Method { // @@ fix import { Method } above and delete this enum
  GET,
  POST,
  PUT,
  DELETE,
  PATCH,
  HEAD,
  OPTIONS
}

type MapObject = { [key: string]: string };

interface Fixture {
  statusCode: number,
  delay: number,
  headers: string[],
  body: string
}

class DispatcherEntry {
  constructor(
    public fixtureNames: string[],
    public expectedMethod: Method,
    public expectedPath: string,
    public expectedHeaders: Map<string, string[]> | null,
  ) { }
}


const mockServer = require('mockttp').getLocal({ debug: false });

describe('GitHubDeepTests', () => {
  const shapeTreeClient = new FetchShapeTreeClient();
  const data = '/ldp/data/';
  const TEXT_TURTLE = 'text/turtle';
  const context = new ShapeTreeContext(); // can set client authorization here

  // Start your server
  beforeEach(() => mockServer.start(8080));
  afterEach(() => mockServer.stop());
  before(() => console.log(`    * tests run at ${new Date()}`));

  it('test test infrastructure', async () => {
    const b2 = `document at ${data}`;
    await mockServer.get(data).thenReply(200, b2, {
      'Content-type': 'text/plain',
      'Cookie-set': [ // test repeated cookies per https://tools.ietf.org/html/rfc7230#section-3.2.2
        'language=pl; expires=Sat, 15-Jul-2017 23:58:22 GMT; path=/; domain=x.com',
        'id=123 expires=Sat, 15-Jul-2017 23:58:22 GMT; path=/; domain=x.com; httponly'
      ]
    });
    const resp = await fetch(mockServer.urlFor(data));
    expect(await resp.text()).to.equal(b2);
  });

  describe('plant test', () => { // the tests container
    it('plantGitRootCreatesStatics', async () => { // the single test
      const u = new URL(mockServer.urlFor(data));
      await prepareServer(mockServer, PlantDispatchEntries);
      const newUrl: URL = await shapeTreeClient.plantShapeTree(
        context,
        u,
        [mockServer.urlFor('/static/shapetrees/github-deep/shapetree#root')],
        null, null, 'Git', null, TEXT_TURTLE,
      );
      expect(newUrl.href).to.equal(mockServer.urlFor('/ldp/data/Git/'));
      // reminders: .to.equal('foo'), .to.be.false, .to.be.empty, .to.be.an('object').to.have.property('p1').to.equal('v1');
    });
  });
});

const PlantDispatchEntries: DispatcherEntry[] = [
  new DispatcherEntry(['fixtures/shapetrees/github-deep-shapetree-ttl'], Method.GET, '/static/shapetrees/github-deep/shapetree', null),
  new DispatcherEntry(['fixtures/schemas/github-shex'], Method.GET, '/static/shex/github/shex', null),
  new DispatcherEntry(['fixtures/githubDeep/data-container'], Method.GET, '/ldp/data/', null),
  new DispatcherEntry(['fixtures/errors/404'], Method.GET, '/ldp/data/?ext=shapetree', null),
  new DispatcherEntry(['fixtures/errors/404'], Method.GET, '/ldp/data/Git', null),
  new DispatcherEntry(['fixtures/githubDeep/git-container'], Method.GET, '/ldp/data/Git/', null),
  new DispatcherEntry(['fixtures/errors/404', 'githubDeep/git-container-metadata'], Method.GET, '/ldp/data/Git/?ext=shapetree', null),
  new DispatcherEntry(['fixtures/githubDeep/create-git-container-response'], Method.POST, '/ldp/data/', new Map([[HttpHeaders.SLUG, ['Git']]])),
  new DispatcherEntry(['fixtures/githubDeep/git-metadata-update-response'], Method.PUT, '/ldp/data/Git/?ext=shapetree', null),

  new DispatcherEntry(['fixtures/errors/404'], Method.GET, '/ldp/data/Git/users', null),
  new DispatcherEntry(['fixtures/githubDeep/create-git_users-container-response'], Method.POST, '/ldp/data/Git/', new Map([[HttpHeaders.SLUG, ['users']]])),
  new DispatcherEntry(['fixtures/githubDeep/git-users-container'], Method.GET, '/ldp/data/Git/users/', null),
  new DispatcherEntry(['fixtures/githubDeep/git-users-metadata-update-response'], Method.PUT, '/ldp/data/Git/users/?ext=shapetree', null),
  new DispatcherEntry(['fixtures/errors/404', 'githubDeep/git-users-container-metadata'], Method.GET, '/ldp/data/Git/users/?ext=shapetree', null),

  new DispatcherEntry(['fixtures/errors/404'], Method.GET, '/ldp/data/Git/repos', null),
  new DispatcherEntry(['fixtures/githubDeep/create-git_repos-container-response'], Method.POST, '/ldp/data/Git/', new Map([[HttpHeaders.SLUG, ['repos']]])),
  new DispatcherEntry(['fixtures/githubDeep/git-repos-container'], Method.GET, '/ldp/data/Git/repos/', null),
  new DispatcherEntry(['fixtures/githubDeep/git-repos-metadata-update-response'], Method.PUT, '/ldp/data/Git/repos/?ext=shapetree', null),
  new DispatcherEntry(['fixtures/errors/404', 'githubDeep/git-repos-container-metadata'], Method.GET, '/ldp/data/Git/repos/?ext=shapetree', null),

  new DispatcherEntry(['fixtures/githubDeep/git-repos-jd-create-response'], Method.PUT, '/ldp/data/Git/repos/janeirodigtal/', null),
  new DispatcherEntry(['fixtures/errors/404'], Method.GET, '/ldp/data/Git/repos/janeirodigital', null),
  new DispatcherEntry(['fixtures/githubDeep/create-git_repos_jd-container-response'], Method.POST, '/ldp/data/Git/repos/', new Map([[HttpHeaders.SLUG, ['janeirodigital']]])),
  new DispatcherEntry(['fixtures/githubDeep/git-repos-jd-container'], Method.GET, '/ldp/data/Git/repos/janeirodigital/', null),
  new DispatcherEntry(['fixtures/githubDeep/git-repos-jd-metadata-update-response'], Method.PUT, '/ldp/data/Git/repos/janeirodigital/?ext=shapetree', null),
  new DispatcherEntry(['fixtures/errors/404', 'githubDeep/git-repos-janeirodigital-container-metadata'], Method.GET, '/ldp/data/Git/repos/janeirodigital/?ext=shapetree', null)

]

function prepareServer(mockServer: any, dispatchers: DispatcherEntry[]): Promise<any> {
  return Promise.all(dispatchers.map(
    (d) => {
      // new Promise((resolve, reject) => {
      //   try {
      //     resolve(yaml.safeLoad(string, options))
      //   } catch (err) {
      //     reject(err)
      //   }
      // })
      const baseUrl = mockServer.urlFor('/').slice(0, -1);
      let fixtureText = readFileSync(Path.join(__dirname, d.fixtureNames[0] + '.yaml'), 'utf8');
      fixtureText = fixtureText.replace(/\$\{SERVER_BASE\}/g, baseUrl);
      const fixture = <Fixture>parseYaml(fixtureText);
      // fixture.body = fixture.body.replace(/\$\{SERVER_BASE\}/g, baseUrl);
      const u = new URL(mockServer.urlFor(d.expectedPath));
      const query = u.search;
      u.search = '';
      const rule: MockRuleBuilder = new MockRuleBuilder(d.expectedMethod, u.href, mockServer.addRule)
      if (query !== '')
        rule.withQuery(query.substr(1).split(/[&;]/).reduce((acc: MapObject, pair) => {
          const [attr, value] = pair.split(/=/).map(decodeURIComponent);
          acc[attr] = value;
          return acc;
        }, {}));
      const headers: MapObject = {};
      if (d.expectedHeaders)
        for (const e of d.expectedHeaders.entries())
          headers[e[0]] = e[1]/*.map(v => v.replace(/\$\{SERVER_BASE\}/g, baseUrl))*/.join(',');
      return rule.thenReply(fixture.statusCode, fixture.body, fixture.headers.reduce((acc: MapObject, h) => {
        const idx = h.indexOf(':');
        acc[h.substr(0, idx)] = h.substr(idx + 1);
        return acc;
      }, {}));
    }
  ));
}
