/*globals require, describe, it, afterEach, WebGMEGlobal, WebGME*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

require('../../_globals.js');

var agent = require('superagent').agent(),
    should = require('chai').should(),
    server,
    serverBaseUrl;

describe('Executor', function () {
    'use strict';

    afterEach(function (done) {
        server.stop(done);
    });

    it('should return 200 at rest/executor/worker/ with enableExecutor=true', function (done) {
        var config = WebGMEGlobal.getConfig();
        config.port = 9001;
        config.enableExecutor = true;

        serverBaseUrl = 'http://127.0.0.1:' + config.port;

        server = WebGME.standaloneServer(config);
        server.start(function () {
            agent.get(serverBaseUrl + '/rest/executor/worker/').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                done();
            });
        });
    });

    it('should return 404 at rest/executor/worker/ with enableExecutor=false', function (done) {
        var config = WebGMEGlobal.getConfig();
        config.port = 9001;
        config.enableExecutor = false;

        serverBaseUrl = 'http://127.0.0.1:' + config.port;

        server = WebGME.standaloneServer(config);
        server.start(function () {
            agent.get(serverBaseUrl + '/rest/executor/worker/').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 404);
                done();
            });
        });
    });
});