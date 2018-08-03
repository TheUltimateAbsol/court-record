var pageHeader = document.getElementsByClassName("pageNavHeader");
var re = /Page \d+ of (\d+)/i;

if (pageHeader.length === 0)
	1
else {
	pageHeader = pageHeader[0];
	rawString = pageHeader.innerHTML;
	var numPages = rawString.match(re)[1];
	numPages
}