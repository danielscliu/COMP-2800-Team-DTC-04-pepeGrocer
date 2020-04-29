const express = require("express");
const app = express();


app.use(express.static(__dirname + "/public"));

app.get("/", function(req, res) {
    res.send("Hello Heroku")
})





app.listen(process.env.PORT || 3000, 
    () => console.log("Express server running"));