//chrome.storage.local.clear();
let VERSION = 1.2;
let BEACH_SNIPPET = "pokebeach.com/forums/threads/";
let QT_SNIPPET = "quicktopic.com/";

let toPrint = []; //This will be used for outputting posts
let numToPrint = 15;
	
let chosenRadioFilter = undefined;
let postedBy = undefined;

function allFilter(post){ return true; }

function pokebeachOnlyFilter(post){
	if (post.type == "pokebeach")
		return true;
	return false;
}

function qtOnlyFilter (post){
	if (post.type == "qt")
		return true;
	return false;
}

function clearElementById(id){
	let element = document.getElementById(id);
	if (element){
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	}
}

function VoteRequest(unvote, target, auto, removeVote){
	this.unvote = unvote;
	this.target = target;
	this.auto = auto;
	this.removeVote = removeVote
}

function FinalVote(unvote, target, user, postSource, negatedBy, useless){
	this.unvote = unvote;
	this.target = target;
	this.user = user;
	this.postSource = postSource;
	this.negatedBy = negatedBy;
	this.useless = useless;
}

/**
 * Creates an empty hashtable with all user names and their aliases as keys
 * @param userdata
 * @returns
 */
function createUserHashTable(userdata){
	
	//Create Data table which has all aliases point to the real keys
	let dataTable = {};
	let namesTable = {};
	Object.keys(userdata).forEach(function(name){
		dataTable[name] = null;
		
		let user = userdata[name];
		namesTable[name] = user.name;
		user.aliases.forEach(function(alias){
			Object.defineProperty(dataTable, alias, {
			    get: function() {
			        return dataTable[name];
			    },
			    set: function(x){
			    	dataTable[name] = x;
			    }
			});
		})
	});
	
	let hashTable = {}	
	hashTable.__NEWKEYS = [];
	hashTable.__DATATABLE = dataTable;
	hashTable.__NAMESTABLE = namesTable;
	
	let handler = {
		get: function(target, prop, receiver) {
			prop = prop.toUpperCase();
			if (prop == "__NEWKEYS" || prop == "__DATATABLE" || prop == "__NAMESTABLE")
				return target[prop];
			return target["__DATATABLE"][prop.toUpperCase()];
		},
		set: function(target, prop, value){
			prop = prop.toUpperCase();
			if (target["__DATATABLE"][prop] === undefined){
				target.__NEWKEYS.push(prop);
			}
			target["__DATATABLE"][prop] = value;
		}
	}
	
	return new Proxy(hashTable, handler);
}

function compileVotes(postObject){
	let votes = (postObject.votes === undefined ? [] : postObject.votes)
	let finalVotes = new Array();
	//TODO: add/delete votes using manual votes
	votes.forEach(function(vote){
		finalVotes.push(new FinalVote(vote.unvote, vote.target, postObject.user, postObject));
	});
	return finalVotes;
}

/**
 * DeleteNode
 * Deletes the target node
 * @returns
 */
function deleteNode(node){
	node.parentNode.removeChild(node);
}

function updatePostedByChoices(){
	clearElementById("posted-by");
	selectNode = document.getElementById("posted-by");
	selectNode.appendChild(new Option("Any", "", true, true));
	chrome.storage.local.get("users", function(result){
		result = result["users"];
		result = (result === undefined ? {} : result);

		let objArray = Object.values(result);
		
		objArray.forEach(function(value){
			let element = new Option(value.name, value.name, false, false);
			selectNode.appendChild(element);
		}
		);
	});
}

function outputFactions(){
	clearElementById("factions");
	factionsNode = document.getElementById("factions");
	chrome.storage.local.get("factions", function(result){
		result = result["factions"];
		result = (result === undefined ? {} : result);
		
		chrome.storage.local.get("users", function(users){
			users = users["users"];
			users = (users === undefined ? {} : users);

			let objArray = Object.values(result);
			let usersArray = Object.values(users);
			
			objArray.forEach(function(value){
				let element = document.createElement("DIV");
				let heading = document.createElement("h2");
				heading.innerHTML = value.name;
				element.appendChild(heading);
				usersArray.forEach(function(user){
					if (user.faction !== undefined && user.faction == value.name)
						element.appendChild(document.createTextNode(user.name));
				});
				factionsNode.appendChild(element);
			}
			);
			let element = document.createElement("DIV");
			let heading = document.createElement("h2");
			heading.innerHTML = "Undecided";
			element.appendChild(heading);
			usersArray.forEach(function(user){
				if (user.faction === undefined)
					element.appendChild(document.createTextNode(user.name));
			});
			factionsNode.appendChild(element);
		});		
	});
}
/**
 * @param {String} HTML representing a single element
 * @return {Element}
 */
function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

/*
 * Compares 2 users by their name (even if they don't exist)
 * Returns equal if:
 * >Names are equal
 * >name1 has a user and name2 is an alias
 * >name2 has a user and name1 is an alias
 */
function sameUser(name1, name2, usersTable){
	name1 = name1.toUpperCase();
	name2 = name2.toUpperCase();
	
	if (name1.toUpperCase() === name2.toUpperCase()) 
		return true;
	if (usersTable[name1] !== undefined){
		let user = usersTable[name1];
		if (user["aliases"] !== undefined && user["aliases"].indexOf(name2) != -1)
			return true;
	}
	if (usersTable[name2] !== undefined){
		let user = usersTable[name2];
		if (user["aliases"] !== undefined && user["aliases"].indexOf(name1) != -1)
			return true;
	}
	
	return false;
}

//Checks all items in the table to determine if the user already has been recorded
function userExists(userName, usersTable){
	if (usersTable["userName"]) return true;
	
	let userArray = Object.keys(usersTable);
	for (let i = 0; i < userArray.length; i++) {
		if (sameUser(userName, userArray[i], usersTable))
			return true;
	}
	
	return false;
}

/**
 * Checks every post in the database for a post from a new user
 * Adds this new user to the users list if not found.
 */
