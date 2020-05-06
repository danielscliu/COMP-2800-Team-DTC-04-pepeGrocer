const express = require("express");
// const functions = require('firebase-functions');
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");
// Firebase init


//--new 
var admin = require("firebase-admin");

// Fetch the service account key JSON file contents
var serviceAccount = require("./firebaetest-6e21a-firebase-adminsdk-oiexo-d634330287.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://firebaetest-6e21a.firebaseio.com"
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = admin.firestore();
// Simple Read:
// let storesRef = db.collection('stores');
// let allStores = storesRef.get()
//     .then(snapshot => {
//         snapshot.forEach(doc =>{
//             console.log(doc.id, "==>", doc.data());
//         });

//     })

let stores = db.collection('stores');
let targetItem = 'banana'

// Search by Item
let query = stores.where(targetItem, '==', true).get()
  .then(snapshot => {
    if (snapshot.empty) {
      console.log('ooof looks like everything out of stock');
      return;
    }  

    snapshot.forEach(doc => {
      console.log(`the following stores contain ${targetItem}`)
      console.log(doc.id);
    });
  })
  .catch(err => {
    console.log('Error getting documents', err);
  });


  
  



app.use(cookieParser());

// app.use(express.static(__dirname + "/public"));
app.get("/", function(req, res) {
    res.sendFile(path.resolve("../public/fireBase.html"));
})


app.get("/search", (req, res)=> res.render("pages/searchByIngredients"));

// app.listen(8080);

app.listen(process.env.PORT || 3000,
    () => console.log("Express function running"));