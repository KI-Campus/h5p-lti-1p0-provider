H5P.jQuery(document).ready(function () {
    // This script forces to click on Check button when there is click on the Finish (For QuestionSet Exercises)

    let finishButtonEventListener;

    // Check if there is H5P initialized
    if (H5P) {

        // Attach a mutation observer to check for any DOM changes and see if we have any check and finish buttons appearing
        // Callback function when changes occurs
        function callback(mutationRecord, observer) {
            // Remove the event listener
            if (finishButtonEventListener) { document.getElementsByClassName("h5p-question-finish")[0].removeEventListener(finishButtonEventListener) }

            // Add event listener to finish button
            try {
                finishButtonEventListener = document.getElementsByClassName("h5p-question-finish")[0].addEventListener("click", function () {
                    console.log("Finish button pressed");
                    let checkButtons = document.getElementsByClassName("h5p-question-check-answer");
                    for (let index = 0; index < checkButtons.length; index++) {
                        const btn = checkButtons[index];
                        btn.click();
                    }
                })
            }
            catch (err) {
                console.log("error:", err);
            }

        }

        // Create a new instance of MutationObserver with callback in params
        const observer = new MutationObserver(callback);

        // Setup config
        const config = {
            childList: true,
            attributes: true,
            characterData: true,
            subtree: true,
        };

        let container = document.documentElement || document.body;
        observer.observe(container, config);

    }
});


