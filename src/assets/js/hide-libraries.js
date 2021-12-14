
H5P.jQuery(document).ready(function () {
    var hideExercises = [];
    var exercisesFound = false;
    var hideExercisesTimer = null;

    // This script forces to click on Check button when there is click on the Finish (For QuestionSet Exercises)



    // Check if there is H5P initialized
    if (H5P) {

        // Do a fetch to get exercises that need to be hidden
        fetch('/h5p/getconfig') // Call the getconfig endpoint
            .then(response => response.json()) // Parse the response as JSON
            .then(data => {
                if (data.result.length > 0) {
                    if (JSON.parse(data.result).hideExercises) {
                        hideExercises = JSON.parse(data.result).hideExercises;

                        // Start the timer
                        hideExercisesTimer = setInterval(function () {

                            var container = document.getElementsByClassName("content-type-list")[0];

                            if (container) {
                                let listOfExercises = container.children[0];
                                // Loop through listOfExercises and hide the ones we want
                                for (let i = 0; i < listOfExercises.children.length; i++) {
                                    let exercise = listOfExercises.children[i];
                                    for (let j = 0; j < hideExercises.length; j++) {
                                        if (exercise.id == hideExercises[j]) {
                                            exercise.style.display = "none";
                                        }
                                    }
                                }
                                console.log("Exercises found, clearing timer");
                                clearInterval(hideExercisesTimer);
                            }


                        }, 500);
                    }
                }
            }
            ).catch(error => {
                console.log("Error while fetching getconfig endpoint", error);
            });


        // // Attach a mutation observer to check for any DOM changes and see if we have any check and finish buttons appearing
        // // Callback function when changes occurs
        // function callback(mutationRecord, observer) {

        //     //hideExercises = ["h5p-interactivevideo", "h5p-coursepresentation"];

        //     var container = document.getElementsByClassName("content-type-list")[0];

        //     if (container) {
        //         let listOfExercises = container.children[0];
        //         // Loop through listOfExercises and hide the ones we want
        //         for (let i = 0; i < listOfExercises.children.length; i++) {
        //             let exercise = listOfExercises.children[i];
        //             for (let j = 0; j < hideExercises.length; j++) {
        //                 if (exercise.id == hideExercises[j]) {
        //                     exercise.style.display = "none";
        //                 }
        //             }
        //         }

        //     }


        // }

        // // Create a new instance of MutationObserver with callback in params
        // const observer = new MutationObserver(callback);

        // // Setup config
        // const config = {
        //     childList: true,
        //     attributes: true,
        //     characterData: true,
        //     subtree: true,
        // };

        // let container = document.documentElement || document.body;
        // observer.observe(container, config);

    }
});