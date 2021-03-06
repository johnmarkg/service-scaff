(function() {

	var assert = require('assert');
	var server = require('../index')(['command-line']);


	describe('args', function(){
		it('default', function(){
			process.argv = [];
			server.commandLineArgs();
			assert(!server.commandLineArgs('port'))
			assert(!server.commandLineArgs('color'))
			// assert(!clArgs.port)
		});

		it('default --color', function(){
			process.argv = ['','','--color']
			server.commandLineArgs();
			assert(server.commandLineArgs('color'))
			assert(!server.commandLineArgs('port'))
			// assert(clArgs.color)
			// assert(!clArgs.port)
		});

		it('default --port', function(){
			process.argv = ['','','--port', 123]
			server.commandLineArgs();
			// assert(!clArgs.color)
			assert(!server.commandLineArgs('color'))
			// assert.equal(clArgs.port, 123)
			assert.equal(server.commandLineArgs('port'), 123)
		});

		it('add an integer option --int', function(){
			process.argv = ['','','--int', '123']
			server.commandLineArgs([{
				flag: '-i, --int [int]'
			}]);
			// assert.equal(clArgs.int, 123)
			assert.equal(server.commandLineArgs('int'), 123)
		});

		// it('array option', function(){
		// 	process.argv = ['','','--int', '123' ]
		// 	server.commandLineArgs([
		// 		['-i, --int [int]', 'description' , parseInt]
		// 	]);
		// 	// assert.equal(clArgs.int, 123)
		// 	assert.equal(server.commandLineArgs('int'), 123)
		// });

		it('subcommand w/options', function(done){
			process.argv = ['','','subcommand', 'label1', 'label2']
			server.commandLineArgs([{
				command: ['subcommand [label...]'],
		        options: [
	                ['-h, --handler [string]', 'handler'],
	    			['-l, --limit [number]', 'max concurrent messages', parseInt, 10]
	            ],
		        action: function (label, options) {
					assert.deepEqual(label, ['label1', 'label2'])
					assert(!options.handler)
					assert.equal(options.limit, 10)
					done()
				}
			}]);

		})

	})

}).call(this);
