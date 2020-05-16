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
         storeInStock.push(new storeSummary(doc.get("Name"), doc.get("Address"), doc.get("WaitTime"), doc.get("directions")))
    })
    //console.log(storeInStock)
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
    res.render("pages/searchByIngredients", {stores: storeInStock, itemStockBoolean: itemStockBoolean}));


// ROUTE TO LANDING PAGE
app.get("/", (req, res) => res.render("pages/landing"));

//ROUTE TO MAIN MENU
app.get("/menu", (req, res) => res.render("pages/menu"));

// ROUTE TO ABOUT US
app.get("/aboutUs", (req, res) => res.render("pages/aboutUs"));

app.get("/items", (req, res) => res.render("pages/missingItems"));

app.get("/time", (req, res) => res.render("pages/waitTime", {stores: "none"}));

app.get("/lineup", (req, res) => res.render("pages/lineup", {stores: "none"}));

// This post endpoint comes from the /waitTime url when you type in an item and press "submit to server"//
app.post("/updateMissingItems", (req, res) => {
    console.log("received post from item update")
    console.log(req.body)
    updateStoreItem(req.body.id, req.body.name, req.body.stock)
        // .then(res.render("pages/missingItems"))
        .then(res.send(200, "success post"))

})

app.post("/lineUpNearMeQuery", (req, res) => {
    let lat = req.body.latitude;
    let lon = req.body.longitude;
    if (req.body.submitBtn === "Search") {
        let address = req.body.address;
        address.replace(" ", "+");
        addressToLonLat(address)
            .then((val) => {
                map5Closest(val[0], val[1])
                    .then((result) => {
                        res.render("pages/waitTime", {stores: result});
                    }).catch((err) => console.log("error map5"));
            })
            .catch(() => console.log("error address to LL"))


    } else {
        map5Closest(lat, lon)
            .then(result =>
                res.render("pages/waitTime", {stores: result})
            )
    }
})

app.post("/waitTime", (req, res) => {
    let result;
    if (req.body.submitBtn === "Search") {
        let address = req.body.address;
        address.replace(" ", "+");
        addressToLonLat(address)
            .then((val) => {
                map5Closest(val[0], val[1])
                    .then((result) => {
                        res.render("pages/waitTime", {stores: result});
                    }).catch((err) => console.log("error map5"));
            })
            .catch(() => console.log("error address to LL"))


    } else if (req.body.submitBtn === "Near Me") {
        console.log("GeoLocation");

        // console.log(req.body)
        let lat = req.body.latitude;
        let lon = req.body.longitude;
        map5Closest(lat, lon)
            .then(result =>
                res.render("pages/waitTime", {stores: result})
            )
        //return
        // .then(result => res.redirect("./items"))
    } else if (req.body.submitBtn === "Submit") {
        console.log("yes bitch");
        let waitTimeValue = req.body.waitTimeValue;
        let storeID = req.body.storeID;
        let address = req.body.storeAddress;
        let name = req.body.storeName;
        console.log(waitTimeValue);
        updateStoreWaitTime(storeID, name, address, waitTimeValue)
            .then(() => {
                console.log("then complete");
                res.render("pages/missingItems", {storeName: name, storeID: storeID});
                console.log("render complete");
            })
    }
});


// app.post("/waitTimeSubmit", (req, res) => {
//     let waitTimeValue = req.body.waitTimeValue;
//     let storeID = req.body.storeID;
//     let address = req.body.storeAddress;
//     let name = req.body.storeName;
//     // console.log(waitTimeValue, storeID, address, name);

// DANIEL LOGIC IS HERE
///update database with store
function updateStoreWaitTime(storeID, name, address, waitTimeValue) {
    return new Promise(function (res, rej) {
        let ref = db.collection('stores');
        ref.doc(storeID).get()
            .then((a) => {
                if (a.exists) {
                    ref.doc(storeID).update({
                        waittime: waitTimeValue
                    }).then(() => {
                        console.log("update Successful");
                        res();
                    })
                        .catch((err) => console.log(err));
                } else {
                    ref.doc(storeID).set({
                        name: name,
                        address: address,
                        waittime: waitTimeValue
                    }).then(() => {
                        console.log("success adding new storeID");
                        res();
                    })
                        .catch((err) => console.log(err));
                }
            }).catch((err) => console.log(err));
    })
}


function updateStoreItem(storeID, item, status) {
    return new Promise(function (res, rej) {
        let ref = db.collection('stores');
        ref.doc(storeID).get()
            .then(() => {
                if (status === "true"){

                    ref.doc(storeID).update({
                        [item]: true,
                    }).then(() => {
                        console.log("stored as: " + true)
                        console.log("newitem!");
                        res();
                    })
                        .catch((err) => console.log(err));
                }
                else {
                    ref.doc(storeID).update({
                        [item]: false,
                    }).then(() => {
                        console.log("stored as: " + false)
                        console.log("newitem!");
                        res();
                    })
                }

                }
            )
    })
}


// app.post("/missingItems", (req, res) => {
//     console.log(req.body.itemStatus);
//     console.log(req.body.stock);
//     res.render("pages/missingItems");
// });

app.listen(process.env.PORT || 3000,
    () => console.log("Express function running"));
