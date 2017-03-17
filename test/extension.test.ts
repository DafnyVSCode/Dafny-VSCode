//
// note: This example test is leveraging the Mocha test framework.
// please refer to their documentation on https://mochajs.org/ for help.
//

// the module 'assert' provides assertion methods from node
import * as assert from "assert";

// defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", () => {

    // defines a Mocha unit test
    test("Something 1", () => {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });

    // Defines a Mocha unit test
    test("Something 2", () => {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });

    // Defines a Mocha unit test
    test("Something 3", () => {
        assert.equal(true, true);
    });

});

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests 2", () => {

    // Defines a Mocha unit test
    test("Something 4", () => {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });

    // Defines a Mocha unit test
    test("Something 5", () => {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });

    // Defines a Mocha unit test
    test("Something 6", () => {
        assert.equal(true, true);
    });
});