function update_users(callback){
	chrome.storage.local.get("posts", function(result){
		result = result["posts"];
		result = (result === undefined ? {} : result);
		
		let objArray = Object.values(result);
		
		chrome.storage.local.get("users", function(usersTable){
			usersTable = usersTable["users"];
			usersTable = (usersTable === undefined ? {} : usersTable);
			
			let usersArray = Object.values(usersTable);
			
			objArray.forEach(function(value){
				let userName = value["user"];
				console.log("username: " + userName);
				if (!userExists(userName, usersTable))
					usersTable[userName.toUpperCase()] = {name: userName, aliases: []};	
			});
			
			chrome.storage.local.set({"users" : usersTable}, function() {
		          console.log('Users Table Updated!');
		          if (callback !== undefined) return callback();
			});
		});
	});
}

function visibility_switch(button_id, content_id) {	
	let tabs = document.getElementsByClassName("tab");
	for (let i = 0; i < tabs.length; i++){
		tabs[i].classList.remove("active");
	}
	
	document.getElementById(button_id).classList.add("active");
	
	tabs = document.getElementsByClassName("tabContent");
	for (let i = 0; i < tabs.length; i++){
		tabs[i].style.display = "none";
	}
	
	document.getElementById(content_id).style.display = "block";
}

function outputUsers(){
	clearElementById("players");

	chrome.storage.local.get("users", function(result){
		result = result["users"];
		result = (result === undefined ? {} : result);

		let objArray = Object.values(result);
		
		objArray.forEach(function(value){
			let id = value.name.toUpperCase();
			
			let element = document.createElement("DIV");
			element.setAttribute("class", "player");
			let nameLabel = document.createElement("h1");
			nameLabel.innerHTML = value.name;
			element.appendChild(nameLabel);
			
			//add delete button to element
			let deleteButton = document.createElement("button");
			deleteButton.innerHTML = "X";
			deleteButton.setAttribute("class", "delete-button");
			deleteButton.onclick = function(){
				document.getElementById("players").removeChild(element);
				chrome.storage.local.get("users", function(data){
					data = data["users"];
					if (data === undefined) data = {};
					data[id] = undefined;
					chrome.storage.local.set({"users" : data}, function() {
				          console.log(id + ' removed from storage!');
					});
		    });
			}
			element.appendChild(deleteButton);
			
			document.getElementById("players").appendChild(element);
		}
		);
	});
}

function changePostAttribute(postId, key, value, callback){
	  chrome.storage.local.get("posts", function(data){
			data = data["posts"];
			if (data === undefined) data = {};
			if (data[postId]){
				data[postId][key] = value;
			}
			chrome.storage.local.set({"posts" : data}, function() {
				callback();
			});
  });
}

function outputPosts(){
	clearElementById("posts");
	
	chrome.storage.local.get("posts", function(result){
		result = result["posts"];
		result = (result === undefined ? {} : result);
		
		chrome.storage.local.get("users", function(usersTable){
			usersTable = usersTable["users"];
			usersTable = (usersTable === undefined ? {} : usersTable);
			
			let objArray = Object.values(result);
			objArray = objArray.filter(chosenRadioFilter);
			
			if (postedBy !== undefined){
				objArray = objArray.filter(function(post){
					if(sameUser(post.user, postedBy, usersTable))
						return true;
				});
			}
			
			objArray.sort(function(a, b){
				if (a.date > b.date) return 1;
				else if (a.date === b.date) return 0;
				else return -1;
			})
						
			toPrint = objArray;
			outputSomeQueuedPosts();
		});
		
	});
}


function outputSomeQueuedPosts(){
	for (let i = 0; (toPrint.length < numToPrint && i < toPrint.length) || i < numToPrint; i++){
		let post = toPrint[i];
		document.getElementById("posts").appendChild(generatePost(post));
	}
	toPrint = toPrint.slice(numToPrint);
	if (toPrint.length == 0){
		console.log("END");
	}
}

function getURLType(string){
	if (string.includes(BEACH_SNIPPET))
		return "pokebeach";
	else if (string.includes(QT_SNIPPET))
		return "qt";
	else
		return undefined;
}

function isValidURL(string){
	let urlPattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
			  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
			  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
			  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
			  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
			  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
	

	let match = urlPattern.test(string);
	
	//console.log(string.includes(beachSnippet));
	
	if (match)
		if (getURLType(string) != undefined)
			return true;
	return false;
}



//SCRIPTS IMPORTED FROM POPUP.JS

function getFile(filename, callback)
{ oxmlhttp = null;
  try
    { oxmlhttp = new XMLHttpRequest();
      oxmlhttp.overrideMimeType("text/html");
    }
  catch(e)
    { 
  	return null
    }
  if(!oxmlhttp) return null;
  try
    { oxmlhttp.open("GET",filename,true);
    	oxmlhttp.send(null);
    }
  catch(e)
    { return null;
    }
  oxmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
      	var parser = new DOMParser();
      	var xmlDoc = parser.parseFromString(this.responseText, "text/html");''
      	callback(xmlDoc);
      }
	  };
}

/**
 * Does the exact same thing as getFile, but only allows the parsing of one page at a time.
 * If called more than once, xmlDoc will be overwritten.
 * Therefore, significant amounts of ram will NOT be used.
 * @param filename
 * @param callback
 * @returns
 */
let CURRENT_DOC = document;
function sequentialGetFile(filename, callback)
{ oxmlhttp = null;
try
  { oxmlhttp = new XMLHttpRequest();
    oxmlhttp.overrideMimeType("text/html");
  }
catch(e)
  { 
	return null
  }
if(!oxmlhttp) return null;
try
  { oxmlhttp.open("GET",filename,true);
  	oxmlhttp.send(null);
  }
catch(e)
  { return null;
  }
oxmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
    	var parser = new DOMParser();
    	CURRENT_DOC = parser.parseFromString(this.responseText, "text/html");''
    	callback(CURRENT_DOC);
    }
	  };
}

