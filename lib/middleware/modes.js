/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 * OCM Modes middleware for expressjs/autobahnjs/deepjs.
 * Define current OCM modes for current request.
 */
var deep = require("deepjs");

exports.middleware = function(sessionModes){

	return function (req, response, next)
	{
		deep.Promise.context.session = req.session;
		deep.when(sessionModes(req.session))
		.done(function (modes) {
			 //console.log("middleware roles : roles getted : ", roles, req.session)
			deep.modes(modes)
			.done(function(){
				//console.log("roles middleware : execute next", this._context.modes)
				next();
			})
			.fail(function (e) {
				console.log("set modes fail : ", e);
				deep.utils.dumpError(e);
			})
		})
		.fail(function(e){
			// console.log("autobahn roles middleware error : ", e.toString());
			response.writeHead(e.status || 400, {'Content-Type': 'text/html'});
			response.end("error : "+JSON.stringify(e));
		});
	};
};
