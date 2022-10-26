const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const multer = require("multer");
const morgan = require("morgan");
const postmark = require("postmark");
const app = express()
let authRoutes = require("./auth");


const { ServerSecretKey, PORT } = require("./core/index")
const { payment, employee, otpModel, clientdata } = require('./dbase/modules')
const serviceAccount = require("./firebase/firebase.json");
const client = new postmark.Client("fa2f6eae-eaa6-4389-98f0-002e6fc5b900");
// const client = new postmark.Client("404030c2-1084-4400-bfdb-af97c2d862b3");
// let client = new postmark.ServerClient("404030c2-1084-4400-bfdb-af97c2d862b3");
let http = require("http");
let APIKey = '43de943e9d0742109e6ee6afeeae7a6f';
let sender = '8583';


app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(express.json())
app.use(morgan('short'))

app.use("/auth", authRoutes)


const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, `${new Date().getTime()}-${file.filename}.${file.mimetype.split("/")[1]}`)
    }
})

const upload = multer({ storage: storage })


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://toys-97d91-default-rtdb.firebaseio.com"
});


const bucket = admin.storage().bucket("gs://toys-db4fb.appspot.com");





// Upload Imag Api

app.post("/upload", upload.any(), (req, res, next) => {

    bucket.upload(req.files[0].path, (err, file, apiResponse) => {
        if (!err) {
            file.getSignedUrl({
                action: 'read',
                expires: '03-09-2491'
            }).then((urlData, err) => {

                !err ? res.status(200).send({
                    ImageUrl: urlData[0],
                }) : res.send(err)
            })

        } else {
            res.status(500).send();
        }
    });
})


// PaymentData Api

app.post("/PaymentData", (req, res, next) => {
    if (!req.body.PaymentId) {
        res.status(409).send(`
                    Please send PaymentName  in json body
                    e.g:
                    "PaymentId":"PaymentId",
                    "PaymentName": "PaymentName",
                    "PaymentEmail": "PaymentEmail"
                `)
        return;
    } else {
        const otp = Math.floor(getRandomArbitrary(1111, 9999))
        const newPayment = new payment({
            PaymentClientId: req.body.PaymentId,  // user.clientID
            PaymentName: req.body.PaymentName,  // user.clientName
            PaymentEmail: req.body.PaymentEmail,  // user.clientEmail
            PaymentNumber: req.body.PaymentNumber,
            PaymentAmount: req.body.PaymentAmount,
            PaymentMode: req.body.PaymentMode,
            imageUrl: req.body.imageUrl,
            heldby: req.body.heldby,
            drawOn: req.body.drawOn,
            dueOn: req.body.dueOn,
            AssignedBy: req.body.AssignedBy,
            VerificationCode: otp,
            status: req.body.status
        }).save().then((data) => {
            //  Send OTP with SMS
            let receiver = data.PaymentNumber
            let textmessage = `Your Payment Verification Code is: ${otp}`;
            let options = {
                host: 'api.veevotech.com',
                path: "/sendsms?hash=" + APIKey + "&receivenum=" + receiver + "&sendernum=" + encodeURIComponent(sender) + "&textmessage=" + encodeURIComponent(textmessage),
                method: 'GET',
                setTimeout: 30000
            };
            let req = http.request(options, (res) => {
                res.setEncoding('utf8');
                res.on('data', (chunk) => { console.log(chunk.toString()) });
                console.log('STATUS: ' + res.statusCode);
            });
            req.on('error', function (e) {
                console.log('problem with request: ' + e.message);
            });
            console.log(options, "options");
            console.log(receiver, "receiver");
            req.end();
            // Send OTP with Email
            client.sendEmail({
                "From": "faiz_student@sysborg.com",
                "To": data.PaymentEmail,
                "Subject": "Payment verify OTP",
                "TextBody": `Here is verify Otp code: ${otp}`
            })
            res.send(data)
        }).catch((err) => {
            res.status(500).send({
                message: "an error occured : " + err,
            })
        });
    }
})


// Otp Send Api

//  Rendom 5 number Otp

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}


// Step 2 Recive Email Otp Api