function removeAllButClass(root, excludeClass){
	if (root.classList != undefined && root.classList.contains(excludeClass)) return false;
	
	let children = root.childNodes;
	if (children.length == 0) return true;
	
	for (let i = children.length - 1; i >= 0; i--){
		if(removeAllButClass(children[i], excludeClass))
			root.removeChild(children[i]);
	}
}

/**
 * getBeachNumPages
 * Counts the number of pages on a PokeBeach thread
 * @param url - the url of the site
 * @param callback- the action taken after the number of pages is received
 * 					-has integer parameter with number of pages
 * @returns the number of pages on the thread (an integer)
 */
function getBeachNumPages(url, callback){
	getFile(url, function(site){
		var pageHeader = site.getElementsByClassName("pageNavHeader");
		var re = /Page \d+ of (\d+)/i;

		let numPages = 1;
		
		if (pageHeader.length === 0)
			numPages = 1;
		else {
			pageHeader = pageHeader[0];
			rawString = pageHeader.innerHTML;
			numPages = parseInt(rawString.match(re)[1]);
		}
		
		callback(numPages);
	});
}


/**
 * prompUserForSite
 * Gets a valid PokeBeach or QuickTopic URL from the user, then passes it into the callback function
 * @param isOptional specifies whether the popup can be exited
 * @param callback a function that is ran after the input is received
 * @returns null
 */
function promptUserForSite(isOptional, callback){
	document.getElementById("popup").style.display = "flex";
	document.getElementById("url-entry-popup-form").style.display = "block";
	
	function exit(){
		document.getElementById("popup").style.display = "none";
		document.getElementById("url-entry-popup-form").style.display = "none";
		document.getElementById("url-entry-popup-text").value = "";
		document.getElementById("exit-popup").style.display = "none";
		document.getElementById("exit-popup").onclick = "";
		document.getElementById("popup-background").onclick = "";
	}
	
	if (isOptional == true){
		document.getElementById("exit-popup").style.display = "block";
		document.getElementById("exit-popup").onclick = exit;
		document.getElementById("popup-background").onclick = exit;
	}
	
	document.getElementById("url-entry-popup-form").onsubmit = function() {
		if (isValidURL(document.getElementById("url-entry-popup-text").value))
		{
			console.log("Good URL")
			let result = document.getElementById("url-entry-popup-text").value;
			exit();
			callback(result);
		}
		else
		{
			console.log("Bad URL");
			alert("Not a valid PokeBeach or QuickTopic URL");
		}
	}
}

function promptUserForConfirmation(isOptional, text, callback){
	document.getElementById("popup").style.display = "flex";
	document.getElementById("confirmation-popup").style.display = "block";
	document.getElementById("confirmation-popup-title").innerHTML = text;
	
	function exit(){
		document.getElementById("popup").style.display = "none";
		document.getElementById("confirmation-popup").style.display = "none";
		document.getElementById("confirmation-popup-title").innerHTML = "";
		document.getElementById("exit-popup").style.display = "none";
		document.getElementById("exit-popup").onclick = "";
		document.getElementById("popup-background").onclick = "";
	}
	if (isOptional == true){
		document.getElementById("exit-popup").style.display = "block";
		document.getElementById("exit-popup").onclick = exit;
		document.getElementById("popup-background").onclick = exit;
	}
	
	document.getElementById("confirmation-popup-no").onclick = exit;
	document.getElementById("confirmation-popup-yes").onclick = function(){
		exit();
		callback()
	}
}

//Returns only the Message Content of the post
function generatePostContent(postObject){
	let id = postObject.id;
	
	let element = htmlToElement(postObject.html);
	if (postObject.type == "pokebeach"){
		let messageContent = element.getElementsByClassName("messageContent")
		if (messageContent[0])
			return messageContent[0];
	}
	else if (postObject.type == "qt"){
		let messageContent = element.getElementsByClassName("topic-messagebody")
		if (messageContent[0])
		{
			let editNote = messageContent[0].getElementsByClassName("div-topic-message-edited-note")
			if (editNote[0])
				deleteNode(editNote[0]); //TODO: might not remove editNote
			return messageContent[0];
		}
	}
	
	return document.createElement("text");
}

function generatePost(postObject){
	let id = postObject.id;
	
	let element = htmlToElement(postObject.html);
	let message = element; //Pointer to reference for access to message class
	if (postObject.type == "pokebeach"){
		let ol = document.createElement("ol");
		ol.setAttribute("class", "messageList");
		ol.appendChild(element);
		element = ol;
		
		//Add options to post
		let publicControls = element.getElementsByClassName("publicControls")[0]
		if(publicControls){
			let markAsBox = document.createElement("span");
			markAsBox.setAttribute("class", "item");

			let markAs = document.createElement("a");
			markAs.innerHTML = "Mark As ▼";
			markAs.setAttribute("class", "markAsTitle");

			markAsBox.appendChild(markAs);
			
			let optionsPanel = document.createElement("div");
			optionsPanel.setAttribute("class", "markAsOptions");
			
			let dayPostButton = document.createElement("a");
			dayPostButton.innerHTML = "Day Start Post";
			optionsPanel.appendChild(dayPostButton);
			
			let rolePostButton = document.createElement("a");
			rolePostButton.innerHTML = "Mechanics/Roles";
			optionsPanel.appendChild(rolePostButton);
			
			let importantButton = document.createElement("a");
			importantButton.innerHTML = "Important";
			optionsPanel.appendChild(importantButton);
			
			markAsBox.appendChild(optionsPanel);
			
			publicControls.appendChild(markAsBox);
			
			optionsPanel.style.display = "none";
			
			//Toggle display on click
			markAs.onclick = function(){
				if (optionsPanel.style.display == "none"){
					optionsPanel.style.display = "block";
					markAs.innerHTML = "Mark As ▲";
					markAs.classList.add("active");
				}							
				else{
					optionsPanel.style.display = "none";
					markAs.innerHTML = "Mark As ▼";
					markAs.classList.remove("active");
				}
			}
			
			dayPostButton.onclick = function(){
				//TODO:Add "Day Post" attribute to post
				if (dayPostButton.classList.contains("active")){
					dayPostButton.classList.remove("active");
					changePostAttribute(id, "dayStart", false, function(){});
				}
				else{
					dayPostButton.classList.add("active");
					changePostAttribute(id, "dayStart", true, function(){});
				}
			}
			rolePostButton.onclick = function(){
				//TODO:Add "Role Post" attribute to post
				if (rolePostButton.classList.contains("active")){
					rolePostButton.classList.remove("active");
					changePostAttribute(id, "mechanical", false, function(){});
				}
				else{
					rolePostButton.classList.add("active");
					changePostAttribute(id, "mechanical", true, function(){});
				}
			}
			importantButton.onclick = function(){
				//TODO:Add "Role Post" attribute to post
				if (importantButton.classList.contains("active")){
					importantButton.classList.remove("active");
					message.classList.remove("important");
					changePostAttribute(id, "important", false, function(){});
				}
				else{
					importantButton.classList.add("active");
					message.classList.add("important");
					changePostAttribute(id, "important", true, function(){});
				}
			}
			
			if (postObject.dayStart)
				dayPostButton.classList.add("active");
			if (postObject.mechanical)
				rolePostButton.classList.add("active");
			if (postObject.important){
				importantButton.classList.add("active");
				message.classList.add("important");
			}
		}
	}
	else if (postObject.type == "qt"){
		let table = document.createElement("table");
		table.setAttribute("width", "100%");
		let tbody = document.createElement("tbody");
		tbody.appendChild(element);
		table.appendChild(tbody);
		element = table;
	}
	//Wrap element
	let tempDiv = document.createElement("div");
	tempDiv.appendChild(element);
	element = tempDiv;
	element.setAttribute("class", "message-item");
	
	return element;
}

