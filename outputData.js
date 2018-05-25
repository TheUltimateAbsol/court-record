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

chrome.storage.local.get(function(result){
	
	let objArray = Object.values(result);
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