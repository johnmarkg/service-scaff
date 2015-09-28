(function(){


	var util = require("util");
	var Rabbus = require("rabbus");

	// function Rabbit(wascallyConfig, cb){

	// 	if(typeof wascallyConfig === 'undefined'){
	// 		// return this.wascally;	
	// 		throw new Error('rabbit config required')
	// 	}

	// 	var config = {};

	// 	if(!wascallyConfig.connection){
	// 		config.connection = wascallyConfig
	// 	}
	// 	else{
	// 		config = wascallyConfig	
	// 	}

	// 	// var prefix = config.connection.prefix || 'default';

	// 	this._rabbitConfig = config;
	//     this.wascally = require( 'wascally' );

	//     this.wascally.configure(config).done(function(){
	//     	if(typeof cb === 'function'){
	//     		cb();
	//     	}
	//     });


	// 	return this;		

	// }
	// exports = module.exports = Rabbit;


	function Receiver(rabbus, version, label, limit) {
		var prefix = 'send-rec.';
		return Rabbus.Receiver.call(this, rabbus, {
			exchange: prefix + version + "-exchange",
			queue: {
				name: prefix + version + '.' + label ,
				limit: typeof limit === 'number' ? limit : 1
			},
			routingKey: version + '.' + label,
			messageType: prefix + version + '.' + label
		});
	}
	util.inherits(Receiver, Rabbus.Receiver);

	function Sender(rabbus, version, label) {
		var prefix = 'send-rec.';
		return Rabbus.Sender.call(this, rabbus, {
			exchange: prefix + version + "-exchange",
			routingKey: version + '.' + label,
			messageType: prefix + version + '.' + label
		});
	}
	util.inherits(Sender, Rabbus.Sender);

	function Responder(rabbus, version, label, limit) {
		var prefix = 'req-res.';
		return Rabbus.Responder.call(this, rabbus, {
			exchange: prefix + version + "-exchange",
			queue: {
				name: prefix + version + '.' + label ,
				limit: typeof limit === 'number' ? limit : 1
			},
			routingKey: version + '.' + label,
			messageType: prefix + version + '.' + label
		});
	}
	util.inherits(Responder, Rabbus.Responder);

	function Requester(rabbus, version, label) {
		var prefix = 'req-res.';

		return Rabbus.Requester.call(this, rabbus, {
			exchange: prefix + version + "-exchange",
			routingKey: version + '.' + label,
			messageType: prefix + version + '.' + label
		});
	}
	util.inherits(Requester, Rabbus.Requester);


	exports.respond = function(queue, limit, handler){
		var version = this._rabbitConfig.connection.prefix || 'default'
		var responder = new Responder(this.wascally, version, queue, limit);
		responder.handle(handler);		
	}
	exports.request = function(label, msg, cb){
		var version = this._rabbitConfig.connection.prefix || 'default'
		if(!this.requesters){
			this.requesters = {}
		}
		var key = version + '-' + label;
		if(!this.requesters[key]){
			this.requesters[key] = new Requester(
				this.wascally, 
				version, 
				label
			);
		}

		this.requesters[key].request(msg, cb);
	}


	exports.receive = function(queue, limit, handler){
		var version = this._rabbitConfig.connection.prefix || 'default'
		var receiver = new Receiver(this.wascally, version, queue, limit);
		receiver.receive(handler);		
	}
	exports.send = function(label, msg, cb){
		var version = this._rabbitConfig.connection.prefix || 'default'
		if(!this.senders){
			this.senders = {}
		}
		var key = version + '-' + label;
		if(!this.senders[key]){
			this.senders[key] = new Sender(
				this.wascally, 
				version, 
				label
			);
		}

		this.senders[key].send(msg, cb);
	}

	

}).call(this);