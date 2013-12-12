/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var deep = require("deepjs");

exports.middleware = function(getRoles){

	return function (req, response, next)
	{

		if(req.session)
		{
			deep.when(getRoles(req.session))
			.done(function (roles) {
				//deep.setModes({ roles:roles });
				deep.modes('roles',roles)
				.done(function(){
					//console.log("roles get : ", roles, deep.context.modes);
					next();
				});
			})
			.fail(function(e){
				console.log("autobahn session middleware error : ", e.toString());
				response.writeHead(e.status || 400, {'Content-Type': 'text/html'});
				response.end("error : "+JSON.stringify(e));
			});
		}
		else
			deep.modes('roles',"public")
			.done(function(){
				//deep.setModes({ roles:"public" });
				next();
			});
	};
};
