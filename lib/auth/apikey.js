(function () {
    'use strict';

    var debug = require('debug')('service-scaff:auth:apikey');
    var LocalAPIKeyStrategy = require('passport-localapikey').Strategy;

    exports.apiAuth = function (req, key, done) {
        debug('apiAuth')
        if (!this.mysql || !this.mysql()) {
            return done(new Error('mysql required for api auth'))
        }

        var q = [
            "select u.id",
            "from api_keys k",
            "join users u on (k.user_id = u.id)",
            "where apikey = ?"
        ].join(' ')

        this.mysql().query(q, [key], function (err, results) {
            if (err) {
                // return done(null, false, {
                //     message: 'ERROR Authenticating'
                // });
                return done(err)
            } else if (!results || results.length === 0) {
                return done(null, false, {
                    message: 'Unknown user'
                });
            } else if (
                results &&
                results[0] &&
                results[0].active === 0) {

                return done(null, false, {
                    message: 'Account is not active'
                });
            }

            done(null, {
                id: results[0].id
            });
        });
    }

    exports.authenticationApikey = function () {
        debug('authenticationApikey');

        var t = this;

        if (this.authStrategies.api) {
            debug('already added ')
            return this;
        }
        this.authStrategies.api = true;

        this.initPassport();

        this.passport.use(new LocalAPIKeyStrategy({
            passReqToCallback: true
        }, function(req, key, done){
            // debug('call apiAuth')
            t.apiAuth(req, key, done)
        }));
        // this.passport.use(new LocalAPIKeyStrategy({
        //     passReqToCallback: true
        // }, t.apiAuth.bind(this)));


        return this;

    }

})()
