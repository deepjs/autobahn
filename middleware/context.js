/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var deep = require("deepjs");
exports.middleware = function(initialiser){
	return function (req, response, next)
	{
		// console.log("context middleware")
		deep.Promise.context = { request:req, response:response, modes:{}, debug:true };
		deep.when(initialiser?initialiser(deep.Promise.context):deep.Promise.context)
		.done(function(context){
			// console.log("context middleware initialised")
			next();
		})
		.fail(function(e){
			// console.log("context middleware initialiser error : ", e.toString());
			response.writeHead(e.status || 400, {'Content-Type': 'text/html'});
			response.end("error : "+JSON.stringify(e));
		});
	};
};
