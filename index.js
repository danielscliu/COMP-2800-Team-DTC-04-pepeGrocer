const express = require("express");
// const functions = require('firebase-functions');
const path = require("path");

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
let inStockBoolean = false;

function storeSummary(name, address, waittime) {
    this.name = name;
    this.address = address;
    this.waittime = waittime;
}

let itemStockBoolean;
// function search by Item
function queryItem(targetItem) {
    let stores = db.collection('stores');
    var storesInStock = new Array();

    let query = stores.where(targetItem, '==', true).get()

        .then(snapshot => {
            if (snapshot.empty) {
                console.log('ooof looks like everything out of stock');
                itemStockBoolean = false;
                return;
            }
            snapshot.forEach(doc => {
                //console.log(`the following stores contain ${targetItem} is at location: `)
                let address = doc.get("Address")
                let name = doc.get("Name")
                let waittime = doc.get("WaitTime")
                inStock = new storeSummary(name, address, waittime)


                //console.log(inStock);

                storesInStock.push(inStock);
                //console.log(storesInStock)
                // name = doc.get('Name')
                // address = doc.get('Address')
                // waitTime = doc.get('WaitTime')
                // let thisStore = new storeSummary(name, address, waittime)
                // stores.push(storesInStock);
            itemStockBoolean = true;

            });
            ;
        }, console.log(storesInStock))


    // .catch(err => {
    //   console.log('Error getting documents', err);
    // });


}

function storeArr(item, Array) {
    Array.push(item)
}

app.post("/searchByIngredients", async(req, res) => {
    console.log("searched");
        let targetItem = req.body.ingredients;
        await queryItem(targetItem);
        if (inStockBoolean) {
            res.render("pages/searchByIngredients", {notFound: " "});
        } else {
            res.render("pages/searchByIngredients", {notFound: "Sorry we couldn't find your item"});
        }
});


// app.use(express.static(__dirname + "/public"));
app.get("/", function (req, res) {
    res.sendFile(path.resolve("public/fireBase.html"));
});


app.get("/search", (req, res) =>
    res.render("pages/searchByIngredients", {notFound: " "}));


app.listen(process.env.PORT || 3000,
    () => console.log("Express function running"));