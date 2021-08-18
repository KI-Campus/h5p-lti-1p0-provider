var xAPICompleteListener = function (event) {
  if (
    (event.getVerb() === "completed" || event.getVerb() === "answered") &&
    !event.getVerifiedStatementValue(["context", "contextActivities", "parent"])
  ) {
    var score = event.getScore();
    var maxScore = event.getMaxScore();
    var ratio = score / maxScore;

    var request = new XMLHttpRequest();
    request.open("GET", "/api/outcome?score=" + ratio, true);

    request.onload = function () {
      if (this.status < 200 || this.status >= 400) {
        window.console && console.log("failed");
      }
    };
    request.onerror = function () {
      window.console && console.log("failed");
    };
    request.send();
  }

  // Send xAPI data to LRS
  var request_lrs = new XMLHttpRequest();
  request_lrs.open("POST", '../send_to_lrs', true);
  request_lrs.setRequestHeader("Content-Type", "application/json");
  request_lrs.send(JSON.stringify(event));
};

if (H5P) {
  H5P.externalDispatcher.on("xAPI", xAPICompleteListener);
}
