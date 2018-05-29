//chrome.storage.local.clear();

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
function update_users(){
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
			});
		});
	});
}

function visibility_switch(id) {

    /* If the ID of allmessages is passed, hide the IDs of the other boxes */
    if(id == 'allmessages') {
    	document.getElementById('allmessages').style.display = "block";
    	document.getElementById('players').style.display = "none";    	
    }
    
	 /* If the ID of players is passed, hide the IDs of the other boxes */
	if(id == 'players') {
    	document.getElementById('players').style.display = "block";
    	document.getElementById('allmessages').style.display = "none";
    }    
}

function outputUsers(){
	chrome.storage.local.get("users", function(result){
		result = result["users"];
		result = (result === undefined ? {} : result);

		let objArray = Object.values(result);
		
		objArray.forEach(function(value){
			let element = document.createTextNode(value.name);
			document.getElementById("players").appendChild(element);
		}
		);
	});
}

function outputPosts(){
	clearElementById("allmessages");
	
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
				let deleteButton = document.createElement("button");
				deleteButton.innerHTML = "X";
				deleteButton.setAttribute("class", "delete-button");
				deleteButton.onclick = function(){
					document.getElementById("allmessages").removeChild(element);
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
				element.appendChild(deleteButton);
				
				document.getElementById("allmessages").appendChild(element);
			});
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
document.getElementById("messages-tab").onclick = function(){visibility_switch("allmessages")};
document.getElementById("players-tab").onclick = function(){visibility_switch("players")};

//SET DEFAULTS
chosenRadioFilter = allFilter;
updatePostedByChoices();

update_users();
chrome.storage.local.get(function(result){console.log(result)});
outputPosts();
outputUsers();