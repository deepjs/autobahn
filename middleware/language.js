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
		deep.context.language = defaultLanguage;

			//console.log("-------------------- Request.url = ", request.url);
		

		if(request.pathInfo.split("/").length > 2)
			return app(request);


		var query = queryString.parse(request.queryString) || {};

		var passport = null;
		var languageFromCookie = null;

		//regarder ds session 

		//si y'en a une y'a passport et dedans y'a langue
		var contextLanguages = getLanguageFromContext(deep.context);
		
		if(contextLanguages)
		{
			console.log("Languages from CONTEXT : ", languages);
			languages = contextLanguages;
			/*
			passport = deep.context.session.passports[autobahn.layer.application];
			languages = [passport.language];
			 */
		}
		else if( request.cookies && request.cookies.get("language") )
		{
			languages = [request.cookies.get("language")];
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
			deep.context.language = defaultLanguage;
		else
			deep.context.language = languages[0];
		

		if(languageFromCookie !== deep.context.language)
		{
			var d = new Date();
			d.setMonth( d.getMonth( ) + 6 );
			request.cookies.set("language", deep.context.language, {expires:d});
		}

		if(saveLanguage && contextLanguages && contextLanguages != deep.context.language)
		{
			console.log("-------------------- CHANGE LANGUAGE FOR CONTEXT= ", deep.context.language);
			// save it in passport in db : so save session
			saveLanguage(deep.context.language);
			/*
			passport.language = deep.context.language;
			autobahn().roles(["admin"]).facet("passport").put(passport).log();
			deep.context.request.autobahn.session.save();
			*/
		}


		console.log('__________________ language catched : ', deep.context.language);
		//deep.context.languageCode = autobahn.layer.application + "-" + deep.context.language;

		if(query && query.changelanguage)
			return response.redirect("/");

		return app(request);
	};
};
