"use strict";

document.body.onload = async function()
{
	//First, get all the paths to the program's data
	//This may be a bit overkill for this app, but oh well
	var DATAPATHS = null;
	await import("./datapaths.json", {with: {type: "json"}}).then((paths) => 
		{
			DATAPATHS = paths.default;
		}
	);
	
	//Backgrounds for the card
	var BACKGROUNDSDIR = null;
	var BACKGROUNDS = null;
	await import(DATAPATHS["backgrounds"], {with: {type: "json"}}).then((backgrounds) => 
		{
			BACKGROUNDS = backgrounds.default.files;
			BACKGROUNDSDIR = backgrounds.default.dir;
		}
	);
	
	//Borders for the card
	var BORDERSDIR = null;
	var BORDERS = null;
	await import(DATAPATHS["borders"], {with: {type: "json"}}).then((borders) => 
		{
			BORDERS = borders.default.files;
			BORDERSDIR = borders.default.dir;
		}
	);
	
	//Load our images
	var IMAGEDIR = null;
	var IMAGEBANK = null;
	await import(DATAPATHS["imagebank"], {with: {type: "json"}}).then((images) =>
		{
			IMAGEBANK = images.default.files;
			IMAGEDIR = images.default.dir;
		}
	);
	
	//Let's populate our select elements
	// Allows the user to choose the graphics they want
	let pokemonSelect = document.getElementById("pokemonSelect");
	for (let image of IMAGEBANK)
	{
		let option = document.createElement("option");
		option.value = IMAGEDIR + image;
		option.innerHTML = image.split(".")[0];
		pokemonSelect.appendChild(option);
	}
	
	let leftBackgroundSelect = document.getElementById("leftBackgroundSelect");
	let rightBackgroundSelect = document.getElementById("rightBackgroundSelect");
	for (let image of BACKGROUNDS)
	{
		let option = document.createElement("option");
		option.value = "url(" + BACKGROUNDSDIR + image + ")";
		option.innerHTML = image.split(".")[0];
		leftBackgroundSelect.appendChild(option);
		rightBackgroundSelect.appendChild(option.cloneNode(true));
	}
	
	let borderSelect = document.getElementById("borderSelect");
	for (let image of BORDERS)
	{
		let option = document.createElement("option");
		option.value = "url(" + BORDERSDIR + image + ")";
		option.innerHTML = image.split(".")[0];
		borderSelect.appendChild(option);
	}
	
	//Load word data
	var WORDBANK = null;
	await import(DATAPATHS["wordbank"], {with: {type: "json"}}).then((words) =>
		{
			WORDBANK = words.default;
		}
	);
	
	//Add IDs to pronouns
	for (let p in WORDBANK.pronouns)
		WORDBANK.pronouns[p].id = p;
	
	/*
	 * "sentence" describes the words to use for the greeting
	 * "punctuation" is the punctuation mark the sentence ends with
	 * "generate" is the function to return a completed greeting string using the given word bank
	 */
	//Load greeting data
	var GREETINGS = null;
	await import(DATAPATHS["greetings"], {with: {type: "json"}}).then((greetings) =>
		{
			GREETINGS = greetings.default;
		}
	);
	
	function find_words_with_tag(list, tag)
	/** Returns a list of words from the given list
	    that have the given tag. */
	{
		var matchingWordList = [];
		
		for (let word of list)
			if (word.tags.includes(tag))
				matchingWordList.push(word);
			
		return matchingWordList;
	}
	
	function generate_greeting_string(wordbank)
	/** Returns a generated greeting string using the
	    provided word bank. */
	{
		//Holds the selected words from wordbank without modification
		let tempSentence = [];
		let greetingString = "";
		
		//First, go through our sentence and randomly select the words that we need
		for (let word of this.sentence)
		{
			if (word.type == "static")
				tempSentence.push(word);
			
			else if (["noun", "verb", "adjective", "pronoun"].includes(word.type))
			{
				//Holy jank
				let validWords = wordbank[word.type + "s"];
				
				//Make sure all valid words have all the tags specified
				if (word.tags)
					for (let tag of word.tags)
						validWords = find_words_with_tag(validWords, tag);
					
				let chosenWord = validWords[Math.floor(Math.random()*validWords.length)];
				tempSentence.push(chosenWord);
			}
		}
		
		//Now, tempSentence holds our selected words.
		// Time to form the greeting string
		let previousWordWasANoun = false;
		for (let i in tempSentence)
		{
			//Adding spaces between words
			if (i != 0)
				greetingString += " ";
			
			//This says what type of word we're dealing with.
			// Different types of words require different processes
			// to integrate them into the sentence
			let type = this.sentence[i].type;
			
			if (["static", "noun", "adjective"].includes(type))
				greetingString += tempSentence[i].word;
			
			else if (type == "pronoun")
			{
				let isReflexive = false;
				
				//If a possible reflexive scenario can occur
				if (this.sentence[i].objectOf != undefined)
				{
					//Find corresponding subject
					for (let subIndex in this.sentence)
					{
						if (this.sentence[subIndex].subject == this.sentence[i].objectOf)
							if (tempSentence[subIndex].id == tempSentence[i].id) //If a reflexive situation has occurred
							{
								isReflexive = true;
								break;
							}
					}
				}
				
				if (isReflexive)
					greetingString += tempSentence[i]["reflexive"];
				else
					greetingString += tempSentence[i][this.sentence[i].tense];
			}
			
			else if (type == "verb")
			{
				let tense = this.sentence[i].tense;
				let conjugation = 2; //Default to "you" conjugation
				
				//If previous word is a pronoun/noun, we need to
				// conjugate it properly
				if (previousWordWasANoun)
					conjugation = tempSentence[i-1].conjugation;
				
				greetingString += tempSentence[i][tense][conjugation];
			}
			
			//For use in conjugating verbs, if necessary
			if (["noun", "pronoun"].includes(type))
				previousWordWasANoun = true;
			else
				previousWordWasANoun = false;
		}
		
		//Add punctuation
		greetingString += this.punctuation;
		
		//Finally, let's randomly add an interjection
		let interjectionChance = Math.random();
		if (interjectionChance >= 0.5)
		{
			let interjection = wordbank.interjections[Math.floor(Math.random()*wordbank.interjections.length)];
			let punctuation = ",";
			
			//Add interjection at the end of the greeting
			if (interjectionChance >= 0.75)
			{
				//This ensures we don't get a comma for an ending interjection
				while (punctuation == ",")
					punctuation = interjection.punctuation[Math.floor(Math.random()*interjection.punctuation.length)];
				
				greetingString += " " + interjection.word + punctuation;
			}
			
			//Add interjection at beginning of greeting
			else
			{
				punctuation = interjection.punctuation[Math.floor(Math.random()*interjection.punctuation.length)];
				
				//Ensuring the comma and ellipsis doesn't mess up capitalization
				if (![",", "..."].includes(punctuation))
					greetingString = interjection.word + punctuation + " " + greetingString[0].toUpperCase() + greetingString.substring(1);
				
				else
					greetingString = interjection.word + punctuation + " " + greetingString;
			}
		}
		
		//Now, greetingString should hold our complete greeting.
		//Let's fix the capitalization, if necessary
		greetingString = greetingString[0].toUpperCase() + greetingString.substring(1);
		
		return greetingString;
	}
	
	//Give greetings their method
	for (let g of GREETINGS)
		g.generate = generate_greeting_string;
	
	function generate_greeting(wordbank)
	/** Call this function whenever you want to generate a
	    new greeting to show to the user. */
	{
		//Step 1: Choose a random greeting from GREETINGS
		let greeting = GREETINGS[Math.floor(Math.random()*GREETINGS.length)];
		
		//Step 2: Use the greeting's method to generate the greeting string
		let greetingText = document.getElementById("greetingText");
		greetingText.innerHTML = greeting.generate(WORDBANK);
	}
	
	//Now, let's generate a Valentine's greeting
	generate_greeting(WORDBANK);
	
	//Finally, let's bind the "create greeting" functionality
	// to a button on the page
	let generateGreetingButton = document.getElementById("generateGreetingButton");
	generateGreetingButton.addEventListener("click", () => {
		generate_greeting(WORDBANK);
	});
	
	//Phew. All the greeting stuff is done. Now,
	// let's create image-swapping functionality
	let cardArt = document.getElementById("cardArt");
	let greetingPanel = document.getElementById("greetingPanel");
	let artPanel = document.getElementById("artPanel");
	let cardBorder = document.getElementById("cardBorder");
	
	pokemonSelect.addEventListener("change", (e) => 
		{
			cardArt.src = e.target.value;
		}
	);
	leftBackgroundSelect.addEventListener("change", (e) => 
		{
			greetingPanel.style.backgroundImage = e.target.value;
		}
	);
	rightBackgroundSelect.addEventListener("change", (e) => 
		{
			artPanel.style.backgroundImage = e.target.value;
		}
	);
	borderSelect.addEventListener("change", (e) => 
		{
			cardBorder.style.backgroundImage = e.target.value;
		}
	);
	
	//Select random art to start
	pokemonSelect.value = pokemonSelect[Math.floor(Math.random()*pokemonSelect.length)].value;
	leftBackgroundSelect.value = leftBackgroundSelect[Math.floor(Math.random()*leftBackgroundSelect.length)].value;
	rightBackgroundSelect.value = rightBackgroundSelect[Math.floor(Math.random()*rightBackgroundSelect.length)].value;
	borderSelect.value = borderSelect[Math.floor(Math.random()*borderSelect.length)].value;
	
	cardArt.src = pokemonSelect.value;
	greetingPanel.style.backgroundImage = leftBackgroundSelect.value;
	artPanel.style.backgroundImage = rightBackgroundSelect.value;
	cardBorder.style.backgroundImage = borderSelect.value;
};
