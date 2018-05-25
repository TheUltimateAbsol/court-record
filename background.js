chrome.browserAction.onClicked.addListener(function(activeTab){
  var file = "index.html";
  chrome.tabs.create({ url: chrome.extension.getURL(file) });
});