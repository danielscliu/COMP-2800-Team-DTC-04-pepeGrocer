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


let itemStockBoolean = true;
//let storeInStock = [];

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
            storeInStock = snapshotAsync(snapshot);
            // return storesInStock;
        });
    console.log(storeInStock);
    return storeInStock
}

function snapshotAsync(snap) {
    monkey = [];
    //console.log(snap);
     snap.forEach(doc => {
         monkey.push(new storeSummary(doc.get("Name"), doc.get("Address"), doc.get("WaitTime"), doc.get("directions")))
    });
    return monkey
}
function storeSummary(name, address, waitTime, directions) {
    this.name = name;
    this.address = address;
    this.waitTime = waitTime;
    this.directions = directions;
}


app.post("/searchByIngredients", (req, res) => {
    let targetItem = req.body.ingredients;
    if (targetItem === "")
    {
        res.render("pages/searchByIngredients", {stores: storeInStock, itemStockBoolean:itemStockBoolean})
    } else {

        // clear the list of stores, otherwise they will append all the stores to list
        queryItem(targetItem);
        // can't get async working here for query item so we're just gonna take a nap for 500 ms
        setTimeout(function () {
            res.render("pages/searchByIngredients", {stores: storeInStock, itemStockBoolean: itemStockBoolean})
        }, 1000);

    }
});

// ROUTE TO FIREBASEUI LOGIN
app.get("/fLogin", function (req, res) {
    res.sendFile(path.resolve("public/fireBase.html"));
});

// ROUTE TO SEARCH INGREDIENTS
app.get("/search", (req, res) =>
    res.render("pages/searchByIngredients", {stores: [], itemStockBoolean: itemStockBoolean}));


// ROUTE TO LANDING PAGE
app.get("/", (req, res) => res.render("pages/landing"));

//ROUTE TO MAIN MENU
app.get("/menu", (req, res) => res.render("pages/menu"));

// ROUTE TO ABOUT US
app.get("/aboutUs", (req, res) => res.render("pages/aboutUs"));

app.get("/items", (req, res) => res.render("pages/missingItems"));

app.get("/time", (req, res) => res.render("pages/waitTime"));

app.post("/waitTime", (req, res) => {
    if (req.body.submitBtn === "Search") {
        console.log(req.body.address);
        res.render("pages/waitTime");
    } else if (req.body.submitBtn === "Near Me") {
        console.log("GeoLocation");
        res.render("pages/waitTime");
    } else if (req.body.submitBtn === "Submit") {
        console.log(req.body.waitingTime);
        res.render("pages/missingItems");
    }
});

app.post("/missingItems", (req, res) => {
    console.log(req.body.itemStatus);
    console.log(req.body.stock);
    res.render("pages/missingItems");
});

app.listen(process.env.PORT || 3000,
    () => console.log("Express function running"));
