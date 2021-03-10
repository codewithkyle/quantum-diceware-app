const ghPages = require("gh-pages");

const NAME = "codewithkyle";
const EMAIL = "codingwithkyle@gmail.com";
const USERNAME = "codewithkyle";
const PROJECT = "quantum-diceware-app";

ghPages.publish(
    "public",
    {
        user: {
            name: NAME,
            email: EMAIL,
        },
        repo: "https://" + process.env.ACCESS_TOKEN + "@github.com/" + USERNAME + "/" + PROJECT + ".git",
        silent: true,
    },
    (error) => {
        if (error) {
            console.log(error);
        }
    }
);