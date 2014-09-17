/**
 * example of deep-views/deep-routes html render map
 */
var deep = require("deepjs");
require("deep-views/lib/view");
require("deep-node/lib/rest/file/json")({ // create json client that look from /www. use it under "json" protocol.
	protocol: "json",
	basePath: "/www"
});
require("deep-swig/lib/nodejs")({ // create swigjs client that look from /www. use it under "swig" protocol.
	protocol: "swig",
	basePath: "/www"
});
// map for html pages produced by server. the map itself, or the entries of the map, could be OCM.
// example of map :
module.exports = {
	head:deep.View({
		how:"<title>html from server</title>",
		where:"dom.appendTo::head"
	}),
	index:deep.View({
		how:"swig::/template.html",	// load index from www
		where:"dom.appendTo::",		// NO Selector says : use html merge rules (see deep-jquery)
		subs:{
			topbar:deep.View({
				how:"<div>topbar</div>",
				where:"dom.htmlOf::#topbar"
			}),
			content:deep.View({
				route:"/$",
				how:"<div>default content</div>",
				where:"dom.htmlOf::#content"
			}),
			hello:deep.View({
				route:"/hello/?s:name",
				how:"<div>hello { name+'!' | 'dude!'}</div>",
				where:"dom.htmlOf::#content"
			})
		}
	})	
};
