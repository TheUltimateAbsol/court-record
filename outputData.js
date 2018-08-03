//chrome.storage.local.clear();
let VERSION = 1.2;
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
		          if (callback !== undefined) callback();
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
			
			objArray.forEach(function(value){
				let id = value.id;
				
				let element = htmlToElement(value.html);
				if (value.type == "pokebeach"){
					let ol = document.createElement("ol");
					ol.setAttribute("class", "messageList");
					ol.appendChild(element);
					element = ol;
				}
				else if (value.type == "qt"){
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
				
				//add delete button to element
				/* let deleteButton = document.createElement("button");
				deleteButton.innerHTML = "X";
				deleteButton.setAttribute("class", "delete-button");
				deleteButton.onclick = function(){
					document.getElementById("posts").removeChild(element);
					chrome.storage.local.get("posts", function(data){
						data = data["posts"];
						if (data === undefined) data = {};
						data[id] = undefined;
						chrome.storage.local.set({"posts" : data}, function() {
							  item.classList.remove("important");
					          console.log(id + ' removed from storage!');
						});
			    });
				}
				element.appendChild(deleteButton); */
				
				document.getElementById("posts").appendChild(element);
			});
		});
		
	});
}

function isValidURL(string){
	let urlPattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
			  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
			  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
			  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
			  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
			  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
	
	let beachSnippet = "pokebeach.com/forums/threads/";
	let match = urlPattern.test(string);
	
	console.log(string.includes(beachSnippet));
	
	if (match)
		if (string.includes(beachSnippet))
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
 * @param callback a function that is ran after the input is received
 * @returns null
 */
function promptUserForSite(callback){
	document.getElementById("popup").style.display = "flex";
	document.getElementById("url-entry-popup-form").style.display = "block";
	
	document.getElementById("url-entry-popup-form").onsubmit = function() {
		if (isValidURL(document.getElementById("url-entry-popup-text").value))
		{
			console.log("Good URL")
			document.getElementById("popup").style.display = "none";
			document.getElementById("url-entry-popup-form").style.display = "none";
			callback(document.getElementById("url-entry-popup-text").value);
		}
		else
		{
			console.log("Bad URL");
			alert("Not a valid PokeBeach or QuickTopic URL");
		}
	}
}

/**
 * Downloads all new posts from saved urls
 */
function downloadPosts(){
	chrome.storage.local.get("urls", function(result){
		result = result["urls"];
		result = (result === undefined ? {} : result);
		
		//Variables to define:
		let pageTotal = 0;
		let loadingBar = document.getElementById("loadingBar");
		
		//Iterator function
		let currentURL = 0;
		function getNextURL(){
			let url = Object.values(result)[currentURL];
			if (url) url = url["url"]; //Get the real value if not null.
			currentURL = currentURL + 1;
			
			return url;
		}
		
		//Count Num Posts for each URL
		function countNumPosts(callback){
			let url = getNextURL();
			if (!url)
			{
				currentURL = 0;
				callback();
			}
			console.log(url);
			
			getBeachNumPages(url, function(numPages){
				pageTotal = pageTotal + numPages;
				countNumPosts(callback);
			})
		}
		
		countNumPosts(function(){
			loadingBar.max = pageTotal;
			loadingBar.value = 0;
			document.getElementById("loadingTitle").innerHTML = "Downloaded 0 of " + pageTotal;
		})
	});
	/*
	  let start = document.getElementById("start").value;
	  let end = document.getElementById("end").value;
	  
	  //Switch out display elements
	  let progress = document.getElementById("master-load");
	  progress.style.display = "block";
	  progress.max = end - start + 1;
	  this.style.display = "none";
	  progress.onchange = function(){
		  console.log("HELLO WORLD");
		if (progress.position === 1)
			console.log("DONE");
	  }
	  
	  for (let i = start; i <= end; i++ ){
		  let site = getFile(url+"page-" + i, function(site){
			  let x = Array.from(site.getElementsByClassName("message"));
			  let y = Array.from(site.getElementsByClassName("deleted"));
			  let z = Array.from(site.getElementsByClassName("quickReply"));
			  x = x.filter(function(e){return this.indexOf(e)<0;},y);
			  x = x.filter(function(e){return this.indexOf(e)<0;},z);
			  
			  let subProgress = document.createElement("progress");
			  subProgress.classList.add("minorProgress");
			  document.getElementById("sub-load").appendChild(subProgress);
			  
			  subProgress.max = x.length;
			  
			  x.forEach(function (item) {
			  	let id = item.id;
			  	
				chrome.storage.local.set({[id] : packagePost(item, id)}, function() {
					//TODO when message is recorded
					subProgress.value++;
					if (subProgress.position === 1)
					{
						document.getElementById("master-load").value++;
						if(document.getElementById("master-load").position === 1) onFinish();
					}
						
					//console.log (id + " saved!")
				});
			  })
			  
			  
		  });*/
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
			promptUserForSite(function(url){
				//Trim url
				url = url.substr(0, url.lastIndexOf('/') + 1);
				//Save url
				result[url] = {url:url, current: null, version:VERSION};
				chrome.storage.local.set({"urls" : result}, function() {
					//Download Posts
					//TODO
					//Tell whether a url is qt or pokebeach
					//Use popupJs to download all posts off of the provided URL
					
					downloadPosts();
				});
			})
			}
		}
)
	
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
document.getElementById("settings-tab").onclick = function(){visibility_switch("settings-tab", "settings-page")};

document.getElementById("clear-button").onclick = function(){chrome.storage.local.clear(function(){
	outputPosts();
	outputUsers();
	outputFactions();
});};


//SET DEFAULTS
chosenRadioFilter = allFilter;
updatePostedByChoices();

visibility_switch("messages-tab", "messages-page");
chrome.storage.local.get(function(result){console.log(result)});
outputPosts();
outputUsers();
outputFactions();
initialSiteCheck();
downloadPosts();