function generateVoteCount(votesByTarget, voteTitle){
	let container = document.createElement("div");
	container.setAttribute("class", "voteCount");
	let title = document.createElement("h1");
	title.innerHTML = voteTitle;
	container.appendChild(title);
	
	let voteContainer = document.createElement("div");
	voteContainer.setAttribute("class", "voteCountContainer");
	container.appendChild(voteContainer);
	
	let oddVotes = votesByTarget.__NEWKEYS;
	//TODO: Display every vote in the voteContainer
	
	//create array of vote objects
	let voteData = votesByTarget.__DATATABLE;
	let userNames = votesByTarget.__NAMESTABLE;
	let voteArray = [];
	Object.keys(voteData).forEach(function(key){
		let votes = (voteData[key] === null ? [] : voteData[key]);
		let name = userNames[key];
		if (name === undefined) name = key.toLowerCase();
		voteArray.push(
				{
					votes:votes,
					name:name,
					numVotes:countVoteArray(votes),
					oddName:oddVotes.includes(key)
				}
		);
	});
	//sort vote array to be in descending order of votes
	voteArray.sort(function(a,b){
		return b.numVotes - a.numVotes
	});
	
	//Actually create vote divs and put them in the container
	voteArray.forEach(function(vote){
		let voteDiv = document.createElement("div");
		voteDiv.setAttribute("class", "vote");
		let voteMeta = document.createElement("div");
		voteMeta.setAttribute("class", "voteMeta");
		voteDiv.appendChild(voteMeta);

		//Add Vote count
		let voteNum = document.createElement("b");
		voteNum.setAttribute("class", "voteNum");
		voteNum.innerHTML = vote.numVotes + " ";
		voteMeta.appendChild(voteNum);
		
		//Add Name
		let voteName = document.createElement("b");
		voteName.setAttribute("class", "voteName");
		voteName.innerHTML = vote.name + ": ";
		voteMeta.appendChild(voteName);

		
		let voteSubContainer = document.createElement("div");
		voteSubContainer.setAttribute("class", "voteSubContainer");
		voteDiv.appendChild(voteSubContainer);
		
		//Add filler text if no votes
		if (vote.votes.length === 0){
			let fillerText = document.createElement("i");
			fillerText.setAttribute("class", "filler");
			fillerText.innerHTML = "none";
			voteSubContainer.appendChild(fillerText);	
		}

		//Add Each Vote
		for (let i = 0; i < vote.votes.length; i++)
		{
			let individualVote = vote.votes[i];
			let subVote = document.createElement("span");
			subVote.setAttribute("class", "subVote");
			voteSubContainer.appendChild(subVote);
			
			let culpritName = document.createTextNode(individualVote.user);
			subVote.appendChild(culpritName);
			let sourceBeginDelimeter = document.createTextNode(" (");
			subVote.appendChild(sourceBeginDelimeter);
			
			let voteLink = document.createElement("a");
			voteLink.href = "#";
			voteLink.onclick = function(){displayPost(individualVote.postSource.id)};
			voteLink.innerHTML = "#" + individualVote.postSource.number
				+ (individualVote.postSource.type == "qt" ? "-QT" : "");
			//TODO: Make this link the post number
			subVote.appendChild(voteLink);
			
			if (individualVote.negatedBy){
				subVote.classList.add("negated");
				
				let linkDelimeter = document.createTextNode(", ");
				subVote.appendChild(linkDelimeter);
				if (individualVote.useless){
					let uselessDelimeter = document.createElement("i");
					uselessDelimeter.innerHTML = "useless, forgot to unvote ";
					subVote.appendChild(uselessDelimeter);
				}
				let negateLink = document.createElement("a");
				negateLink.href = "#";
				negateLink.onclick = function(){
					console.log(individualVote.negatedBy);
					displayPost(individualVote.negatedBy.postSource.id)};
				negateLink.innerHTML = "#" + individualVote.negatedBy.postSource.number
				+ (individualVote.negatedBy.postSource.type == "qt" ? "-QT" : "");
				subVote.appendChild(negateLink);
			}
			let sourceEndDelimeter = document.createTextNode(")");
			subVote.appendChild(sourceEndDelimeter);
			if (i != vote.votes.length - 1){
				subVote.appendChild(document.createTextNode(", "));
			}
		}
		
		
		voteContainer.appendChild(voteDiv);
	});
	
	return container;
}

