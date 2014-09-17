var deep = require("deepjs/deep");
// map for static files served by server (the map itself could be OCM)
module.exports = {
	"/": [{ // serve root
		path: deep.globals.rootPath + '/www',
		options: {	// native expressjs connect-statics options : should be updated with new send options
			maxAge: 86400000,
			redirect: false
		}
	}]
};