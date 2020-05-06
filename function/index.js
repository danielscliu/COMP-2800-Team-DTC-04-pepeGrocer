var admin = require("firebase-admin");
const express = require("express");
const app = express();
const path = require("path");

// Firebase init

// Fetch the service account key JSON file contents
var serviceAccount = require("./firebaetest-6e21a-firebase-adminsdk-oiexo-d634330287.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://firebaetest-6e21a.firebaseio.com"
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = admin.firestore();

// app.use(express.static(__dirname + "/public"));
app.get("/", function(req, res) {
    res.sendFile(path.resolve("public/fireBase.html"));
})

app.get("/test", function(req, res) {
    res.sendFile(path.resolve("public/persistTest.html"));
})

function verifyIdentity(idToken) {
    // idToken comes from the client app
    admin.auth().verifyIdToken(idToken)
        .then(function(decodedToken) {
            let uid = decodedToken.uid;
            return true;
        }).catch(function(error) {
        console.log("Not signed in");
            return false;
    });
}

// app.listen(8080);

app.listen(process.env.PORT || 3000,
    () => console.log("Express function running"));