[![Build Status](https://travis-ci.org/johnmarkg/express-middleware-bundle.svg?branch=master)](https://travis-ci.org/johnmarkg/express-middleware-bundle)
[![Coverage Status](https://coveralls.io/repos/johnmarkg/express-middleware-bundle/badge.svg?branch=master)](https://coveralls.io/r/<account>/<repository>?branch=master)

Express bundled with Passport authentication, Redis sessions, morgan logs



## Usage



```

var resources = {
	redis: redisConfigOrClient,
	mysql: mysqlConfigOrClient,
	mongo: mongoConfigOrClient,
	sphinxql: sphinxqlConfigOrClient,
	rabbit: rabbitConfigOrClient
}

var server = require('service-scaff');
server
	.resources(config)
	.web()
	.register('my-service', '/', ['my-service-alias'])
	.startOnResourcesConnected()





// OLD

var server = require('express-middleware-bundle');

//------------------------------------
// set redis config for sessions, remember me authentication strategy
//------------------------------------
server.redis({
	//redis config
})

//------------------------------------
// set mysql config for local and api authentication stategies
//------------------------------------
server.mysql({
	// mysql config
})

//------------------------------------
// add auth (remember me, apikey, local) and session middleware
//------------------------------------
server.web()

//------------------------------------
// mount static assest to path
//------------------------------------
server.addStaticDir('./css', 'static');
server.addStaticDir('./js', 'static');

//------------------------------------
// mount static assest to root
//------------------------------------
server.addStaticDir('./root');

//------------------------------------
// use jade templates from a dir
//------------------------------------
server.addJade('./jade');

//------------------------------------
// use built in login and logout handlers
//------------------------------------
server.post('/login', server.login.bind(server));
server.get('/logout', server.logout.bind(server));

//------------------------------------
// add routes that dont need authentication
//------------------------------------
server.get(
	'/nonauth-route',
	function(req,res,next){
		res.end('you are NOT authenticated')
	}
);

//------------------------------------
// every route after this requires authentication
//------------------------------------
server.use(server.authenticated.bind(server));

server.get(
	'/auth-route',
	function(req,res,next){
		res.end('you are authenticated')
	}
)

//------------------------------------
// check user roles
//------------------------------------
server.get(
	'/needARole',
	server.checkRoles.bind(server,['roleA','roleB'])
	function(req,res,next){
		res.end('you have either roleA or roleB')
	}
)

//------------------------------------
// check user roles for conditional middleware
//------------------------------------
server.get(
	'/needARoleForSomeMiddleware',
	getSomeData,
	server.checkRolesWrapper.bind(server,['roleA'], conditionalMiddlewareToModifyData),
	returnData
)


server.start(port, function(){
	// server has started
})

```


Make a fresh server object:
```
var server2 = server.ExpressMiddlewareBundle();
```
