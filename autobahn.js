/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
module.exports = {
	context:require("./middleware/context"),
	html:require("./middleware/html"),
	language:require("./middleware/language"),
	login:require("./middleware/login"),
	logout:require("./middleware/logout"),
	restful:require("./middleware/restful"),
	roles:require("./middleware/roles"),
	statics:require("./middleware/statics")
};

