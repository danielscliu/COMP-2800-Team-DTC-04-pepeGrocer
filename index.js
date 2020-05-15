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
            let geocode = [];
            let json = JSON.parse(body)
            let jsonItems = json.items[0];
            let lat = jsonItems.access[0].lat;
            let lng = jsonItems.access[0].lng;
            geocode.push(lat, lng);
            res(geocode);


        })
    }) // end promise
}


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
    db.collection('stores').doc(storeID).update({
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
function getUserShoppingListDatabase(uid) {
    return new Promise(function (res, rej) {
            db.collection('users').doc(uid).collection('shoppingList')
                .doc("shoppingList").get()
                .then(function (snapshot) {
                    if (snapshot.exists) {
                        // console.log(snapshot.data())
                        res(snapshot.data())
                    } else {
                        return;
                    }
                }).catch(error => console.log(error))
        }
    )
}

function shoppinglistObjectCreator(k1, k2) {
    this.leFruit = k1;
    this.leBool = k2;
}


function asyncReacUserShoppingList(res, uid) {
    let shoppingListArray = [];
    getUserShoppingListDatabase(uid).then((val) => {

        for (let key of Object.entries(val)) {
            let newList = new shoppinglistObjectCreator(key[0], key[1]);
            shoppingListArray.push(newList);
        }

    }).then(() => {
        console.log("ok");
        res.render("pages/shoppingList", {list: shoppingListArray});
    })
}

// ############### All shopping list ##########################
let food = []


//SHOW SAVED LIST BUTTON FORM
app.post("/showSavedList", function (req, res) {
    let uid = req.body.hiddenUID;
    console.log(uid);
    asyncReacUserShoppingList(res, uid);
})

app.post("/shoppingListStartUid", function (req, res) {
    let uid = req.body.uid;
    asyncReacUserShoppingList(res, uid);
});

function clearShoppingListDatabase(uid) {
    return new Promise(function (res, rej) {
        db.collection("users").doc(uid).collection('shoppingList').doc('shoppingList').set({})
            .then(() => {
                console.log("clear shopping list success");
                res();
            })
            .catch(() => console.log("clear shopping list failed"))
    })
}
// FORM CLEAR SHOPPING LIST
app.post('/clearShoppingList', (req, res) => {
    let uid = req.body.hiddenUID2;
    clearShoppingListDatabase(uid)
        .then(() => res.render("pages/shoppingList", {list: []}))
        .catch((err) => console.log(err))
})

app.post('/shoppinglist', (req, res) => {
    // let shopping = req.body.items;
    // console.log(req.body);
    
    res.render("pages/shoppingList", {list: []});
});

app.get('/shoppinglist', (req, res) => {
    // create user if does not exist
// DANIEL THEN .THEN RES.RENDER BELOW
    res.render("pages/shoppingList", {list: []});
});


// DANIEL WORK ON THIS PLEASE
// CHECK IF COLLECTION > DOC(UID) <- IF THIS EXISTS
// IF YES, .THEN => RES(); TO RESOLVE
function createUserShoppingList(uid) {
    return new Promise((function (res, rej) {
            let ref = db.collection('users');
        })
    )
}

app.post('/writeShoppingListToDatabase', (req, res) => {
    // console.log("success receive post from shoppinglist.ejs");
    let uid = req.body.uid;
    let array = req.body.array;
    console.log(array);
    writeShoppingList(uid, array);
})

// DANIEL SHOPPINGLIST PATH IS HERE. NOTE IT'S COLLECTION > DOC(UID) > SHOPPINGLIST > SHOPPINGLIST
function writeShoppingList(uid, dataObject) {
    console.log("yup writing");
    //clear shopping list database first before storing
    db.collection('users').doc(uid).collection('shoppingList')
        .doc('shoppingList').set({})
        .then(() => {
            console.log("shopping list succcesfully cleared for storing")
            for (let i = 0; i < dataObject.length; i++) {
                db.collection('users').doc(uid).collection('shoppingList')
                    .doc("shoppingList").update({
                    [dataObject[i]]: true
                }).then(() => console.log("success write shopping list to database"))
                    .catch((err) => console.log(err))

            }
        })
        .catch((err) => console.log(err))

}

//</editor-fold>


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

app.get("/lineup", (req, res) => res.render("pages/lineup", {stores: "none"}));

// This post endpoint comes from the /waitTime url when you type in an item and press "submit to server"//
app.post("/updateMissingItems", (req, res) => {
    console.log(req.body)
    updateStoreItem(req.body.id, req.body.name, req.body.stock)
        .then(res.render("pages/waitTime"))

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

                    ref.doc(storeID).update({
                        [item]: Boolean(status),
                    }).then(() => {
                        console.log("newitem!");
                        res();
                    })
                        .catch((err) => console.log(err));
                }
            )
    })
}


app.post("/missingItems", (req, res) => {
    console.log(req.body.itemStatus);
    console.log(req.body.stock);
    res.render("pages/missingItems");
});

app.listen(process.env.PORT || 3000,
    () => console.log("Express function running"));
