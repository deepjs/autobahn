/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var deep = require("deepjs");
var express = require('express');
exports.map = function(map, app){
	var keys = Object.keys(map);
	keys.forEach(function(i){
		var entries = map[i];
		entries.forEach(function(entry){
			app.use(i, express.static(entry.path, entry.options));
		});
	});
};
