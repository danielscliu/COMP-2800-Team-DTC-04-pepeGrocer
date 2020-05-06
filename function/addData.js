const express = require("express");
// const functions = require('firebase-functions');

const app = express();
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




//Write store name data
//When maps available, dictionary of stores NEED to be long+lat or unique or group search


let storesRef = db.collection("stores");

let set1 = storesRef.doc("costco downtown").set({
    Name: "Costco Downtown",
    Address: "605 Expo Blvd, Vancouver, BC V6B 1V4",
    WaitTime: 5
});
let set2 = storesRef.doc("Costco Willingdon").set({
    Name: "Costco Willingdon",
    Address: "4500 Still Creek RD, Burnaby, BC V5C 0B5",
    WaitTime: 5
});
let set3 = storesRef.doc("Costco Richmond").set({
    Name: "Costco Richmond",
    Address: "9151 Bridgeport Rd, Richmond, BC V6X 3L9",
    WaitTime: 5
});
let set4 = storesRef.doc("Safeway Robson").set({
    Name: "Safeway Robson",
    Address: "1766 Robson St, Vancouver, BC V6G 1E2",
    WaitTime: 5
});
let set5 = storesRef.doc("Osaka Supermarket").set({
    Name: "Osaka Supermarket",
    Address: "605 Expo Blvd, Vancouver, BC V6B 1V4",
    WaitTime: 5
});

let storeList = [set1, set2, set3, set4, set5];



// let storesRef = db.collection('stores');
// let allStores = storesRef.get()
//     .then(snapshot => {
//         snapshot.forEach(doc =>{
//             console.log(doc.id, "==>", doc.data());
//         });
//     })

// app.listen(8080);

app.listen(process.env.PORT || 3000,
    () => console.log("Express function running"));