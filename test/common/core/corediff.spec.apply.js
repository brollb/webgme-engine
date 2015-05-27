/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('corediff apply', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        projectName = 'coreDiffApply',
        project,
        core,
        rootNode,
        commit,
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('corediff.spec.apply'),
        storage,
        getJsonProject = testFixture.loadJsonFile,
        jsonProject,

        gmeAuth,

        guestAccount = gmeConfig.authentication.guestAccount;

    before(function (done) {
        var clearDB = testFixture.clearDatabase(gmeConfig),
            gmeAuthPromise;

        gmeAuthPromise = testFixture.getGMEAuth(gmeConfig)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
            });


        Q.all([clearDB, gmeAuthPromise])
            .then(function () {
                return Q.all([
                    gmeAuth.addUser(guestAccount, guestAccount + '@example.com', guestAccount, true, {overwrite: true}),
                    gmeAuth.addUser('admin', 'admin@example.com', 'admin', true, {overwrite: true, siteAdmin: true})
                ]);
            })
            .then(function () {
                return Q.all([
                    gmeAuth.authorizeByUserId(guestAccount, projectName, 'create', {
                        read: true,
                        write: true,
                        delete: true
                    })
                ]);
            })
            .then(function () {
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                jsonProject = getJsonProject('./test/common/core/corediff/base001.json');
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectName: projectName});
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: 'test/common/core/core/intraPersist.json',
                    projectName: projectName,
                    branchName: 'base',
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            .then(function (result) {
                project = result.project;
                core = result.core;
                rootNode = result.rootNode;
                commit = result.commitHash;
            })
            .then(done)
            .catch(done);
    });

    after(function (done) {
        storage.deleteProject({projectName: projectName})
            .then(function () {

                return Q.all([
                    storage.closeDatabase(),
                    gmeAuth.unload()
                ]);
            })
            .then(done)
            .catch(done);
    });

    describe('apply', function () {
        it('modifies several attributes', function (done) {
            core.applyTreeDiff(rootNode, {attr: {name: 'ROOTy'}, 1: {attr: {name: 'FCOy'}}}, function (err) {
                if (err) {
                    return done(err);
                }
                expect(core.getAttribute(rootNode, 'name')).to.equal('ROOTy');
                core.loadByPath(rootNode, '/1', function (err, fco) {
                    if (err) {
                        return done(err);
                    }
                    expect(core.getAttribute(fco, 'name')).to.equal('FCOy');
                    done();
                });
            });
        });
    });
});