app.post("/ReciveOtpStep-2", (req, res, next) => {
    if (!req.body.PayObjectId || !req.body.otp || !req.body.status) {
        res.status(403).send(`
              please send email & otp in json body.
              e.g:
              {
                  "email": "faizeraza2468@gmail.com",
                  "PaymentId": "xxxxxx",
                  "otp": "xxxxx"
              }`);
        return;
    }
    payment.findOne({ _id: req.body.PayObjectId }, (err, otpData) => {
        // otpData = otpData[otpData.length - 1];
        console.log(otpData);
        if (otpData.VerificationCode === req.body.otp) {
            otpData.update({ status: req.body.status }, (err, data) => {
                client.sendEmail({
                    From: "faiz_student@sysborg.com",
                    To: otpData.PaymentEmail,
                    Subject: "Thank for Payment is Recived",
                    TextBody: `payment is successfully recorded in our system.`,
                });
            })
            res.send(otpData)
        } else {
            res.status(500).send({
                message: " do you have correct OTP an error occured:" + JSON.stringify(err),
            });
        }
    })
});

//  ReSend OTP

app.post("/ReSendOTP", (req, res) => {
    if (!req.body.PayObjectId) {
        res.send("email")
    } else {
        payment.findOne({ _id: req.body.PayObjectId }, (err, data) => {
            // console.log(data);
            if (!err) {
                client.sendEmail({
                    "From": "faiz_student@sysborg.com",
                    "To": data.PaymentEmail,
                    "Subject": "Resend Payment verify OTP",
                    "TextBody": `Here is verify Otp code: ${data.VerificationCode.toString()}`
                })
                res.send("Please Check the email")
            } else {
                res.send(err)
            }
        })
    }
})

// Post conformationPayment
app.post('/conformationPayment', (req, res, next) => {

    if (!req.body.ClientObjectId) {
        res.send("ClientObjectId")

    } else {
        clientdata.findById({ _id: req.body.ClientObjectId }, (err, data) => {

            if (!err) {
                client.sendEmail({
                    "From": "faiz_student@sysborg.com",
                    "To": data.ClientEmail,
                    "Subject": "Thank for Payment has been Recive",
                    "TextBody": `payment is successfully recorded in our system.`
                })
                res.send(data)
            } else {
                res.send(err)

            }
        })
    }
})
// Get all Data Payment Api

app.get('/', (req, res, next) => {
    payment.find({}, (err, data) => {
        (!err) ? res.send({ Data: data, }) : res.status(500).send("error")
    })
})

 
//API to check how many payment Exist
app.post('/checkExist', (req, res, next) => {
    if (!req.body.filter) {
        res.status(409).send(`
        Please send filter in json body
        e.g:
        "filter":"{}",
    `)
    } else {
        payment.find(req.body.filter, (err, doc) => {
            if (!err) {

                res.send(doc.length.toString());
            } else {
                res.send(err)
            }
        })
    }
})


//API to receive filter and return multi filtered Payments
app.post('/multiFilteredPayments', (req, res, next) => {
    if (!req.body.filter) {
        res.status(409).send(`
        Please send filter in json body
        e.g:
        "filter":"{}",
    `)
    } else {
        payment.find(req.body.filter, (err, doc) => {
            if (!err) {
                res.send(doc)
            } else {
                res.send(err)
            }
        })
    }
})

//API to receive filter and return filtered Payments
app.post('/filteredPayments', (req, res, next) => {
    if (!req.body.filter) {
        res.status(409).send(`
        Please send filter in json body
        e.g:
        "filter":"{}",
    `)
    } else {
        payment.find(req.body.filter, (err, doc) => {
            if (!err) {
                res.send(doc)
            } else {
                res.send(err)
            }
        })
    }
})


// collectionsby
app.post('/collectionBy', (req, res, next) => {

    let item = {
        name: res.heldby,
        cheque: 0,
        cash: 0,
        count: 0,
        totalAmount: 0

    }
    payment.find({ heldby: req.body.heldby }, (err, data) => {
        if (!err) {
            //  res.send(data);
            for (let i = 0; i < data.length; i++) {
                item.totalAmount = item.totalAmount + parseInt(data[i].PaymentAmount);
                item.count = data.length;
                if (data[i].PaymentMode == "Cash") {

                    item.cash += data[i].PaymentAmount;
                } else if (data[i].PaymentMode == "Cheque") {

                    item.cheque += parseInt(data[i].PaymentAmount);
                }
                else {
                    item.others += dparseInt(data[i].PaymentAmount);
                }
                console.log("Item", item);

            }
            res.send(item);
        }
        else {
            res.status(500).send("error");
        }
    })
})

app.get('/heldBy', (req, res, next) => {
    payment.find({ heldby: req.body.heldby }, (err, data) => {
        if (!err) {
            res.send(data);
        }
        else {
            res.status(500).send("error");
        }
    })
})

