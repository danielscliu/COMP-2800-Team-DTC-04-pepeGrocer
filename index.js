const express = require("express");
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

// QUERY BY ITEM LOGIC
let itemStockBoolean = true;
let storeInStock = [];
function queryItem(targetItem) {
    storeInStock = [];
    let stores = db.collection('stores');
    itemStockBoolean = false;
    stores.where(targetItem, '==', true).get()

        .then(async snapshot => {
            if (snapshot.empty) {
                console.log('ooof looks like everything out of stock');
                itemStockBoolean = false;
                return;
            }
            itemStockBoolean = true;
            await snapshotAsync(snapshot);
            // return storesInStock;
        })
        .then(console.log(storeInStock))
}

function snapshotAsync(snap) {

    //console.log(snap);
    snap.forEach(doc => {
        //console.log(typeof(doc));
        //console.log(`the following stores contain ${targetItem} is at location: `)
        // let address = doc.get("Address");
        // let name = doc.get("Name");
        // let waitTime = doc.get("WaitTime");
        // inStock= new storeSummary(name, address, waitTime);
        // itemStockBoolean = true;
        // console.log(inStock);
        storeInStock.push(new storeSummary(doc.get("Name"), doc.get("Address"), doc.get("WaitTime")))
    })
    //console.log(storeInStock)
}

function storeSummary(name, address, waitTime) {
    this.name = name;
    this.address = address;
    this.waitTime = waitTime;
}

// POST TO SEARCH INGREDIENTS
app.post("/searchByIngredients", (req, res) => {
    let targetItem = req.body.ingredients;
    // clear the list of stores, otherwise they will append all the stores to list
    queryItem(targetItem);
    // can't get async working here for query item so we're just gonna take a nap for 500 ms
    setTimeout(function () {
        res.render("pages/searchByIngredients", {stores: storeInStock, itemStockBoolean: itemStockBoolean})
    }, 500)
});

// ROUTE TO FIREBASEUI LOGIN
app.get("/fLogin", function (req, res) {
    res.sendFile(path.resolve("public/fireBase.html"));
});

// ROUTE TO SEARCH INGREDIENTS
app.get("/search", (req, res) =>
    res.render("pages/searchByIngredients", {stores: storeInStock, itemStockBoolean: itemStockBoolean}));


// ROUTE TO LANDING PAGE
app.get("/", (req, res) => res.render("pages/landing"));

//ROUTE TO MAIN MENU
app.get("/menu", (req, res) => res.render("pages/menu"));

// ROUTE TO ABOUT US
app.get("/aboutUs", (req, res) => res.render("pages/aboutUs"));

app.listen(process.env.PORT || 3000,
    () => console.log("Express function running"));




