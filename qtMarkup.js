chrome.storage.local.get(function(result){console.log(result)})
//chrome.storage.local.clear();

function removeElementsByClass(root, className){
    var elements = root.getElementsByClassName(className);
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
}

function parseDate(dateString, timeString){
	let pmPos = timeString.indexOf("PM");
	let amPos = timeString.indexOf("AM");
	let atPos = undefined;
	if (pmPos != -1)
		atPos = pmPos;
	else
		atPos = amPos;
	
	timeString = timeString.substring(0, atPos+2);
	let tempDate = new Date(dateString + " " + timeString);
	
	return tempDate.getTime() / 1000;
}

function packagePost(item){
	var node = item.cloneNode(true);
	
	let user = undefined;
	let date = undefined;
	let html = undefined;

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
		date = parseDate(dateNode.innerHTML, timeNode.innerHTML);
	}
	
	//Strip checkbox from post
	removeElementsByClass(node, "messageMeta");
	removeElementsByClass(node, "topic-messagecontrolsfloat");
	
	//Expand image URLs
	(Array.from(node.getElementsByTagName("img"))).forEach(function (image){
		let absolute = image.src;
		image.setAttribute("src", absolute);
	});
	
	
	let wrap = document.createElement('div');
	wrap.appendChild(node);
	html = wrap.innerHTML;

	return {
		user : user,
		date : date,
		html : html,
		type : "qt"
	};
}

let x = Array.from(document.getElementsByClassName("messagerow"));


x.forEach(function (item) {
	//Get ID
	let id = undefined;
	let messageNumber = item.getElementsByClassName("messagenumber")[0];
	id = messageNumber.childNodes[0].getAttribute("name");
	
	let pathArray = window.location.pathname.split( '/' );
	let chatNumber = pathArray.slice(-1)[0];
	
	id += "-" + chatNumber;

	//create Checkbox
	let check = document.createElement("INPUT");
	check.setAttribute("type", "checkbox");
	check.classList.add("important-checkbox");
	
	let label = document.createElement("span");
	label.classList.add("item");
	label.appendChild(document.createTextNode("Important: "));
	
	let label2 = document.createElement("span");
	label2.classList.add("important-label");
	label2.classList.add("item");
	label2.appendChild(check);
	
	let div = document.createElement("DIV");
	div.classList.add("messageMeta");
	div.appendChild(label);
	div.appendChild(label2);
	
	//Mark as important if id is already in the storage
	chrome.storage.local.get("posts", function(data){
		data = data["posts"];
		if (typeof data[id] !== 'undefined') {
			item.classList.add("important");
			check.checked = true;
		}
	});
	
	//Checkbox functionality (Will be set once added)
	function onChange(box){
		if (box.checked){
			  chrome.storage.local.get("posts", function(data){
					data = data["posts"];
					if (data === undefined) data = {};
					data[id] = packagePost(item);
					console.log(data);
					chrome.storage.local.set({"posts" : data}, function() {
						item.classList.add("important");
						check.checked = true;
					});
		    });
		}
		else{
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
	};
	
	let messagecell = item.getElementsByClassName("messagecell")[0];
	if (messagecell){
		messagecell.appendChild(div);
		messagecell.getElementsByClassName("important-label")[0]
			.getElementsByClassName("important-checkbox")[0]
			.onchange = function() {
				onChange(this);
			};
	}
		
})
