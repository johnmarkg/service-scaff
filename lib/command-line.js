(function() {


	var commander = require('commander');

	exports = module.exports = function(options, version){


		// get fresh object for unit tests
		var clArgs = new commander.Command()

		if(version){
			clArgs.version(version)			
		}

		if(options){
			options.forEach(function(o){

				if(!o.flag){
					throw new Error('command line option requires flag: ' + JSON.stringify(o))
				}

				var args = [o.flag, o.description || '']
				if(typeof o.coercionFn === 'function'){
					args.push(o.coercionFn)
				}
				if(typeof o.defaultValue !== 'undefined'){
					args.push(o.defaultValue)
				}

				clArgs.option.apply(clArgs, args);

			})
		}

		clArgs.option('-p, --port [int]','port to listen on', parseInt)
		    .option('--color', 'force color log')
		    .parse(process.argv);	

		return clArgs; 		
	}

	

}.call(this));