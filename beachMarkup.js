let x = Array.from(document.getElementsByClassName("message"));
x.forEach(function (item) {
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

	
	//Checkbox functionality (Will be set once added)
	function onChange(box){
		if (box.checked){
			item.classList.add("important");
		}
		else{
			item.classList.remove("important");
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
