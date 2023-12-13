const express = require("express");
const { exec } = require("child_process");

const router = express.Router();

// Your other Express middleware and configurations...
router.get("/", async (req, res) => {
    res.render("admin/tasks/index", { title: "tasks" });
});
// Define a route to trigger the Node.js script
router.get("/n3rgy", (req, res) => {
    // Execute the Node.js script using the child_process.exec method
    exec("node ./tasks/n3rgy.js", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing the script: ${error}`);
            return res.status(500).send("An error occurred while running the script.");
        }
        console.log(`Script output: ${stdout}`);
        res.send("Script executed successfully.");
    });
});

router.get("/starling", (req, res) => {
    // Execute the Node.js script using the child_process.exec method
    exec("node ./tasks/starling.js", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing the script: ${error}`);
            return res.status(500).send("An error occurred while running the script.");
        }
        console.log(`Script output: ${stdout}`);
        res.send("Script executed successfully.");
    });
});

module.exports = router;