/* summary by cashier
*/
app.post('/CashierSummary', (req, res, next) => {
    let collections = [];
    let cashiers = [];
    employee.find({ Role: "Cashier" }, (err, data) => {
        if (!err) {
            cashiers = data;
            console.log("Cashiers length", cashiers.length);
            let result = test(data);
            res.send(result);
        }
    });
    // function test(cashiers){
    //     console.log("Cashiers lengthin test",cashiers.length);   
    //     return"done testing";
    // }
    console.log("Cashiers outside", cashiers);
})
function test(cashiers) {
    console.log("Cashiers length in test", cashiers.length);
    let collections = [];
    for (let i = 0; i < cashiers.length; i++) {
        //    console.log("in cashier loop");
        let payments = [];
        payment.find({ heldby: cashiers[i].employeeName }, (err, data) => {// finding all payments held by cashier
            if (!err) {
                payments = data;// stores all  payments of specific cashier
                //  console.log("Payments by casier",cashiers[i].employeeName ,payments.length);
                let item = getsummaryItems(cashiers[i].employeeName, payments);
                collections.push(item);
            }
            else {
                res.status(500).send("errorin finding payments of a cashier");
            }
        });
        let item = getsummaryItems(cashiers[i].employeeName, payments);
        collections.push(item);


    }
    //  console.log("Collections",collections);
    return collections;
}
//res.send(collections);


//- internal function
function getsummaryItems(name, payments) {
    let item = {
        employeeNamr: name,
        cheques: 0,
        cash: 0,
        count: 0,
        others: 0,
        totalAmount: 0,
    }
    console.log("in Summary Item", name, payments.length);
    for (let i = 0; i < payments.length; i++) {
        item.totalAmount = item.totalAmount + payments[i].PaymentAmount;
        item.count = payments.length;
        if (payments[i].PaymentMode == "Cash") {

            item.cash += payments[i].PaymentAmount;
        } else if (payments[i].PaymentMode == "Cheque") {

            item.cheque += payments[i].PaymentAmount;
        }
        else {
            item.others += payments[i].PaymentAmount;
        }


    }
    return item;
}
//     payment.find({ heldby: req.body.heldby }, (err, data) => {
//         if (!err) {
//             res.send(data);
//         }
//         else {
//             res.status(500).send("error");
//         }
//     })
// })

//Post All Api with ClientData 


app.post("/ClientData", (req, res, next) => {

    if (!req.body.ClientId || !req.body.ClientName
    ) {
        res.status(409).send(`
                    Please send PaymentName  in json body
                    e.g:
                    "ClientId":"ClientId",
                    "ClientName": "ClientName",
                    "ClientPhoneNumber": "ClientPhoneNumber",
                    "ClientAmount": "ClientAmount"
                    "ClientEmail": "ClientEmail"
                `)
        return;
    } else {
        const newClient = new clientdata({
            ClientId: req.body.ClientId,
            ClientName: req.body.ClientName,
            ClientPhoneNumber: req.body.ClientPhoneNumber,
            ClientAmount: req.body.ClientAmount,
            ClientEmail: req.body.ClientEmail,
            ClientRider: "Select Rider",
            BelongsTo: req.body.BelongsTo
        })
        newClient.save().then((data) => {
            res.send(data)

        }).catch((err) => {
            res.status(500).send({
                message: "an error occured : " + err,
            })
        });
    }
})


//Get All Api with ClientData 
app.get('/ClientData', (req, res, next) => {
    clientdata.find({}, (err, data) => {
        if (!err) {

            res.send({
                Data: data,
            });
        }
        else {
            res.status(500).send("error");
        }
    })
})


app.post("/ClientDataUpdate", (req, res, next) => {
    // console.log(req.body.id);
    // console.log(req.body.ClientRider);

    let updateObj = {};

    if (req.body.ClientRider) {
        updateObj.ClientRider = req.body.ClientRider;
    }
    if (req.body.ClientRiderObjectId) {
        updateObj.ClientRiderObjectId = req.body.ClientRiderObjectId;
    }
    if (req.body.CashierName) {
        updateObj.CashierName = req.body.CashierName;

    }
    if (req.body.AssignedBy) {
        updateObj.AssignedBy = req.body.AssignedBy;

    }
    clientdata.findByIdAndUpdate(
        req.body.id,
        updateObj,
        { new: true },
        (err, data) => {
            if (!err) {
                res.send({
                    data: data,
                    message: "Assign Rider Successfully!",
                    // status: 200
                });
            } else {
                res.status(500).send("error happened");
            }
        }
    );


})


app.listen(PORT, () => {
    console.log("start server....", `http://localhost:${PORT}`)
});
