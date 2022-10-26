
const mongoose = require("mongoose");
const { dbURI } = require("../core/index")

/////////////////////////////////////////////////////////////////////////////////////////////////

// let dbURI = 'mongodb://localhost:27017/abc-database';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });


////////////////mongodb connected disconnected events///////////////////////////////////////////////
mongoose.connection.on('connected', function () {//connected
    console.log("Mongoose is connected");
});

mongoose.connection.on('disconnected', function () {//disconnected
    console.log("Mongoose is disconnected");
    process.exit(1);
});

mongoose.connection.on('error', function (err) {//any error
    console.log('Mongoose connection error: ', err);
    process.exit(1);
});

process.on('SIGINT', function () {/////this function will run jst before app is closing
    console.log("app is terminating");
    mongoose.connection.close(function () {
        console.log('Mongoose default connection closed');
        process.exit(0);
    });
});
////////////////mongodb connected disconnected events///////////////////////////////////////////////





// otpSchema Start
let otpSchema = new mongoose.Schema({
    "PaymentEmail": String,

    "ClientId": String,
    "PaymentId": String,
    "otpCode": String,
    "createdOn": { "type": Date, "default": Date.now },
});
let otpModel = mongoose.model("otps", otpSchema);

// otpSchema End


//  PaymentSchema Start
let paymentSchema = mongoose.Schema({
    PaymentClientId: String,
    PaymentName: String,
    PaymentEmail: String,
    PaymentNumber: String,
    PaymentAmount: String,
    imageUrl: String,
    PaymentMode: String,
    AssignedBy: String,
    VerificationCode: String,
    BelongsTo: String,
    heldby: String,
    drawOn: String,
    dueOn: String,
    status: String,
    "createdOn": { "type": Date, "default": Date.now }
})

let payment = mongoose.model("payment", paymentSchema);

//  PaymentSchema End



// Client Data Start
let clientSchema = mongoose.Schema({
    ClientId: String,
    ClientName: String,
    ClientPhoneNumber: String,
    ClientAmount: String,
    ClientEmail: String,
    ClientRider: String,
    ClientRiderObjectId: String,
    AssignedBy: String,
    CashierName: String,
    BelongsTo: String,
    "createdOn": { "type": Date, "default": Date.now }
})

let clientdata = mongoose.model("client", clientSchema);


let employSchema = mongoose.Schema({
    employeeName: String,
    employeeEmail: String,
    employeePassword: String,
    createdBy: String,
    Role: String,
    "createdOn": { "type": Date, "default": Date.now }
})

let employee = mongoose.model("employe", employSchema);

// Client Data End



let TransactionSchema = mongoose.Schema({
    Nature: String,
    Instrument: Array,
    PaymentAmount: Array,
    BelongsTo: String,
    From: String,
    to: String,
    "createdOn": { "type": Date, "default": Date.now }
})

let Transaction = mongoose.model('Transaction', TransactionSchema)

module.exports = {

    otpModel: otpModel,
    payment: payment,
    clientdata: clientdata,
    employee: employee,
    Transaction: Transaction
}