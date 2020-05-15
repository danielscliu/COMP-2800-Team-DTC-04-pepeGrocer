const express = require("express");
const path = require("path");
const app = express();
const request = require('request');
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

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


//////////////////IN PROGRESS ///////////////
//<editor-fold desc="searchByAddress">
function addressToLonLat(address) {
    var filteredAddress = address.replace(" ", "+");
    return new Promise(function (res, rej) {
        request('https://discover.search.hereapi.com/v1/' +
            'geocode' +
            '?q=' + filteredAddress +
            '&apiKey=dXmHzMbOVAkqdex7o_440a8wmmMozdhTDxFO-hClAtU', function (error, response, body) {
            if (error) return rej(err);
            try {
                res(JSON.parse(body))
            } catch (e) {
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
async function map5Closest(lat, lon) {
    return new Promise(function (res, rej) {
        request('https://discover.search.hereapi.com/v1/' +
            'discover' +
            '?at=' + lat + ',' + lon +
            '&limit=5' +
            '&q=grocery' +
            '&in=countryCode:can' +
            '&apiKey=uxpiwh4lgSnnxBOklrdEVCdCaStR0ZQ_6DA1X-GGMu0', function (error, response, body) {

            if (error) return rej(err);
            try {
                let listClosest = [];
                let json = JSON.parse(body);
                let obj = json.items;
                for (i = 0; i < 5; i++) {
                    let name = obj[i].title;
                    let address = obj[i].address.label;
                    let identification = obj[i].id;
                    let direction = makeGoogleMapsDirection(address);
                    listClosest.push(new basicStoreInfoObjectCreator(name, address, identification, direction));
                }
                res(listClosest);
            } catch (e) {
                rej(e);
            }


        })
    }) // end promise
}

function basicStoreInfoObjectCreator(name, address, identification, direction) {
    this.name = name;
    this.address = address;
    this.identification = identification;
    this.directions = direction;
}

//</editor-fold>

// Firebase init

///// STORE INTO FIREBASE STORE INFO
function storeNewStoreInfo(storeID, storeAddress, storeName) {
    db.collection('stores').doc(storeID).update({
        address: storeAddress,
        name: storeName
    }).then(() => console.log("store info success"))
        .catch((error) => console.log(error))
}

function storeWaitTime(storeID, waitTime) {
    db.collection('stores').doc(storeID).update( {
        waittime: waitTime
    })
}

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


//<editor-fold desc="query item">
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
//</editor-fold>


/// USERDB SET DATA
// db.collection('users').doc("1").collection('shoppingList')
//     .doc("shoppingList").set({
//     apple: true,
//     banana: true,
//     orange: false,
//     mango: false
// }).then(() => console.log("success"));

//<editor-fold desc="shopping list functions">
function readUserShit(uid) {
    return new Promise(function (res, rej) {
            db.collection('users').doc(uid).collection('shoppingList')
                .doc("shoppingList").get()
                .then(function (snapshot) {
                    if (snapshot.exists) {
                        console.log(snapshot.data())
                        res(snapshot.data())
                    } else {
                        return;
                    }
                }).catch(error => console.log(error))
        }
    )
}


function asyncReadUserShit(res, uid) {
    let shoppingListArray;
    readUserShit(uid).then((val) => {
        const entries = Object.entries(val);
        console.log(entries.length);
        shoppingListArray = entries;
    }).then(() => {
        res.render("pages/shoppingList", {list: shoppingListArray});
    })
}

function writeShoppingList(uid, dataObject) {
    for (let i = 0; i < dataObject.length; i++) {
        db.collection('users').doc(uid).collection('shoppingList')
            .doc("shoppingList").set({
            [dataObject[i][0]]: [dataObject[i][1]]
        })

    }
}

//</editor-fold>


app.post("/shoppingListStartUid", function (req, res) {
    console.log("inside Shopping List start UID POST");
    let uid = req.body.uid;
    asyncReadUserShit(res, uid);

});


app.post('/shoppinglist', (req, res) => {
    let shopping = req.body.items;
    console.log(shopping);
    res.render("pages/shoppingList", {shopping});
});

app.get('/shoppinglist', (req, res) => {
    res.render("pages/shoppingList");
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

app.get("/time", (req, res) => res.render("pages/waitTime", {stores: "none"}));

app.get("/lineup", (req, res) => res.render("pages/lineup"));


app.post("/waitTime", (req, res) => {
    let result;
    if (req.body.submitBtn === "Search") {
        console.log(req.body.address);
        res.render("pages/waitTime");
    } else if (req.body.submitBtn === "Near Me") {
        console.log("GeoLocation");

        // console.log(req.body)
        let lat = req.body.latitude;
        let lon = req.body.longitude;
        map5Closest(lat, lon)
            .then(result =>
                res.render("pages/waitTime", {stores: result})
            )
            return
            // .then(result => res.redirect("./items"))
    } else if (req.body.submitBtn === "Submit") {
        //SUBMIT HAS BEEN MOVED TO POST waitTimeSubmit AJAX

    }
});



app.post("/waitTimeSubmit", (req, res) => {
    let waitTimeValue = req.body.waitTimeValue;
    let storeID = req.body.storeID;
    let address = req.body.storeAddress;
    let name = req.body.storeName;
    console.log(waitTimeValue, storeID, address, name)

    updateStoreWaitTime(storeID, name, address, waitTimeValue)
        .then(() => {
            console.log("then complete");
            res.render("pages/missingItems");
            console.log("render complete");
        })
        
})

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


app.post("/missingItems", (req, res) => {
    console.log(req.body.itemStatus);
    console.log(req.body.stock);
    res.render("pages/missingItems");
});

app.listen(process.env.PORT || 3000,
    () => console.log("Express function running"));
