/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var deep = require("deepjs");

var urlparse = require('url').parse;
var crypto = require('crypto');
exports.middleware = function(userStore, loginField, successHandler){
	return function (req, response, next)
	{
		if(req.session)
			req.session.destroy();
		response.writeHead(200, {'Content-Type': 'application/json'});
		response.end(JSON.stringify(true));
	};
};
