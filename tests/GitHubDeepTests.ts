import ShapeTreeResponse from '../src/core/ShapeTreeResponse';
import { expect } from 'chai';

describe('Options tests', () => { // the tests container
    it('checking default options', () => { // the single test
        const str = new ShapeTreeResponse("foo");
        expect(str.name).to.equal("foo");
        // expect(X).to.be.false
        // expect(X).to.be.empty;
        // expect(X).to.be.an("object").to.have.property("p1").to.equal("v1");
    });
});
