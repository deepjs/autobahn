 
if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
define(function(require){

	var Response = function (status, headers, body) {
		this._autobahn_reponse = true;
		this.headers = {};
		if(headers)
			deep.utils.up(headers, this.headers);
		this.status = status || 200;
		this.body = body || null;
	}

	Response.prototype = {
		_autobahn_reponse:true
	}


	return Response;
})