function displayPost(postId){
	chrome.storage.local.get("posts", function(result){
		result = result["posts"];
		result = (result === undefined ? {} : result);
		
		let post = result[postId];
		
		console.log(post);
		
		if (post){
			clearElementById("post-popup");
			document.getElementById("popup").style.display = "flex";
			document.getElementById("post-popup").style.display = "block";
			document.getElementById("post-popup").appendChild(generatePost(post));
			
			function exit(){
				clearElementById("post-popup");
				document.getElementById("popup").style.display = "none";
				document.getElementById("post-popup").style.display = "none";
				document.getElementById("exit-popup").style.display = "none";
				document.getElementById("exit-popup").onclick = "";
				document.getElementById("popup-background").onclick = "";
			}
			document.getElementById("exit-popup").style.display = "block";
			document.getElementById("exit-popup").onclick = exit;
			document.getElementById("popup-background").onclick = exit;
		}
		else
			alert("Post Not Found");
	});
}


function removeElementsByClass(root, className){
    var elements = root.getElementsByClassName(className);
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
}

//TODO: This only works for recent dates. Use the more updated version from the other extension.
function parseDate(dateString){
	let atPos = dateString.indexOf("at");
	let date = dateString.substring(0, atPos);
	let time = dateString.substring(atPos + 2);
	return Date.parse(date + time);
}

function packagePost(item, id, url){
	var node = item.cloneNode(true);
	
	let user = node.getAttribute("data-author");
	let date = 123;
	let postNumber = 9999;
	let html = undefined;
	
	let pc = node.getElementsByClassName("primaryContent")[0];
	if (pc){
		let editDate = pc.getElementsByClassName("editDate")[0];
		let signature = pc.getElementsByClassName("signature")[0];
		let messageMeta = pc.getElementsByClassName("messageMeta")[0];
		
		//Set date
		if(messageMeta) {
//			console.log("message found");
			let privateControls = messageMeta.getElementsByClassName("privateControls")[0];
			if (privateControls){
//				console.log("privateControls found");
				let mutedItem = privateControls.getElementsByClassName("muted")[0];
				if (mutedItem){
//					console.log("mutedItem found");
					let datePermalink = mutedItem.getElementsByClassName("datePermalink")[0];
					if (datePermalink){
//						console.log("datePermalink found");
						let dateTime = datePermalink.getElementsByClassName("DateTime")[0];
						if (dateTime){
//							console.log("dateTime found");
							let dateString = dateTime.getAttribute("title");
							if (dateString === null)
								date = (new Date(parseInt(dateTime.getAttribute("data-time") + "000"))).getTime();
							else
								date = parseDate(dateString);
						}
					}
				}
			}
		}
		
		//Set postNum
		let postNumElement = node.getElementsByClassName("postNumber")[0];
		if (postNumElement){
			postNumber = parseInt(postNumElement.innerHTML.substring(1));
		}
		
		if(editDate) pc.removeChild(editDate);
		if(signature) pc.removeChild(signature);
		//if(messageMeta) pc.removeChild(messageMeta);
		if(messageMeta){
			if (messageMeta.getElementsByClassName("publicControls")[0]){
				removeAllButClass(messageMeta.getElementsByClassName("publicControls")[0], "postNumber")
			}
			if (messageMeta.getElementsByClassName("privateControls")[0]){
				removeAllButClass(messageMeta.getElementsByClassName("privateControls")[0], "muted")
			}
			if (messageMeta.getElementsByClassName("DateTime")[0]){
				let tempDate = new Date(date);
				let timeString = tempDate.toLocaleTimeString();
				console.log(timeString);
				messageMeta.getElementsByClassName("DateTime")[0].innerHTML =
					tempDate.toDateString() + " at " + timeString.substring(0, timeString.length -6)
					+ timeString.substring(timeString.length -3);
			}
			//Expand link URLs
			(Array.from(messageMeta.getElementsByTagName("a"))).forEach(function (link){
				let absolute = link.href;
				link.setAttribute("href", absolute);
			});
			
		}
		
	}
	
	//Expand image URLs
	(Array.from(node.getElementsByTagName("img"))).forEach(function (image){
		let absolute = image.src;
		image.setAttribute("src", absolute);
	});
	
	//Strip links from User info
	let userInfo = node.getElementsByClassName("messageUserInfo")[0];
	if (userInfo){
		(Array.from(userInfo.getElementsByTagName("a"))).forEach(function (link){
			link.removeAttribute("href");
		});
	}
	
	//Remove New indicator
	removeElementsByClass(node, "newIndicator");
	
	let wrap = document.createElement('div');
	wrap.appendChild(node);
	html = wrap.innerHTML;

	return {
		id : id,
		user : user,
		date : date,
		html : html,
		number : postNumber,
		type : "pokebeach",
		source: url
	};
}


function parseQTDate(dateString, timeString){
	let pmPos = timeString.indexOf("PM");
	let amPos = timeString.indexOf("AM");
	let atPos = undefined;
	if (pmPos != -1)
		atPos = pmPos;
	else
		atPos = amPos;
	
	timeString = timeString.substring(0, atPos+2);
	let tempDate = new Date(dateString + " " + timeString);
	
	return tempDate.getTime();
}

