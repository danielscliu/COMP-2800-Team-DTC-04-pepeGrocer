const express = require("express");
const path = require("path");
const app = express();
const request = require('request');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");



//<editor-fold desc="searchByAddress">
function addressToLonLat(address) {
    var filteredAddress = address.replace(" ", "+");
    return new Promise(function(res, rej) {
        request('https://discover.search.hereapi.com/v1/' +
            'geocode' +
            '?q=' + filteredAddress +
            '&apiKey=dXmHzMbOVAkqdex7o_440a8wmmMozdhTDxFO-hClAtU', function (error, response, body) {
            if (error) return rej(err);
            try {
                res( JSON.parse(body))
            } catch(e) {
                rej(e);
            }

        })
    }) // end promise
}

function asyncAddress(address) {
addressToLonLat(address)
    .then((val) => {
        let geocode = [];
        let json = val;
        let jsonItems = json.items[0];
        let lat = jsonItems.access[0].lat;
        let lng = jsonItems.access[0].lng;
        geocode.push(lat, lng);
        let listClosest = map5Closest(geocode[0], geocode[1]);
        return listClosest;
    })
}

// let test = asyncAddress("9088 Dixon Ave Richmond");
// console.log(test);
//</editor-fold>


//////////////////////// map5Closest(lat, lon): RETURN TOP 5 GROCERY STORE CLOSEST TO LOCATION ///////////////////////
//<editor-fold desc="map_top_5">
function map5Closest(lat, lon) {
    request('https://discover.search.hereapi.com/v1/' +
        'discover' +
        '?at='+lat +',' + lon +
        '&limit=5' +
        '&q=grocery' +
        '&in=countryCode:can' +
        '&apiKey=uxpiwh4lgSnnxBOklrdEVCdCaStR0ZQ_6DA1X-GGMu0', function (error, response, body) {
        let listClosest = [];
        let json = JSON.parse(body);
        let obj = json.items;
        for (i = 0; i < 5; i++) {
            let name = obj[i].title;
            let address = obj[i].address.label;
            let identification = obj[i].id;
            listClosest.push(new basicStoreInfoObjectCreator(name, address, identification));
        }
        // console.log(listClosest);
        return listClosest;

    })
}
function basicStoreInfoObjectCreator(name, address, identification) {
    this.name = name;
    this.address = address;
    this.identification = identification;
}
//</editor-fold>

// Firebase init


//<editor-fold desc="FIREBASE SETUP">
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
//</editor-fold>


/////////////////////////////GENERIC WRITE TO DATABASE GIVEN STORE ADDRESS AND object:objectData//////////////////
///// USE BY CALLING addToDatabaseWithAddyItemAndBoolean(storeLocation, object, objectData)
//<editor-fold desc="write to database w/ store address and object + objectData">

async function addToDatabaseWithAddyItemAndBoolean(storeLocation, objectField, objectData) {
    objectField = objectField.toLowerCase();
    let snapshotReturn;
    db.collection('stores').where("address", "==", storeLocation).get()
        .then(snapshot => {
            snapshotReturn = snapshot;
            findDocID(snapshotReturn, objectField, objectData);
        });
}

async function findDocID(snapshot, objectField, objectData) {
    snapshot.forEach(doc => {
        console.log(doc.id);
        addWithDocID(doc.id, objectField, objectData);
    })
}

function addWithDocID(storeID, objectField, objectData) {
    db.collection('stores').doc(storeID).update({
        [objectField]: objectData
    })
}

//</editor-fold>

/////////////////////////////GENERIC WRITE TO DATABASE GIVEN STORE ADDRESS AND object:objectData//////////////////
///// USE BY CALLING addToDatabaseWithAddyItemAndBoolean(storeLocation, object, objectData)
//<editor-fold desc="write to database w/ store address and object + objectData">

async function addToDatabaseWithAddyItemAndBoolean(storeLocation, objectField, objectData) {
    objectField = objectField.toLowerCase();
    let snapshotReturn;
    db.collection('stores').where("address", "==", storeLocation).get()
        .then(snapshot => {
            snapshotReturn = snapshot;
            findDocID(snapshotReturn, objectField, objectData);
        });
}

async function findDocID(snapshot, objectField, objectData) {
    snapshot.forEach(doc => {
        console.log(doc.id);
        addWithDocID(doc.id, objectField, objectData);
    })
}

function addWithDocID(storeID, objectField, objectData) {
    db.collection('stores').doc(storeID).update({
        [objectField]: objectData
    })
}

//</editor-fold>

let itemStockBoolean = true;

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
        monkey.push(new storeSummary(doc.get("name"), doc.get("address"), doc.get("waittime")))
    });
    return monkey
}

function storeSummary(name, address, waitTime) {
    this.name = name;
    this.address = address;
    this.waitTime = waitTime;
    this.directions = makeGoogleMapsDirection(address);
}

function makeGoogleMapsDirection(address) {
    address = address.replace(" ", "+");
    address = "https://www.google.com/maps?saddr=Current+Location&daddr=" + address;
    return address;
}

app.post("/searchByIngredients", (req, res) => {
    let targetItem = req.body.ingredients;
    targetItem = targetItem.toLowerCase();
    if (targetItem === "") {
        res.render("pages/searchByIngredients", {stores: storeInStock, itemStockBoolean: itemStockBoolean})
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

app.get("/lineup", (req, res) => res.render("pages/lineup"));


app.post("/waitTime", (req, res) => {
    if (req.body.submitBtn === "Search") {
        console.log(req.body.address);
        res.render("pages/waitTime");
    } else if (req.body.submitBtn === "Near Me") {
        console.log("GeoLocation");

        // console.log(req.body)
        let lat = req.body.latitude;
        let lon = req.body.longitude;
        result =map5Closest(lat, lon);
        console.log(`${result} is found`)


    } else if (req.body.submitBtn === "Submit") {

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
