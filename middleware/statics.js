
var express = require('express');
exports.map = function(map, app){
	for(var i in map)
	{
		var entries = map[i];
		entries.forEach(function(entry){
			app.use(i, express.static(entry.path, entry.options));
		});
	}
};