function packageQTPost(item, id, url, postNumber){
	var node = item.cloneNode(true);
	
	let user = undefined;
	let date = undefined;
	let html = undefined;
	let postNumber = 9999;

	let userNode = node.getElementsByClassName("messageauthor");
	if (userNode) {
		userNode = userNode[0];
		userNode = userNode.childNodes[0];
		user = userNode.data;
	}
	
	let pc = node.getElementsByClassName("topic-messageauthorcontainer");
	if (pc) {
		pc = pc[0];
		let dateNode = pc.getElementsByClassName("messagedata")[0];
		let timeNode = pc.getElementsByClassName("messagedata")[1];
		date = parseQTDate(dateNode.innerHTML, timeNode.innerHTML);
	}
	
	//Strip checkbox from post
	removeElementsByClass(node, "messageMeta");
	removeElementsByClass(node, "topic-messagecontrolsfloat");
	
	//Expand image URLs
	(Array.from(node.getElementsByTagName("img"))).forEach(function (image){
		let absolute = image.getAttribute("src");
		absolute = "https://www.quicktopic.com/" + absolute; //because urls on this site are relative
		image.setAttribute("src", absolute);
	});
	
	
	let wrap = document.createElement('div');
	wrap.appendChild(node);
	html = wrap.innerHTML;

	return {
		id : id,
		user : user,
		date : date,
		html : html,
		number : postNumber,
		type : "qt",
		source : url
	};
}


/**
 * Downloads all new posts from saved urls
 * TODO: Download only pages that have not been fully downloaded yet.
 */
function downloadPosts(){
	chrome.storage.local.get("urls", function(result){
		result = result["urls"];
		result = (result === undefined ? {} : result);
		
		//Variables to define:
		let pageTotal = 0;
		let loadingBar = document.getElementById("loadingBar");
		let toDownload = {}; //Stores num to download in key-value pairs
		let numDownloaded = 0;
		
		//Iterator function
		let currentURL = 0;
		function getNextURL(){
			let url = Object.values(result)[currentURL];
			currentURL = currentURL + 1;
			
			return url;
		}
		
		//Count Num Posts for each URL
		function countNumPosts(callback){
			let url = getNextURL();
			if (!url)
			{
				currentURL = 0;
				return callback();
			}
			
			let currentPage = (!url["currentPage"] ? 1 : url["currentPage"]); //Default page = 1;
			
			getBeachNumPages(url["url"], function(numPages){
				let numUnread = numPages - currentPage + 1; //+1 because we need to read the current page too
				pageTotal = pageTotal + numUnread;
				toDownload[url["url"]] = numUnread;
				countNumPosts(callback);
			})
		}
		
		
		//NOTE:
		//YOU NEED TO QUEUE ALL PAGES SEQUENTIALLY, AND FIGURE OUT HOW TO FREE DATA
		//ELSE, 40 PAGES WILL OPEN AT THE SAME TIME AND BREAK THE SYSTEM.
		
		function downloadEachURL(callback){

			let url = getNextURL();
			console.log("URL Received");
			
			if (!url)
			{
				console.log("End");
				return callback();
			}
			
			console.log(url["type"]);
			
			if (url["type"] == "pokebeach"){
				let currentPage = (!url["currentPage"] ? 1 : url["currentPage"]); //Default page = 1;
				let endPage = toDownload[url["url"]] + currentPage - 1;
				
				function nextPage(){
					let toReturn = currentPage;
					currentPage++;
					
					return toReturn;
				}
				
				function readPage(){
					let pageNumber = nextPage();
					
					console.log (pageNumber + " " + endPage);
					if (pageNumber > endPage){
						//callback
						return downloadEachURL(callback);
					}
					
					console.log("Downloading " + url["url"]+"page-" + pageNumber);
					let site = sequentialGetFile(url["url"]+"page-" + pageNumber, function(site){
						let x = Array.from(site.getElementsByClassName("message"));
						let y = Array.from(site.getElementsByClassName("deleted"));
						let z = Array.from(site.getElementsByClassName("quickReply"));
						x = x.filter(function(e){return this.indexOf(e)<0;},y);
						x = x.filter(function(e){return this.indexOf(e)<0;},z);
						let numToSave = x.length;
						let numSaved = 0;
					  
						chrome.storage.local.get("posts", function(data){
							data = data["posts"];
							if (data === undefined) data = {};
							x.forEach(function (item) {
								let id = item.id;
								data[id] = (data[id] === undefined ? packagePost(item, id, url["url"]) : data[id]);
							});
							
							result[url["url"]]["currentPage"] = pageNumber;
							
							//Save the updated posts list
							chrome.storage.local.set({"posts" : data}, function() {
								//Save the act of reading the page
								chrome.storage.local.set({"urls" : result}, function(){
									console.log(result);
									loadingBar.value = loadingBar.value + 1;
									numDownloaded++;
									document.getElementById("loadingTitle").innerHTML = "Downloaded " + numDownloaded + " of " + pageTotal;
									readPage();
								})
							});
						});
					  });
				  	}
				
				readPage();
			}
			
			else if (url["type"] == "qt")
			{
				console.log("Downloading " + url["url"]+"?m1=-1&mN=-1");
				let site = sequentialGetFile(url["url"]+"?m1=-1&mN=-1", function(site){
					let x = Array.from(site.getElementsByClassName("messagerow"));
					
					let postsToDownload = x.length;
					let postsDownloaded = 0;
					let pathArray = url["url"].split( '/' );
					let chatNumber = pathArray.slice(-1)[0];

					chrome.storage.local.get("posts", function(data){
						
						data = data["posts"];
						if (data === undefined) data = {};
						
						x.forEach(function (item) {
							//Get ID
							let id = undefined;
							let messageNumber = item.getElementsByClassName("messagenumber")[0];
							id = messageNumber.childNodes[0].getAttribute("name");
							let postNumber = id;
							
							id += "-" + chatNumber;
							
							data[id] = (data[id] === undefined ? packageQTPost(item, id, url["url"], postNumber) : data[id]);
					    });
						
						chrome.storage.local.set({"posts" : data}, function() {
							loadingBar.value = loadingBar.value + 1;
							numDownloaded++;
							document.getElementById("loadingTitle").innerHTML = "Downloaded " + numDownloaded + " of " + pageTotal;
							return downloadEachURL(callback);
						});	
					});
				  });
			}
			
			
		}
		
		document.getElementById("loadingPanel").style.display = "block";
		document.getElementById("loadingButton").style.display = "none";
		document.getElementById("loadingTitle").innerHTML = "Preparing Download";
		countNumPosts(function(){
			loadingBar.max = pageTotal;
			loadingBar.value = 0;
			document.getElementById("loadingTitle").innerHTML = "Downloaded 0 of " + pageTotal;
			downloadEachURL(function() {
				//Reset Loading Panel
				document.getElementById("loadingPanel").style.display = "none";
				loadingBar.max = "";
				loadingBar.value = "";
				document.getElementById("loadingButton").style.display = "inline";
				
				outputPosts();
			});
		})
	});
}
/**
 * Checks to see if any urls have been logged so far. 
 * If none, prompts user for site, then downloads all posts
 * @returns
 */
