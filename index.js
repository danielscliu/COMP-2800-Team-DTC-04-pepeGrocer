const express = require("express");
const path = require("path");

const app = express();
const request = require('request');
const rp = require('request-promise');
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
//</editor-fold>

//////////////////IN PROGRESS ///////////////
//<editor-fold desc="searchByAddress">
function addressToLonLat(address) {
    var filteredAddress = address.replace(/\s/g, "+");
    filteredAddress = filteredAddress.replace(/,/g, "");
    console.log("entered address: " + filteredAddress);
    return new Promise(function (res, rej) {
        var options = {
            uri: 'https://discover.search.hereapi.com/v1/' +
                'geocode' +
                '?q=' + filteredAddress +
                '&apiKey=dXmHzMbOVAkqdex7o_440a8wmmMozdhTDxFO-hClAtU',
            json: true
        };
        rp(options)
            .then((body) => {
                // console.log(body)
                setTimeout(function () {
                    let geocode = [];
                    let jsonItems = body.items[0];
                    let lat = jsonItems.position.lat;
                    let lng = jsonItems.position.lng;
                    geocode.push(lat, lng);
                    console.log(geocode);
                    res(geocode);
                }, 1500)

            })
    })
}

// https://discover.search.hereapi.com/v1/geocode?q=richmond&apiKey=dXmHzMbOVAkqdex7o_440a8wmmMozdhTDxFO-hClAtU
// addressToLonLat("9088 dixon ave richmond")
// console.log(test);
//</editor-fold>


//////////////////////// map5Closest(lat, lon): RETURN TOP 5 GROCERY STORE CLOSEST TO LOCATION ///////////////////////
//<editor-fold desc="map_top_5">
async function map5Closest(lat, lon) {
    console.log("inside map5Closest already");
    return new Promise(function (res, rej) {
        var option = {
            uri: 'https://discover.search.hereapi.com/v1/' +
                'discover' +
                '?at=' + lat + ',' + lon +
                '&limit=5' +
                '&q=grocery' +
                '&in=countryCode:can' +
                '&apiKey=uxpiwh4lgSnnxBOklrdEVCdCaStR0ZQ_6DA1X-GGMu0',
            json: true
        }
        rp(option)
            .then((body) => {
                console.log(lat);
                console.log("rp map5");
                setTimeout(function () {
                    // console.log(body);
                    listClosest = [];
                    for (i = 0; i < 5; i++) {
                        let name = body.items[i].title;
                        console.log(name);
                        let obj=body.items;
                        // console.log(body.items[i])
                        // name = name.replace(/'/, "")
                        let address = obj[i].address.houseNumber + " " + obj[i].address.street +
                            ", " + obj[i].address.city + " " + obj[i].address.state +
                            ", " + obj[i].address.postalCode + ", " + obj[i].address.countryName;
                        let identification = obj[i].id;
                        let direction = makeGoogleMapsDirection(address);
                        listClosest.push(new basicStoreInfoObjectCreator(name, address, identification, direction));
                    }
                    res(listClosest);
                }, 1000)
            })
    }) // end promise here
}

function basicStoreInfoObjectCreator(name, address, identification, direction) {
    this.name = name;
    this.address = address;
    this.identification = identification;
    this.directions = direction;
}


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

function makeGoogleMapsDirection(address) {
    address = address.replace(/ /g, "+");
    address = address.replace(/,/g, "");
    address = "https://www.google.com/maps?saddr=Current+Location&daddr=" + address;
    return address;
}

