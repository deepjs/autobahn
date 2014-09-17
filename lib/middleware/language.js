/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var deep = require("deepjs");
var queryString = require("querystring");

exports.middleware =  function(getLanguageFromContext, saveLanguage, avaiableLanguages, defaultLanguage){

	console.log("___________________________________ LANGUAGE MIDDLEWARE");

	defaultLanguage = defaultLanguage || "en";

	function parseParams(str){
		return str
		.split(/ *, */)
		.map(acceptParams)
		.filter(function(obj){
			return obj.quality;
		})
		.sort(function(a, b){
			if (a.quality === b.quality) {
			return a.originalIndex - b.originalIndex;
			} else {
			return b.quality - a.quality;
			}
		});
	}

	function acceptParams(str, index) {
		var parts = str.split(/ *; */);
		var ret = { value: parts[0], quality: 1, params: {}, originalIndex: index };
		for (var i = 1; i < parts.length; ++i) {
			var pms = parts[i].split(/ *= */);
			if ('q' == pms[0]) {
				ret.quality = parseFloat(pms[1]);
			} else {
				ret.params[pms[0]] = pms[1];
			}
		}
		return ret;
	}

	return function(request, response, nextApp){
		var languages = [defaultLanguage];
		deep.Promise.context.language = defaultLanguage;

		//console.log("-------------------- deep.Promise.context.language = ", deep.Promise.context.language);
		//console.log("-------------------- Request.url = ", request.url);
		
		if(request.url.split("/").length > 2)
			return nextApp();

		var query = queryString.parse(request.queryString) || {};

		var passport = null;
		var languageFromCookie = null;

		// var contextLanguages = getLanguageFromContext(deep.Promise.context);
		
		// if(contextLanguages)
		// {
		// 	console.log("Languages from CONTEXT : ", languages);
		// 	languages = contextLanguages;
		// 	/*
		// 	passport = deep.Promise.context.session.passports[autobahn.layer.application];
		// 	languages = [passport.language];
		// 	 */
		// }
		//console.log("Request cookies = ", request.cookies);
		if( request.cookies && request.cookies.language )
		{
			languages = [request.cookies.language];
			console.log("Languages from COOKIES : ", languages);
		}

		//si pas
		//regarder cookies, url, header
		else if(request.headers && request.headers["accept-language"])
		{
			
			//console.log("ACCEPT LANGUAGE HEADER : ",request.headers["accept-language"] );
			var accept = request.headers["accept-language"];
			languages = accept ?
				parseParams(accept)
				.map(function(obj){

					return obj.value;
				})
				: [];
			console.log("Languages from Browser after parsing are : ", languages);
		}

		if(query && query.changelanguage)
		{
			console.log("-------------------- CHANGE LANGUAGE  ", query.changelanguage);
			languages = [query.changelanguage];
		}


		var ok = languages.some(function (lang) {
			//console.log("checking language : ", lang, "with available languages : ", autobahn.layer.availableLanguages);
			lang = lang.split("-");
			if(lang.length > 1)
				lang = lang[1];
			else 
				lang = lang[0];
			if(deep.utils.inArray(lang, avaiableLanguages))
			{
				//console.log("we have a language match : ", lang);
				languages = [lang];
				return true;
			}
			return false;
		});
		if(!ok)
			deep.Promise.context.language = defaultLanguage;
		else
			deep.Promise.context.language = languages[0];
		

		if(languageFromCookie !== deep.Promise.context.language)
		{
			// var d = new Date();
			// d.setMonth( d.getMonth( ) + 6 );
			// request.cookies.set("language", deep.Promise.context.language, {expires:d});
			response.cookie('language', deep.Promise.context.language, { maxAge: 15120000000, httpOnly: true });
		}

		if(saveLanguage && contextLanguages && contextLanguages != deep.Promise.context.language)
		{
			console.log("-------------------- CHANGE LANGUAGE FOR CONTEXT= ", deep.Promise.context.language);
			// save it in passport in db : so save session
			saveLanguage(deep.Promise.context);
			/*
			passport.language = deep.Promise.context.language;
			autobahn().modes({ roles:"admin" }).facet("passport").put(passport).log();
			deep.Promise.context.request.autobahn.session.save();
			*/
		}

		console.log('__________________ language catched : ', deep.Promise.context.language);
		//deep.Promise.context.languageCode = autobahn.layer.application + "-" + deep.Promise.context.language;

		if(query && query.changelanguage)
			return response.redirect("/");

		return nextApp();
	};
};