function initialSiteCheck(){
	chrome.storage.local.get("urls", function(result){
		result = result["urls"];
		result = (result === undefined ? {} : result);
		
		//Prompt if empty
		if (Object.keys(result).length === 0 && result.constructor === Object){
			promptUserForSite(false, function(url){
				
				let type = getURLType(url);
				
				if (type == "pokebeach"){
					url = url.substr(0, url.lastIndexOf('/') + 1);
				}
				
				else if (type == "qt"){
					if (url.indexOf('?') !== -1)
						url = url.substr(0, url.indexOf('?'));
				}
				
				//Save url
				result[url] = {url:url, currentPage: null, type: type, version:VERSION};
				chrome.storage.local.set({"urls" : result}, function() {
					//Download Posts
					//alert("hello world");
					downloadPosts();
				});
			})
			}
		}
)
	
}

function removeURL(url, callback){
	chrome.storage.local.get("urls", function(result){
		result = result["urls"];
		result = (result === undefined ? {} : result);
		
		if (result[url]){
			result[url] = undefined;
			chrome.storage.local.set({"urls" : result}, function() {
				
				//Delete all posts with the corresponding url
				chrome.storage.local.get("posts", function(data){
					data = data["posts"];
					if (data === undefined) data = {};
					let copy = Object.values(data).slice();
					
					//Remove objects with source url
					copy.forEach(function(post){
						if (post.source == url)
							data[post.id] = undefined;
					});
					
					chrome.storage.local.set({"posts" : data}, function() {
						callback();
					});
				});					
			});
		}
	});
}

function outputURLs(){
	clearElementById("url-list");

	chrome.storage.local.get("urls", function(result){
		result = result["urls"];
		result = (result === undefined ? {} : result);

		let objArray = Object.values(result);
		
		objArray.forEach(function(value){
			let id = value.url;
			
			let element = document.createElement("DIV");
			element.setAttribute("class", "url");
			let nameLabel = document.createElement("h1");
			nameLabel.innerHTML = value.url;
			element.appendChild(nameLabel);
			
			//add delete button to element
			let deleteButton = document.createElement("button");
			deleteButton.innerHTML = "X";
			deleteButton.setAttribute("class", "delete-button");
			deleteButton.onclick = function(){
				promptUserForConfirmation(true, "Remove this URL? All corresponding posts will be deleted",
						function(){
					removeURL(id, function(){
						outputURLs();
						outputPosts();
					});
				});
			}
			element.appendChild(deleteButton);
			
			document.getElementById("url-list").appendChild(element);
		}
		);
	});
}

// Returns the inner text of a DOM element
//Precondition: @doc is a DOM element
function strip(doc){
	   return doc.textContent || "";
}

/**
 * Should go through posts, adding and saving calculated votes and interations
 * @returns undefined
 */
function analyzePosts(callback){	
	let boldOnly = false;
	chrome.storage.local.get("posts", function(posts){
		posts = posts["posts"];
		posts = (posts === undefined ? {} : posts);
		
		chrome.storage.local.get("users", function(users){
			users = users["users"];
			users = (users === undefined ? {} : users);
			
			let objArray = Object.values(posts);
			objArray.forEach(function(x){
				let messageContent = generatePostContent(x);
				
				let quotes = new Array();
				let tags = new Array();
				let votes = new Array();
				
				//Remove and mark quote notes if pokeBeach
				if(x.type == "pokebeach"){
					let directQuotes = messageContent.getElementsByClassName("bbCodeQuote");
					directQuotes = Array.prototype.slice.call(directQuotes);
					directQuotes.forEach(function(quote){
						quotes.push(quote.getAttribute("data-author"));
						deleteNode(quote);
					});
					
					let indirectQuotes = messageContent.getElementsByClassName("quote");
					indirectQuotes = Array.prototype.slice.call(indirectQuotes);
					indirectQuotes.forEach(function(quote){
						deleteNode(quote);
					});
					
					let tagLinks = messageContent.getElementsByClassName("username");
					tagLinks = Array.prototype.slice.call(tagLinks);
					tagLinks.forEach(function(link){
						tags.push(link.getAttribute("data-user").match(/.*@(.*)/)[1]);
					});
				}
				
				//Look for string to match vote pattern. If bolded option is true, check bolded
				//posts only
				
				let queryText = "";
				if (boldOnly){
					let base = document.createElement("div");
					let boldTexts = messageContent.getElementsByTagName("b");
					boldTexts = Array.prototype.slice.call(boldTexts);
					boldTexts.forEach(function(boldText){
						base.appendChild(boldText);
					});
					queryText = strip(base);
				}
				else
					queryText = strip(messageContent);
				
				//TODO get array of matches to the vote pattern
				let VOTE_STRING = "##VOTE: *\\w+";
				let UNVOTE_STRING = "##UNVOTE:?";
				let VOTE_CAPTURE_STRING = "^##VOTE: *(\\w+)$";
				
				let votePattern = new RegExp(VOTE_STRING, "gmi");
				let voteCapturePattern = new RegExp(VOTE_CAPTURE_STRING, "gmi");
				let unvotePattern = new RegExp(UNVOTE_STRING, "gmi");
				let actionPattern = new RegExp(VOTE_STRING + "|" + UNVOTE_STRING, "gmi");
				
				let matches = queryText.match(actionPattern);
				for (let i = 0; matches && i < matches.length; i++){
					let match = matches[i];
					let target = voteCapturePattern.exec(match);
					if (target){
						votes.push(new VoteRequest(false, target[1], true, false));
					}
					else if (unvotePattern.test(match)){
						votes.push(new VoteRequest(true, null, true, false));
					}
				}
				
				x.quotes = quotes;
				x.tags = tags;
				x.votes = votes;				
			});
			
			chrome.storage.local.set({"posts" : posts}, function() {
				if (typeof(callback) === "function") 
					callback();
			});
		});			
	});	
}

