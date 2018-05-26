chrome.storage.local.get(function(result){console.log(result)});
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

function outputPosts(filterFunc){
	chrome.storage.local.get("posts", function(result){
		result = result["posts"];
		result = (result === undefined ? {} : result);
		if (filterFunc === undefined){
			filterFunc = function() {return true;};
		}
		
		let objArray = Object.values(result);
		objArray = objArray.filter(filterFunc);
		
		objArray.sort(function(a, b){
			if (a.date > b.date) return 1;
			else if (a.date === b.date) return 0;
			else return -1;
		})
		
		
		
		objArray.forEach(function(value){
			let element = htmlToElement(value.html);
			if (value.type == "pokebeach"){
				let ol = document.createElement("ol");
				ol.setAttribute("class", "messageList");
				ol.appendChild(element);
				document.getElementById("allmessages").appendChild(ol);
			}
			else if (value.type == "qt"){
				let table = document.createElement("table");
				table.setAttribute("width", "100%");
				let tbody = document.createElement("tbody");
				tbody.appendChild(element);
				table.appendChild(element);
				document.getElementById("allmessages").appendChild(table);
			}
		}
		);
	});
}

outputPosts();

document.getElementById("type-all"). onclick = function(){
	let messages = document.getElementById("allmessages");
	while (messages.firstChild) {
		messages.removeChild(messages.firstChild);
	}
	
	outputPosts();
}

document.getElementById("type-pokebeach"). onclick = function(){
	let messages = document.getElementById("allmessages");
	while (messages.firstChild) {
		messages.removeChild(messages.firstChild);
	}
	
	outputPosts(function(post){
		if (post.type == "pokebeach")
			return true;
		return false;
	});
}

document.getElementById("type-qt"). onclick = function(){
	let messages = document.getElementById("allmessages");
	while (messages.firstChild) {
		messages.removeChild(messages.firstChild);
	}
	
	outputPosts(function(post){
		if (post.type == "qt")
			return true;
		return false;
	});
}