app.post("/searchByIngredients", (req, res) => {
    let targetItem = req.body.ingredients.toLowerCase();
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

// This function gets the list of items from db based on store

function getItemInventory(hereid) {
    return new Promise(function (res, rej) {
            db.collection("stores").doc(hereid).get()
                .then(function (snapshot) {
                    if (snapshot.exists) {
                        // console.log(snapshot.data())
                        res(snapshot.data())
                    } else {
                        return;
                    }
                }).catch(error => error.log(error))
        }
    )
}

// hereid = "here:pds:place:124c28rw-df81e2852b0e407099396ea40bf289e7"
// getItemInventory(hereid).then( response =>
//     console.log(response)
// )

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

// individual store inventory
app.post("/individualStock", function (req, res) {
    console.log(req.body);
    res.render("pages/itemStock")
})


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


/// To render the page
app.get("/individualstore/:hereid/:name/:address", (req, res) => {
    //console.log(req.params);
    let storename = "";
    let inventory = [];
    let hereid = req.params.hereid;
    console.log(req.params);

    try {


        updateStoreWaitTime(hereid, req.params.name, req.params.address, 0)
            .then(() => {


                getItemInventory(hereid)
                    .then(response => {
                        console.log(response);
                        for (var key in response) {
                            if ((response[key]) === false) {
                                inventory.push([key, response[key]])
                                //inventory.push([key, response[key]])
                            }
                            if (key == "name") {
                                storename = response[key]
                            }
                        }
                    })
                    .then(response => {
                            console.log("we are done looping through inventory")
                            console.log(inventory)
                            console.log(storename)
                            res.render("pages/itemStock", {inventory: inventory, name: storename})
                        }
                    )
            })
    } catch (error) {
        console.error("cannot get this page")

    }
});

app.get("/individualstore///", (req,res)=>{
    res.send("Sorry this store doesn't exist. Please go back, enter an address or click on Near Me first, and try again. Thanks! :)")
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
    console.log("uid: " + uid);
    writeShoppingList(uid, array);
})

// UPDATE LIST WITHOUT CLEARING
function writeShoppingList(uid, dataObject) {
    for (let i = 0; i < dataObject.length; i++) {
        db.collection('users').doc(uid).collection('shoppingList')
            .doc("shoppingList").update({
            [dataObject[i]]: true
        }).then(() => console.log("success write shopping list to database"))
            .catch((err) => console.log(err))

    }
}

// DANIEL SHOPPINGLIST PATH IS HERE. NOTE IT'S COLLECTION > DOC(UID) > SHOPPINGLIST > SHOPPINGLIST
// function writeShoppingList(uid, dataObject) {
//     console.log("yup writing");
//     //clear shopping list database first before storing
//     db.collection('users').doc(uid).collection('shoppingList')
//         .doc('shoppingList').set({})
//         .then(() => {
//             console.log("shopping list succcesfully cleared for storing")
//             for (let i = 0; i < dataObject.length; i++) {
//                 db.collection('users').doc(uid).collection('shoppingList')
//                     .doc("shoppingList").update({
//                     [dataObject[i]]: true
//                 }).then(() => console.log("success write shopping list to database"))
//                     .catch((err) => console.log(err))
//
//             }
//         })
//         .catch((err) => console.log(err))
//
// }

//</editor-fold>


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

app.get("/time", (req, res) => res.render("pages/waitTime", {stores: "none", errMsg: ""}));

app.get("/lineup", (req, res) => res.render("pages/lineup", {stores: "none"}));

app.get("/stock", (req, res) => res.render("pages/itemStock"));

// app.get("/individualStoreStock", )


// This post endpoint comes from the /waitTime url when you type in an item and press "submit to server"//
// This post endpoint comes from the /waitTime url when you type in an item and press "/ to server"//
app.post("/updateMissingItems", (req, res) => {
    console.log("received post from item update");
    console.log(req.body);
    updateStoreItem(req.body.id, req.body.name.toLowerCase(), req.body.stock)
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
                    }).catch((err) => console.log(err));
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
                setTimeout(function() {
                    map5Closest(val[0], val[1])
                        .then((result) => {
                            res.render("pages/waitTime", {errMsg: ' ', stores: result});
                }, 1500)

                    }).catch((err) => console.log(err));
            })
            .catch(() => console.log("error address to LL"))


    } else if (req.body.submitBtn === "Near Me") {

        console.log("GeoLocation");

        // console.log(req.body)
        let lat = -999;
        let lon;
        lat = req.body.latitude;
        lon = req.body.longitude;
        if (lon !== "") {
            map5Closest(lat, lon)
                .then(result =>
                    res.render("pages/waitTime", {errMsg: ' ', stores: result}))
        } else {
            console.log("It's blank");
            res.render("pages/waitTime", {
                errMsg: 'alert("Error! Unable to get geolocation. Please try again in a few seconds ' +
                    'and make sure you\'ve enabled geolocation")',
                stores: "none"
            });
        }

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

function getLonFromPage(req, res) {
    return new Promise(function (res, rej) {
        res(req.body.longitude);
    })
}

function getLatFromPage(req, res) {
    return new Promise(function (res, rej) {
        res(req.body.latitude);
    })
}


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
                    if (status === "true") {

                        ref.doc(storeID).update({
                            [item]: true,
                        }).then(() => {
                            console.log("stored as: " + true)
                            console.log("newitem!");
                            res();
                        })
                            .catch((err) => console.log(err));
                    } else {
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