//Counts the number of function votes in a voteArray
function countVoteArray(voteArray){
	let count = 0;
	voteArray.forEach(function(vote){
		if (!vote.negatedBy)
			count++;
	});
	return count;
}

function outputVotes(){
	clearElementById("vote-count");
	chrome.storage.local.get("posts", function(result){
		result = result["posts"];
		result = (result === undefined ? {} : result);
		
		chrome.storage.local.get("users", function(usersTable){
			usersTable = usersTable["users"];
			usersTable = (usersTable === undefined ? {} : usersTable);
			
			let objArray = Object.values(result);
			
			objArray.sort(function(a, b){
				if (a.date > b.date) return 1;
				else if (a.date === b.date) return 0;
				else return -1;
			})
			
			let userStates = createUserHashTable(usersTable);
			let targets = createUserHashTable(usersTable);
			let dayStartPost = null;
			let votesByDay = [];
			
			objArray.forEach(function(post){
				//reset vote count if new day
				if (post.dayStart){
					if (dayStartPost != null)
						votesByDay.push(targets);
					userStates = createUserHashTable(usersTable);
					targets = createUserHashTable(usersTable);
					dayStartPost = post;
				}
				//Handle each vote
				let votes = compileVotes(post);
				votes.forEach(function(vote){
					//Check Type of Vote
					//Cancel existing vote if unvote
					if (vote.unvote){
						if (userStates[post.user] != null){
							let target = userStates[post.user].target;
							if (targets[target]){
								targets[target].forEach(function(targetVote){
									if (!(targetVote.negatedBy) && targetVote.user == post.user){
										targetVote.negatedBy = vote;
									}
								});
								userStates[post.user] = null;
							}
						}
					}
					else{
						//Add vote if no vote
						if (userStates[post.user] == null){
							let newVote = new FinalVote(false, vote.target, post.user, post);
							if (!targets[vote.target]) targets[vote.target] = [];
							targets[vote.target].push(newVote);
							userStates[post.user] = newVote;
						}
						//Create useless vote if already voting
						else{
							let newVote = new FinalVote(false, vote.target, post.user, post, userStates[post.user], true);
							if (!targets[vote.target]) targets[vote.target] = [];
							targets[vote.target].push(newVote);
						}
					}
				})
			});
			votesByDay.push(targets);
			console.log(votesByDay);
			//Actual printing of votes goes here
			for (let i = 0; i < votesByDay.length; i++){
				document.getElementById("vote-count").appendChild(generateVoteCount(votesByDay[i], "Day " + (i + 1) + " Vote Count"));
			}
		});
		
	});

}
//Set Radio Buttons
document.getElementById("type-all"). onclick = function(){
	chosenRadioFilter = allFilter;
	outputPosts();
}

document.getElementById("type-pokebeach"). onclick = function(){
	chosenRadioFilter = pokebeachOnlyFilter;
	outputPosts();		
}

document.getElementById("type-qt"). onclick = function(){
	chosenRadioFilter = qtOnlyFilter;
	outputPosts();
}

document.getElementById("posted-by").onchange = function(){
	postedBy = document.getElementById("posted-by").value;
	if (postedBy === "")
		postedBy = undefined;
	outputPosts();
}

document.getElementById("import-players").onclick = function(){
	update_users(function() {outputUsers();});
}

document.getElementById("messages-tab").onclick = function(){visibility_switch("messages-tab", "messages-page")};
document.getElementById("players-tab").onclick = function(){visibility_switch("players-tab", "player-page")};
document.getElementById("factions-tab").onclick = function(){visibility_switch("factions-tab", "factions")};
document.getElementById("analysis-tab").onclick = function(){visibility_switch("analysis-tab", "analysis-page")};
document.getElementById("settings-tab").onclick = function(){visibility_switch("settings-tab", "settings-page")};

document.getElementById("clear-button").onclick = function(){promptUserForConfirmation(true, 
		"Clear All Data? Warning: This cannot be undone. No take-backsies!", function(){chrome.storage.local.clear(function(){
			location.reload();
		});
	});
}

document.getElementById("add-url-button").onclick = function(){
	promptUserForSite(true, function(url){	
		chrome.storage.local.get("urls", function(result){
			result = result["urls"];
			result = (result === undefined ? {} : result);
				
			let type = getURLType(url);
			
			if (type == "pokebeach"){
				url = url.substr(0, url.lastIndexOf('/') + 1);
			}
			
			else if (type == "qt"){
				if (url.indexOf('?') !== -1)
					url = url.substr(0, url.indexOf('?'));
			}
			
			//Save url
			result[url] = {url:url, currentPage: null, type: type, version:VERSION};
			chrome.storage.local.set({"urls" : result}, function() {
				//Download Posts
				outputURLs();
				downloadPosts();
			});
		});
	})
}

document.getElementById("loadingButton").onclick = downloadPosts;

document.getElementById("analysis-button").onclick = function(){
	analyzePosts(function(){
		outputVotes();
	});
}

window.addEventListener('scroll', function(event)
{
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
        // you're at the bottom of the page
    	console.log("Bottom");
    	outputSomeQueuedPosts();
    }
});

//SET DEFAULTS
chosenRadioFilter = allFilter;
updatePostedByChoices();

visibility_switch("messages-tab", "messages-page");
chrome.storage.local.get(function(result){console.log(result)});
outputPosts();
outputUsers();
outputFactions();
initialSiteCheck();
outputURLs();
