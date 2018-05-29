chrome.storage.local.get(function(result){console.log(result)})

function removeElementsByClass(root, className){
    var elements = root.getElementsByClassName(className);
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
}
function parseDate(dateString){
	let atPos = dateString.indexOf("at");
	let date = dateString.substring(0, atPos);
	let time = dateString.substring(atPos + 2);
	return Date.parse(date + time) / 1000;
}

function packagePost(item, id){
	var node = item.cloneNode(true);
	
	let user = node.getAttribute("data-author");
	let date = 123;
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
							let dateString = dateTime.getAttribute("title");// + 
											 //dateTime.getAttribute("data-timestring");
							date = parseDate(dateString);
						}
					}
				}
			}
		}
		
		if(editDate) pc.removeChild(editDate);
		if(signature) pc.removeChild(signature);
		if(messageMeta) pc.removeChild(messageMeta);
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
		type : "pokebeach"
	};
}

let x = Array.from(document.getElementsByClassName("message"));


x.forEach(function (item) {
	let id = item.id;

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
	
	//Mark as important if id is already in the storage
	chrome.storage.local.get("posts", function(data){
		data = data["posts"];
		if (data !== undefined && typeof data[id] !== 'undefined') {
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
					data[id] = packagePost(item, id);
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
	
	let pc = item.getElementsByClassName("primaryContent")[0];
	if (pc){
		let mm = pc.getElementsByClassName("messageMeta")[0];
		if (mm){
			let publicControls = mm.getElementsByClassName("publicControls")[0];
			if (publicControls)
			{
				publicControls.appendChild(label);
				publicControls.appendChild(label2);
				publicControls.getElementsByClassName("important-label")[0]
					.getElementsByClassName("important-checkbox")[0]
					.onchange = function() {onChange(this);};
			}
		}
	}
		
		
		
})
